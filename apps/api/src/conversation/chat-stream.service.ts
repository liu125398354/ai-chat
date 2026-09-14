/**
 * @file chat-stream.service.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-13
 * @description 流式编排：锁 → 落 user → 千帆 delta → 落 assistant → done/error；客户端断开则 abort 千帆
 */
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES, SSE_EVENTS } from '@ai-chat/shared';
import { Request, Response } from 'express';
import { AppError } from '../common/errors/app-error';
import { loadAppEnv } from '../config/env';
import { bindClientDisconnect } from '../infrastructure/http/client-disconnect';
import { ConversationLockService } from '../infrastructure/lock/conversation-lock.service';
import { QianfanAppError } from '../infrastructure/qianfan/qianfan-error';
import { QianfanAdapter } from '../infrastructure/qianfan/qianfan.adapter';
import { isClientAbortError } from '../infrastructure/qianfan/qianfan-stream-abort';
import { PrismaService } from '../prisma/prisma.service';
import { toQianfanTurns } from './chat-context';
import { ConversationService } from './conversation.service';
import { DEFAULT_CONVERSATION_TITLE, titleFromUserContent } from './conversation-title';

@Injectable()
export class ChatStreamService {
  private readonly logger = new Logger(ChatStreamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationService,
    private readonly lock: ConversationLockService,
    private readonly qianfan: QianfanAdapter,
  ) {}

  /**
   * 同一 conversationId 仅一路生成；鉴权失败不得进入 SSE。
   * 客户端断开 SSE 时 abort 千帆上游，助手按 failed + CLIENT_ABORTED 落库（有增量时）。
   */
  async stream(
    userId: string,
    conversationId: string,
    content: string,
    req: Request,
    res: Response,
    requestId: string,
  ): Promise<void> {
    await this.conversations.assertOwned(userId, conversationId);
    if (!(await this.lock.tryAcquire(conversationId))) {
      throw new AppError(
        ERROR_CODES.CONVERSATION_BUSY,
        '请等待当前回复完成',
        HttpStatus.CONFLICT,
      );
    }

    const disconnect = bindClientDisconnect(req, res);
    let sseStarted = false;
    let assembled = '';
    const startedAt = Date.now();
    let inputChars = 0;
    let outcome: 'done' | 'error' | 'aborted' = 'error';
    try {
      const userMessage = await this.prisma.$transaction(async (tx) => {
        const created = await tx.message.create({
          data: {
            conversationId,
            role: 'user',
            content,
            status: 'completed',
          },
        });
        const conv = await tx.conversation.findUnique({
          where: { id: conversationId },
          select: { title: true },
        });
        const nextTitle =
          conv?.title === DEFAULT_CONVERSATION_TITLE ? titleFromUserContent(content) : undefined;
        await tx.conversation.update({
          where: { id: conversationId },
          data: {
            updatedAt: new Date(),
            ...(nextTitle ? { title: nextTitle } : {}),
          },
        });
        return { created, title: nextTitle || conv?.title || DEFAULT_CONVERSATION_TITLE };
      });

      const env = loadAppEnv();
      const history = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
      });
      const turns = toQianfanTurns(history, env.contextMaxMessages);
      inputChars = turns.reduce((n, turn) => n + turn.content.length, 0);
      const contextTruncated = history.length > env.contextMaxMessages;

      this.writeSseHeaders(res);
      sseStarted = true;
      this.writeEvent(res, SSE_EVENTS.META, {
        conversationId,
        userMessageId: userMessage.created.id,
        title: userMessage.title,
        contextTruncated,
      });

      this.logger.log(
        JSON.stringify({
          op: 'chat_stream_start',
          conversationId,
          requestId,
          model: env.qianfanModel,
          usedTurns: turns.length,
          totalTurns: history.length,
          contextTruncated,
        }),
      );

      for await (const delta of this.qianfan.stream(turns, disconnect.signal)) {
        if (disconnect.signal.aborted || res.writableEnded || res.destroyed) {
          break;
        }
        assembled += delta;
        this.writeEvent(res, SSE_EVENTS.DELTA, { content: delta });
      }

      if (disconnect.signal.aborted || res.destroyed) {
        outcome = 'aborted';
        await this.persistAborted(conversationId, assembled, requestId);
        if (!res.writableEnded && !res.destroyed) {
          res.end();
        }
        return;
      }

      if (!assembled) {
        throw new QianfanAppError(ERROR_CODES.QIANFAN_ERROR, '模型未返回内容，请稍后重试');
      }

      disconnect.markCompleted();

      const assistant = await this.prisma.$transaction(async (tx) => {
        const created = await tx.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: assembled,
            status: 'completed',
          },
        });
        await tx.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
        return created;
      });

      this.writeEvent(res, SSE_EVENTS.DONE, { messageId: assistant.id });
      outcome = 'done';
      res.end();
    } catch (err) {
      if (isClientAbortError(err) || disconnect.signal.aborted) {
        outcome = 'aborted';
        await this.persistAborted(conversationId, assembled, requestId);
        if (!res.writableEnded && !res.destroyed) {
          res.end();
        }
        return;
      }
      const mapped = this.toStreamError(err);
      mapped.partial = assembled;
      this.logger.error(
        JSON.stringify({
          op: 'chat_stream_failed',
          conversationId,
          requestId,
          code: mapped.code,
          error: mapped.message,
        }),
      );
      if (!sseStarted) {
        throw err instanceof AppError
          ? err
          : new AppError(mapped.code, mapped.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      try {
        const failed = await this.prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: mapped.partial || '',
            status: 'failed',
            errorCode: mapped.code,
          },
        });
        void failed;
        this.writeEvent(res, SSE_EVENTS.ERROR, {
          code: mapped.code,
          message: mapped.message,
        });
      } catch (persistErr) {
        this.logger.error(
          JSON.stringify({
            op: 'chat_stream_persist_failed',
            conversationId,
            requestId,
            error: persistErr instanceof Error ? persistErr.message : 'unknown',
          }),
        );
        this.writeEvent(res, SSE_EVENTS.ERROR, {
          code: mapped.code,
          message: mapped.message,
        });
      }
      if (!res.writableEnded) {
        res.end();
      }
    } finally {
      this.logger.log(
        JSON.stringify({
          op: 'chat_stream_metrics',
          conversationId,
          requestId,
          inputChars,
          outputChars: assembled.length,
          durationMs: Date.now() - startedAt,
          outcome,
        }),
      );
      disconnect.dispose();
      await this.lock.release(conversationId);
    }
  }

  /** 断开后不再推 SSE；有增量则落 failed，便于回会话后重试。 */
  private async persistAborted(
    conversationId: string,
    assembled: string,
    requestId: string,
  ): Promise<void> {
    this.logger.log(
      JSON.stringify({
        op: 'chat_stream_aborted',
        conversationId,
        requestId,
        partialLength: assembled.length,
      }),
    );
    if (!assembled) {
      return;
    }
    try {
      await this.prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: assembled,
          status: 'failed',
          errorCode: ERROR_CODES.CLIENT_ABORTED,
        },
      });
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    } catch (persistErr) {
      this.logger.error(
        JSON.stringify({
          op: 'chat_stream_persist_failed',
          conversationId,
          requestId,
          error: persistErr instanceof Error ? persistErr.message : 'unknown',
        }),
      );
    }
  }

  private toStreamError(err: unknown): { code: string; message: string; partial?: string } {
    if (err instanceof QianfanAppError) {
      return { code: err.code, message: err.message };
    }
    if (err instanceof AppError) {
      return { code: err.code, message: err.message };
    }
    return {
      code: ERROR_CODES.QIANFAN_ERROR,
      message: '模型服务暂时不可用',
    };
  }

  private writeSseHeaders(res: Response): void {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
  }

  private writeEvent(res: Response, event: string, data: unknown): void {
    if (res.writableEnded || res.destroyed) {
      return;
    }
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      const flushable = res as Response & { flush?: () => void };
      flushable.flush?.();
    } catch (err) {
      if (res.destroyed || res.writableEnded) {
        return;
      }
      throw err;
    }
  }
}

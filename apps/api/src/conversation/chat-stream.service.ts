/**
 * @file chat-stream.service.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 流式编排骨架：锁 → 落 user → SSE；千帆循环在 M2 补齐
 */
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES, SSE_EVENTS } from '@ai-chat/shared';
import { Response } from 'express';
import { AppError } from '../common/errors/app-error';
import { ConversationLockService } from '../infrastructure/lock/conversation-lock.service';
import { QianfanAdapter } from '../infrastructure/qianfan/qianfan.adapter';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationService } from './conversation.service';

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
   * 校验归属与锁后写入用户消息并打开 SSE。完整千帆 delta 在 M2 实现。
   */
  async stream(
    userId: string,
    conversationId: string,
    content: string,
    res: Response,
    requestId: string,
  ): Promise<void> {
    await this.conversations.assertOwned(userId, conversationId);
    if (!this.lock.tryAcquire(conversationId)) {
      throw new AppError(
        ERROR_CODES.CONVERSATION_BUSY,
        '请等待当前回复完成',
        HttpStatus.CONFLICT,
      );
    }

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
        await tx.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
        return created;
      });

      this.writeSseHeaders(res);
      this.writeEvent(res, SSE_EVENTS.META, {
        conversationId,
        userMessageId: userMessage.id,
      });

      this.logger.log(
        JSON.stringify({ op: 'chat_stream_stub', conversationId, requestId }),
      );

      void this.qianfan;

      this.writeEvent(res, SSE_EVENTS.ERROR, {
        code: ERROR_CODES.NOT_IMPLEMENTED,
        message: '流式对话（千帆）将在 M2 接入',
      });
      res.end();
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          op: 'chat_stream_failed',
          conversationId,
          requestId,
          error: err instanceof Error ? err.message : 'unknown',
        }),
      );
      throw err;
    } finally {
      this.lock.release(conversationId);
    }
  }

  private writeSseHeaders(res: Response): void {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
  }

  private writeEvent(res: Response, event: string, data: unknown): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

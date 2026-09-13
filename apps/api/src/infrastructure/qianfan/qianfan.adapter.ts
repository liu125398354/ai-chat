/**
 * @file qianfan.adapter.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 千帆 ChatCompletion 流式适配：只在此使用官方 SDK
 */
import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from '@ai-chat/shared';
import { loadAppEnv } from '../../config/env';
import { mapQianfanFailure, QianfanAppError } from './qianfan-error';
import type { QianfanTurn } from '../../conversation/chat-context';

type QianfanChunk = {
  result?: string;
  is_end?: boolean;
  need_clear_history?: boolean;
  error_code?: number;
  error_msg?: string;
  choices?: unknown;
};

@Injectable()
export class QianfanAdapter {
  private readonly logger = new Logger(QianfanAdapter.name);

  /**
   * 迭代纯文本增量；空包（仅 usage/安全）跳过。超时与厂商错误映射为 QianfanAppError。
   */
  async *stream(messages: QianfanTurn[]): AsyncGenerator<string> {
    if (messages.length === 0) {
      throw new QianfanAppError(ERROR_CODES.QIANFAN_ERROR, '没有可发送给模型的上下文');
    }

    const env = loadAppEnv();
    const started = Date.now();
    const { ChatCompletion } = await import('@baiducloud/qianfan');
    const client = new ChatCompletion({
      QIANFAN_ACCESS_KEY: env.qianfanAccessKey,
      QIANFAN_SECRET_KEY: env.qianfanSecretKey,
      ENABLE_OAUTH: false,
    });

    try {
      const stream = (await client.chat(
        { messages, stream: true },
        env.qianfanModel,
      )) as AsyncIterable<QianfanChunk>;

      for await (const chunk of stream) {
        if (Date.now() - started > env.qianfanTimeoutMs) {
          throw new QianfanAppError(ERROR_CODES.QIANFAN_TIMEOUT, '生成超时，请稍后重试');
        }
        if (chunk?.error_code || chunk?.error_msg) {
          throw mapQianfanFailure(chunk);
        }
        if (chunk?.need_clear_history) {
          throw new QianfanAppError(
            ERROR_CODES.QIANFAN_CONTENT_FILTER,
            '内容未通过安全审核，请修改后再试',
          );
        }
        const delta = extractDelta(chunk);
        if (delta) {
          yield delta;
        }
      }
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          op: 'qianfan_stream_failed',
          model: env.qianfanModel,
          error: err instanceof Error ? err.message : 'unknown',
        }),
      );
      if (err instanceof QianfanAppError) {
        throw err;
      }
      throw mapQianfanFailure(err);
    }
  }
}

function extractDelta(chunk: QianfanChunk): string {
  if (typeof chunk.result === 'string' && chunk.result.length > 0) {
    return chunk.result;
  }
  const choices = chunk.choices;
  if (Array.isArray(choices) && choices[0]) {
    const delta = (choices[0] as { delta?: { content?: string } }).delta?.content;
    if (typeof delta === 'string' && delta.length > 0) {
      return delta;
    }
  }
  if (choices && typeof choices === 'object' && 'delta' in choices) {
    const content = (choices as { delta?: { content?: string } }).delta?.content;
    if (typeof content === 'string' && content.length > 0) {
      return content;
    }
  }
  return '';
}

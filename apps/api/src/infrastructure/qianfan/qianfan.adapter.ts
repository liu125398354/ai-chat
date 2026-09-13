/**
 * @file qianfan.adapter.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 千帆 Adapter 骨架：SDK 仅在此使用；流式增量在 M2 接完
 */
import { Injectable, Logger } from '@nestjs/common';
import { loadAppEnv } from '../../config/env';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class QianfanAdapter {
  private readonly logger = new Logger(QianfanAdapter.name);

  /**
   * 将产品消息流式转为纯文本 delta。M2 使用 @baiducloud/qianfan ChatCompletion。
   */
  async *stream(_messages: ChatTurn[]): AsyncGenerator<string> {
    const env = loadAppEnv();
    this.logger.log(
      JSON.stringify({
        op: 'qianfan_stream_stub',
        model: env.qianfanModel,
        timeoutMs: env.qianfanTimeoutMs,
      }),
    );
  }
}

/**
 * @file chat-stream.service.spec.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 抢不到会话锁时 JSON 409，不进入 SSE
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ERROR_CODES } from '@ai-chat/shared';
import { Request, Response } from 'express';
import { ChatStreamService } from './chat-stream.service';

describe('ChatStreamService lock', () => {
  it('throws CONVERSATION_BUSY when lock is held', async () => {
    const conversations = {
      assertOwned: async () => ({ id: 'c1' }),
    };
    const lock = {
      tryAcquire: async () => false,
      release: async () => {
        throw new Error('should not release when acquire failed');
      },
    };
    const svc = new ChatStreamService(
      {} as never,
      conversations as never,
      lock as never,
      {} as never,
    );
    await assert.rejects(
      () =>
        svc.stream(
          'u1',
          'c1',
          'hi',
          {} as Request,
          {} as Response,
          'req-1',
        ),
      (err: { code?: string; getStatus?: () => number }) => {
        assert.equal(err.code, ERROR_CODES.CONVERSATION_BUSY);
        assert.equal(err.getStatus?.(), 409);
        return true;
      },
    );
  });
});

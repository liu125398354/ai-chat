/**
 * @file conversation.service.spec.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 会话归属：他人 conversationId 视为 404
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ERROR_CODES } from '@ai-chat/shared';
import { ConversationService } from './conversation.service';

describe('ConversationService.assertOwned', () => {
  it('maps missing ownership to CONVERSATION_NOT_FOUND', async () => {
    const prisma = {
      conversation: {
        findFirst: async () => null,
      },
    };
    const svc = new ConversationService(prisma as never);
    await assert.rejects(
      () => svc.assertOwned('user-a', '00000000-0000-4000-8000-000000000001'),
      (err: { code?: string; getStatus?: () => number }) => {
        assert.equal(err.code, ERROR_CODES.CONVERSATION_NOT_FOUND);
        assert.equal(err.getStatus?.(), 404);
        return true;
      },
    );
  });
});

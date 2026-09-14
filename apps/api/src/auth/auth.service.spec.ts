/**
 * @file auth.service.spec.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 登录失败统一 AUTH_INVALID，不区分用户是否存在
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ERROR_CODES } from '@ai-chat/shared';
import { AuthService } from './auth.service';

describe('AuthService.login', () => {
  it('returns AUTH_INVALID when the user does not exist', async () => {
    const prisma = {
      user: { findUnique: async () => null },
    };
    const passwordCrypto = {
      decrypt: () => 'any-password',
    };
    const svc = new AuthService(
      prisma as never,
      {} as never,
      passwordCrypto as never,
      {} as never,
    );
    await assert.rejects(
      () => svc.login('ghost', 'cipher'),
      (err: { code?: string; getStatus?: () => number }) => {
        assert.equal(err.code, ERROR_CODES.AUTH_INVALID);
        assert.equal(err.getStatus?.(), 401);
        return true;
      },
    );
  });
});

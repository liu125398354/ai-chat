/**
 * @file login-rate-limiter.spec.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 登录限流：同一 IP+用户名超过阈值拒绝
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LoginRateLimiter } from './login-rate-limiter';

describe('LoginRateLimiter', () => {
  it('blocks the N+1st attempt for the same identity', () => {
    const limiter = new LoginRateLimiter({
      windowMs: 60_000,
      maxPerIdentity: 3,
      maxPerIp: 10,
    });
    assert.equal(limiter.allow('1.1.1.1', 'alice'), true);
    assert.equal(limiter.allow('1.1.1.1', 'alice'), true);
    assert.equal(limiter.allow('1.1.1.1', 'alice'), true);
    assert.equal(limiter.allow('1.1.1.1', 'alice'), false);
    assert.equal(limiter.allow('1.1.1.1', 'bob'), true);
  });

  it('blocks by IP even across usernames', () => {
    const limiter = new LoginRateLimiter({
      windowMs: 60_000,
      maxPerIdentity: 10,
      maxPerIp: 2,
    });
    assert.equal(limiter.allow('9.9.9.9', 'a'), true);
    assert.equal(limiter.allow('9.9.9.9', 'b'), true);
    assert.equal(limiter.allow('9.9.9.9', 'c'), false);
  });
});

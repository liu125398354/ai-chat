/**
 * @file memory-conversation-lock.spec.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 内存会话锁：同一 id 不可并发获取
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MemoryConversationLock } from './memory-conversation-lock';

describe('MemoryConversationLock', () => {
  it('rejects a second acquire until release', async () => {
    const lock = new MemoryConversationLock();
    assert.equal(await lock.tryAcquire('a'), true);
    assert.equal(await lock.tryAcquire('a'), false);
    await lock.release('a');
    assert.equal(await lock.tryAcquire('a'), true);
  });
});

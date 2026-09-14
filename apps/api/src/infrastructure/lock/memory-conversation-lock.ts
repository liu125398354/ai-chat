/**
 * @file memory-conversation-lock.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 进程内会话锁；仅单实例满足 409
 */
import { ConversationLock } from './conversation-lock';

export class MemoryConversationLock implements ConversationLock {
  private readonly locks = new Map<string, true>();

  async tryAcquire(conversationId: string): Promise<boolean> {
    if (this.locks.has(conversationId)) {
      return false;
    }
    this.locks.set(conversationId, true);
    return true;
  }

  async release(conversationId: string): Promise<void> {
    this.locks.delete(conversationId);
  }
}

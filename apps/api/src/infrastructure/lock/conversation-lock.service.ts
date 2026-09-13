/**
 * @file conversation-lock.service.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 同一 conversationId 内存锁；抢不到由调用方返回 409
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class ConversationLockService {
  private readonly locks = new Map<string, true>();

  tryAcquire(conversationId: string): boolean {
    if (this.locks.has(conversationId)) {
      return false;
    }
    this.locks.set(conversationId, true);
    return true;
  }

  release(conversationId: string): void {
    this.locks.delete(conversationId);
  }
}

/**
 * @file conversation-lock.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 会话生成锁抽象：单进程内存或 Redis SET NX PX
 */
export interface ConversationLock {
  tryAcquire(conversationId: string): Promise<boolean>;
  release(conversationId: string): Promise<void>;
}

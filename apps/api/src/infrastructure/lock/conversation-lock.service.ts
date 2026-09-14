/**
 * @file conversation-lock.service.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 会话锁门面：有 REDIS_URL 用 Redis SET NX PX，否则内存 Map
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { loadAppEnv } from '../../config/env';
import { ConversationLock } from './conversation-lock';
import { MemoryConversationLock } from './memory-conversation-lock';
import { RedisConversationLock } from './redis-conversation-lock';

@Injectable()
export class ConversationLockService implements ConversationLock, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConversationLockService.name);
  private impl: ConversationLock = new MemoryConversationLock();
  private redis: RedisConversationLock | null = null;

  async onModuleInit(): Promise<void> {
    const env = loadAppEnv();
    if (!env.redisUrl) {
      this.logger.log(JSON.stringify({ op: 'conversation_lock', backend: 'memory' }));
      return;
    }
    const ttlMs = Math.max(env.qianfanTimeoutMs + 5000, 10000);
    const redis = new RedisConversationLock(env.redisUrl, ttlMs);
    await redis.connect();
    this.redis = redis;
    this.impl = redis;
    this.logger.log(JSON.stringify({ op: 'conversation_lock', backend: 'redis', ttlMs }));
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.disconnect();
  }

  tryAcquire(conversationId: string): Promise<boolean> {
    return this.impl.tryAcquire(conversationId);
  }

  release(conversationId: string): Promise<void> {
    return this.impl.release(conversationId);
  }
}

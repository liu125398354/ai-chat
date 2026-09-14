/**
 * @file redis-conversation-lock.ts
 * @author liunannan
 * @date 2026-09-14
 * @description Redis SET NX PX 会话锁；多实例防双流
 */
import { createClient, RedisClientType } from 'redis';
import { ConversationLock } from './conversation-lock';

const RELEASE_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

export class RedisConversationLock implements ConversationLock {
  private readonly tokens = new Map<string, string>();
  private client: RedisClientType | null = null;

  constructor(
    private readonly url: string,
    private readonly ttlMs: number,
  ) {}

  async connect(): Promise<void> {
    const client: RedisClientType = createClient({ url: this.url });
    await client.connect();
    this.client = client;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  async tryAcquire(conversationId: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    const token = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ok = await this.client.set(this.key(conversationId), token, {
      NX: true,
      PX: this.ttlMs,
    });
    if (ok !== 'OK') {
      return false;
    }
    this.tokens.set(conversationId, token);
    return true;
  }

  async release(conversationId: string): Promise<void> {
    const token = this.tokens.get(conversationId);
    this.tokens.delete(conversationId);
    if (!this.client || !token) {
      return;
    }
    await this.client.eval(RELEASE_LUA, {
      keys: [this.key(conversationId)],
      arguments: [token],
    });
  }

  private key(conversationId: string): string {
    return `ai-chat:conv-lock:${conversationId}`;
  }
}

/**
 * @file login-rate-limiter.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 登录/注册滑动窗口限流：IP + username；进程内计数
 */

export type LoginRateLimitOptions = {
  windowMs: number;
  maxPerIdentity: number;
  maxPerIp: number;
};

/**
 * 单实例内存限流。多实例需在网关再限一次；本类不连 Redis。
 */
export class LoginRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly opts: LoginRateLimitOptions) {}

  /** 允许则记一次命中；超限返回 false 且不增加计数。 */
  allow(ip: string, username: string): boolean {
    const now = Date.now();
    const ipKey = `ip:${ip || 'unknown'}`;
    const idKey = `id:${ip || 'unknown'}:${(username || '').trim().toLowerCase()}`;
    if (!this.underLimit(ipKey, now, this.opts.maxPerIp)) {
      return false;
    }
    if (!this.underLimit(idKey, now, this.opts.maxPerIdentity)) {
      return false;
    }
    this.record(ipKey, now);
    this.record(idKey, now);
    return true;
  }

  private underLimit(key: string, now: number, max: number): boolean {
    const next = this.prune(key, now);
    return next.length < max;
  }

  private record(key: string, now: number): void {
    const next = this.prune(key, now);
    next.push(now);
    this.hits.set(key, next);
  }

  private prune(key: string, now: number): number[] {
    const windowStart = now - this.opts.windowMs;
    const kept = (this.hits.get(key) || []).filter((ts) => ts > windowStart);
    if (kept.length === 0) {
      this.hits.delete(key);
    } else {
      this.hits.set(key, kept);
    }
    return kept;
  }
}

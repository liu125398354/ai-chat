/**
 * @file request-context.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 从请求读取 requestId（X-Request-Id 或已注入值）
 */
import { Request } from 'express';

export function getRequestId(req: Request): string {
  const existing = req.headers['x-request-id'];
  if (typeof existing === 'string' && existing.trim()) {
    return existing.trim();
  }
  return (req as Request & { requestId?: string }).requestId || '';
}

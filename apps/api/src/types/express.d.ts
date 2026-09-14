/**
 * @file express.d.ts
 * @author liunannan
 * @date 2026-09-13
 * @description Express Request 扩展：requestId 与 JWT 用户
 */
declare namespace Express {
  interface Request {
    requestId?: string;
    user?: { userId: string; jti?: string; exp?: number };
  }
}

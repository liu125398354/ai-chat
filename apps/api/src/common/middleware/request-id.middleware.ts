/**
 * @file request-id.middleware.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 注入 requestId 到请求与响应头，供日志与错误体使用
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers['x-request-id'];
    const requestId =
      typeof header === 'string' && header.trim() ? header.trim() : randomUUID();
    (req as Request & { requestId: string }).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}

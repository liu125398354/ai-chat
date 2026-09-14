/**
 * @file access-log.middleware.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 访问日志：method/path/status/requestId/耗时；不记录 body 与 Token
 */
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { getRequestId } from '../request-context';

@Injectable()
export class AccessLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger('http');

  use(req: Request, res: Response, next: NextFunction): void {
    const started = Date.now();
    res.on('finish', () => {
      this.logger.log(
        JSON.stringify({
          op: 'http',
          method: req.method,
          path: req.path,
          status: res.statusCode,
          requestId: getRequestId(req) || 'unknown',
          durationMs: Date.now() - started,
        }),
      );
    });
    next();
  }
}

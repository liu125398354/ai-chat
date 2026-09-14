/**
 * @file login-rate-limit.middleware.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 登录与注册入口限流；超限 429 AUTH_RATE_LIMITED
 */
import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { ERROR_CODES } from '@ai-chat/shared';
import { NextFunction, Request, Response } from 'express';
import { getRequestId } from '../common/request-context';
import { loadAppEnv } from '../config/env';
import { LoginRateLimiter } from './login-rate-limiter';

@Injectable()
export class LoginRateLimitMiddleware implements NestMiddleware {
  private readonly limiter: LoginRateLimiter;

  constructor() {
    const env = loadAppEnv();
    this.limiter = new LoginRateLimiter({
      windowMs: env.loginRateWindowMs,
      maxPerIdentity: env.loginRateMaxPerIdentity,
      maxPerIp: env.loginRateMaxPerIp,
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const ip = clientIp(req);
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    if (this.limiter.allow(ip, username)) {
      next();
      return;
    }
    const requestId = getRequestId(req) || 'unknown';
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      code: ERROR_CODES.AUTH_RATE_LIMITED,
      message: '尝试过于频繁，请稍后再试',
      requestId,
    });
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

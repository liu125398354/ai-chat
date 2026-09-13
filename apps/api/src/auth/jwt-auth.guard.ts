/**
 * @file jwt-auth.guard.ts
 * @author liunannan
 * @date 2026-09-13
 * @description Bearer 鉴权；过期映射 AUTH_EXPIRED，其余 AUTH_REQUIRED
 */
import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ERROR_CODES } from '@ai-chat/shared';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from '../common/errors/app-error';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser, info: unknown): TUser {
    if (info instanceof TokenExpiredError) {
      throw new AppError(ERROR_CODES.AUTH_EXPIRED, '登录已过期，请重新登录', HttpStatus.FORBIDDEN);
    }
    if (err || !user) {
      const message =
        info instanceof JsonWebTokenError ? '登录凭证无效' : '请先登录';
      throw new AppError(ERROR_CODES.AUTH_REQUIRED, message, HttpStatus.UNAUTHORIZED);
    }
    return user;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

/**
 * @file jwt.strategy.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description JWT 策略：身份仅取 payload.sub；已注销 jti 拒绝
 */
import { HttpStatus, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ERROR_CODES } from '@ai-chat/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppError } from '../common/errors/app-error';
import { loadAppEnv } from '../config/env';
import { RevokedJwtService } from './revoked-jwt.service';

type JwtPayload = { sub: string; jti?: string; exp?: number };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly revoked: RevokedJwtService) {
    const env = loadAppEnv();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<{ userId: string; jti?: string; exp?: number }> {
    if (payload.jti && (await this.revoked.isRevoked(payload.jti))) {
      throw new AppError(ERROR_CODES.AUTH_REQUIRED, '请先登录', HttpStatus.UNAUTHORIZED);
    }
    return { userId: payload.sub, jti: payload.jti, exp: payload.exp };
  }
}

/**
 * @file jwt.strategy.ts
 * @author liunannan
 * @date 2026-09-13
 * @description JWT 策略：身份仅取 payload.sub
 */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { loadAppEnv } from '../config/env';

type JwtPayload = { sub: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const env = loadAppEnv();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.jwtSecret,
    });
  }

  validate(payload: JwtPayload): { userId: string } {
    return { userId: payload.sub };
  }
}

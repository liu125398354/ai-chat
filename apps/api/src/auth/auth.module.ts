/**
 * @file auth.module.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 认证模块：JWT 2h + jti 黑名单
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { loadAppEnv } from '../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PasswordCryptoService } from './password-crypto.service';
import { RevokedJwtService } from './revoked-jwt.service';

const env = loadAppEnv();

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: env.jwtSecret,
      signOptions: { expiresIn: env.jwtExpiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PasswordCryptoService, RevokedJwtService],
  exports: [AuthService],
})
export class AuthModule {}

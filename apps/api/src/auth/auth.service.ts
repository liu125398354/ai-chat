/**
 * @file auth.service.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 登录、注册、改密与退出作废 Token：先 RSA 解密再 bcrypt；JWT sub=userId + jti
 */
import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@ai-chat/shared';
import * as bcrypt from 'bcryptjs';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordCryptoService } from './password-crypto.service';
import { RevokedJwtService } from './revoked-jwt.service';

export type PublicUser = {
  id: string;
  username: string;
  createdAt: Date;
};

const NEW_PASSWORD_MIN = 8;
const NEW_PASSWORD_MAX = 128;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwordCrypto: PasswordCryptoService,
    private readonly revokedJwt: RevokedJwtService,
  ) {}

  getPublicKey(): { publicKey: string } {
    return { publicKey: this.passwordCrypto.getPublicKey() };
  }

  /** 用户名或密码错误一律 AUTH_INVALID，不区分是否存在。 */
  async login(username: string, passwordCipher: string): Promise<{ token: string; user: PublicUser }> {
    const password = this.passwordCrypto.decrypt(passwordCipher);
    const user = await this.prisma.user.findUnique({ where: { username } });
    const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !ok) {
      this.logger.warn(JSON.stringify({ op: 'login_failed', username }));
      throw new AppError(ERROR_CODES.AUTH_INVALID, '用户名或密码错误', HttpStatus.UNAUTHORIZED);
    }
    return this.issueSession(user);
  }

  /**
   * 自助开户并签发 JWT。用户名冲突统一 AUTH_USERNAME_TAKEN，不把密码写入日志。
   */
  async register(
    username: string,
    passwordCipher: string,
  ): Promise<{ token: string; user: PublicUser }> {
    const password = this.passwordCrypto.decrypt(passwordCipher);
    this.assertPasswordLength(password, '密码');
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const user = await this.prisma.user.create({
        data: { username, passwordHash },
      });
      this.logger.log(JSON.stringify({ op: 'register_ok', userId: user.id }));
      return this.issueSession(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        this.logger.warn(JSON.stringify({ op: 'register_username_taken', username }));
        throw new AppError(
          ERROR_CODES.AUTH_USERNAME_TAKEN,
          '用户名已被使用',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw err;
    }
  }

  /**
   * 校验原密码后更新哈希。错误原密码返回 400，避免前端把 401 当成掉登录。
   */
  async changePassword(userId: string, oldCipher: string, newCipher: string): Promise<{ ok: true }> {
    const oldPassword = this.passwordCrypto.decrypt(oldCipher);
    const newPassword = this.passwordCrypto.decrypt(newCipher);
    this.assertPasswordLength(newPassword, '新密码');
    if (oldPassword === newPassword) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        '新密码不能与原密码相同',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(ERROR_CODES.AUTH_REQUIRED, '请先登录', HttpStatus.UNAUTHORIZED);
    }
    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) {
      this.logger.warn(JSON.stringify({ op: 'change_password_mismatch', userId }));
      throw new AppError(
        ERROR_CODES.AUTH_PASSWORD_MISMATCH,
        '原密码不正确',
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    this.logger.log(JSON.stringify({ op: 'change_password_ok', userId }));
    return { ok: true };
  }

  /** 将当前 Access Token 的 jti 列入黑名单至 exp。无 jti 的旧票跳过。 */
  async logout(jti: string | undefined, expiresAt: Date | undefined): Promise<void> {
    if (!jti || !expiresAt) {
      return;
    }
    await this.revokedJwt.revoke(jti, expiresAt);
  }

  private async issueSession(user: {
    id: string;
    username: string;
    createdAt: Date;
  }): Promise<{ token: string; user: PublicUser }> {
    const jti = randomUUID();
    const token = await this.jwt.signAsync({ sub: user.id, jti });
    return {
      token,
      user: { id: user.id, username: user.username, createdAt: user.createdAt },
    };
  }

  private assertPasswordLength(plain: string, label: string): void {
    if (plain.length < NEW_PASSWORD_MIN || plain.length > NEW_PASSWORD_MAX) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `${label}长度须为 ${NEW_PASSWORD_MIN}–${NEW_PASSWORD_MAX} 个字符`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

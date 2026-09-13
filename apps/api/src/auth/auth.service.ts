/**
 * @file auth.service.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 登录与改密：先 RSA 解密再 bcrypt；JWT sub=userId
 */
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES } from '@ai-chat/shared';
import * as bcrypt from 'bcryptjs';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordCryptoService } from './password-crypto.service';

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
    const token = await this.jwt.signAsync({ sub: user.id });
    return {
      token,
      user: { id: user.id, username: user.username, createdAt: user.createdAt },
    };
  }

  /**
   * 校验原密码后更新哈希。错误原密码返回 400，避免前端把 401 当成掉登录。
   */
  async changePassword(userId: string, oldCipher: string, newCipher: string): Promise<{ ok: true }> {
    const oldPassword = this.passwordCrypto.decrypt(oldCipher);
    const newPassword = this.passwordCrypto.decrypt(newCipher);
    this.assertNewPassword(newPassword);
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

  private assertNewPassword(plain: string): void {
    if (plain.length < NEW_PASSWORD_MIN || plain.length > NEW_PASSWORD_MAX) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `新密码长度须为 ${NEW_PASSWORD_MIN}–${NEW_PASSWORD_MAX} 个字符`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

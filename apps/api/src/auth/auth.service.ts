/**
 * @file auth.service.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 登录：bcrypt 比对后签发 JWT（sub=userId，2h）
 */
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES } from '@ai-chat/shared';
import * as bcrypt from 'bcryptjs';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';

export type PublicUser = {
  id: string;
  username: string;
  createdAt: Date;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** 用户名或密码错误一律 AUTH_INVALID，不区分是否存在。 */
  async login(username: string, password: string): Promise<{ token: string; user: PublicUser }> {
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
}

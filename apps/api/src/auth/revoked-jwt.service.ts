/**
 * @file revoked-jwt.service.ts
 * @author liunannan
 * @date 2026-09-14
 * @description JWT jti 黑名单：logout 写入至 exp，校验时拒绝
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RevokedJwtService {
  private readonly logger = new Logger(RevokedJwtService.name);

  constructor(private readonly prisma: PrismaService) {}

  async revoke(jti: string, expiresAt: Date): Promise<void> {
    await this.prisma.revokedJwt.upsert({
      where: { jti },
      create: { jti, expiresAt },
      update: { expiresAt },
    });
    await this.prisma.revokedJwt.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    this.logger.log(JSON.stringify({ op: 'jwt_revoked' }));
  }

  async isRevoked(jti: string): Promise<boolean> {
    const row = await this.prisma.revokedJwt.findUnique({
      where: { jti },
      select: { expiresAt: true },
    });
    if (!row) {
      return false;
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      await this.prisma.revokedJwt.delete({ where: { jti } }).catch(() => undefined);
      return false;
    }
    return true;
  }
}

/**
 * @file seed.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 本地演示账号（仅开发；密码哈希写入，不明文日志）
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const username = 'demo';
  const passwordHash = await bcrypt.hash('Demo@12345', 12);
  await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash },
  });
}

main()
  .catch((err: unknown) => {
    console.error('prisma seed failed', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

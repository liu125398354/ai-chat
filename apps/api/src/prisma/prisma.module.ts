/**
 * @file prisma.module.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 全局 Prisma 模块
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

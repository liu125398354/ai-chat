/**
 * @file health.controller.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 探活与就绪：live 只看进程，ready 探 PostgreSQL
 */
import { Controller, Get, HttpStatus, Logger, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';

@Controller()
@ApiTags('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '服务信息', description: '指向 Web 工作台与 OpenAPI 文档' })
  root() {
    return {
      name: 'ai-chat-api',
      ok: true,
      docs: '/docs',
      live: '/health/live',
      ready: '/health/ready',
      hint: 'Web 工作台请访问 Vite 开发地址（默认 http://localhost:8080）；接口文档 /docs',
    };
  }

  @Get('health')
  @ApiOperation({ summary: '探活（兼容旧路径，等同 /health/live）' })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  health() {
    return { ok: true };
  }

  @Get('health/live')
  @ApiOperation({ summary: '进程存活，不连库' })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  live() {
    return { ok: true };
  }

  /**
   * 编排就绪探针：SELECT 1 失败则 503，避免库挂了仍进流量。
   */
  @Get('health/ready')
  @ApiOperation({ summary: '就绪：PostgreSQL SELECT 1' })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  @ApiServiceUnavailableResponse({ schema: { example: { ok: false } } })
  async ready(@Res({ passthrough: true }) res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          op: 'health_ready_failed',
          error: err instanceof Error ? err.message : 'unknown',
        }),
      );
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { ok: false };
    }
  }
}

/**
 * @file health.controller.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-13
 * @description 探活：浏览器打开 API 根路径时返回服务信息，不是前端页面
 */
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '服务信息', description: '指向 Web 工作台与 OpenAPI 文档' })
  root() {
    return {
      name: 'ai-chat-api',
      ok: true,
      docs: '/docs',
      hint: 'Web 工作台请访问 Vite 开发地址（默认 http://localhost:8080）；接口文档 /docs',
    };
  }

  @Get('health')
  @ApiOperation({ summary: '探活' })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  health() {
    return { ok: true };
  }
}

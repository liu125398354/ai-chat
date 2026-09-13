/**
 * @file health.controller.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 探活：浏览器打开 API 根路径时返回服务信息，不是前端页面
 */
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root() {
    return {
      name: 'ai-chat-api',
      ok: true,
      hint: 'Web 工作台请访问 Vite 开发地址（默认 http://localhost:8080），API 前缀为 /v1',
    };
  }

  @Get('health')
  health() {
    return { ok: true };
  }
}

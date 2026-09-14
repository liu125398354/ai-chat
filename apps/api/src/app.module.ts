/**
 * @file app.module.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 根模块：中间件、认证与会话
 */
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { LoginRateLimitMiddleware } from './auth/login-rate-limit.middleware';
import { AccessLogMiddleware } from './common/middleware/access-log.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ConversationModule } from './conversation/conversation.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, ConversationModule],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, AccessLogMiddleware).forRoutes('*');
    consumer.apply(LoginRateLimitMiddleware).forRoutes(
      { path: 'v1/auth/login', method: RequestMethod.POST },
      { path: 'v1/auth/register', method: RequestMethod.POST },
    );
  }
}

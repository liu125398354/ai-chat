/**
 * @file main.ts
 * @author liunannan
 * @date 2026-09-13
 * @description API 入口：校验环境、全局校验与错误映射、监听 3000
 */
import './config/load-dotenv';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { loadAppEnv } from './config/env';

async function bootstrap(): Promise<void> {
  const env = loadAppEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableCors({ origin: env.corsOrigin, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(env.port);
  Logger.log(`API listening on ${env.port}`, 'Bootstrap');
}

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  Logger.error(message, 'Bootstrap');
  process.exit(1);
});

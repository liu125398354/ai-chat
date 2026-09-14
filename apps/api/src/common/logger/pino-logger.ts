/**
 * @file pino-logger.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 结构化日志工厂；禁止记录密码、JWT、千帆 AK/SK
 */
import pino, { Logger } from 'pino';

export function createAppLogger(): Logger {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: [
        'password',
        'oldPassword',
        'newPassword',
        'token',
        'authorization',
        '*.authorization',
        'content',
        '*.content',
        'JWT_SECRET',
        'QIANFAN_ACCESS_KEY',
        'QIANFAN_SECRET_KEY',
      ],
      remove: true,
    },
  });
}

/**
 * @file http-exception.filter.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 统一 JSON 错误体；生产不回堆栈；登录失败保持 AUTH_INVALID
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { TokenExpiredError } from 'jsonwebtoken';
import { Request, Response } from 'express';
import { ERROR_CODES } from '@ai-chat/shared';
import { AppError } from '../errors/app-error';
import { getRequestId } from '../request-context';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = getRequestId(req) || 'unknown';

    if (exception instanceof TokenExpiredError) {
      res.status(HttpStatus.FORBIDDEN).json({
        code: ERROR_CODES.AUTH_EXPIRED,
        message: '登录已过期，请重新登录',
        requestId,
      });
      return;
    }

    if (exception instanceof AppError) {
      const body = exception.getResponse() as { code: string; message: string };
      res.status(exception.getStatus()).json({
        code: body.code,
        message: body.message,
        requestId,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      if (status === HttpStatus.UNAUTHORIZED) {
        res.status(status).json({
          code: ERROR_CODES.AUTH_REQUIRED,
          message: '请先登录',
          requestId,
        });
        return;
      }
      if (status === HttpStatus.BAD_REQUEST) {
        res.status(status).json({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: this.validationMessage(raw),
          requestId,
        });
        return;
      }
      const message =
        typeof raw === 'string'
          ? raw
          : (raw as { message?: string | string[] }).message;
      res.status(status).json({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: Array.isArray(message) ? message.join('; ') : message || '请求失败',
        requestId,
      });
      return;
    }

    this.logger.error(
      JSON.stringify({
        op: 'unhandled',
        requestId,
        path: req.path,
        error: exception instanceof Error ? exception.message : 'unknown',
      }),
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '服务暂时不可用',
      requestId,
    });
  }

  private validationMessage(raw: string | object): string {
    if (typeof raw === 'string') {
      return raw;
    }
    const message = (raw as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return message.join('; ');
    }
    return message || '参数校验失败';
  }
}

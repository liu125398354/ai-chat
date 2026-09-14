/**
 * @file api-error.decorator.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 统一错误体注解，避免每个接口重复写 { code, message, requestId }
 */
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorBodyDto } from './openapi.schemas';

const STATUS_HINT: Record<number, string> = {
  400: 'VALIDATION_ERROR 等参数错误',
  401: 'AUTH_REQUIRED / AUTH_INVALID',
  403: 'AUTH_EXPIRED',
  404: 'CONVERSATION_NOT_FOUND（含无归属）',
  409: 'CONVERSATION_BUSY',
  429: 'AUTH_RATE_LIMITED',
  500: 'INTERNAL_ERROR',
};

/** 按 HTTP 状态挂上统一错误 JSON 示例。 */
export function ApiErrorResponses(...statuses: number[]) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: STATUS_HINT[status] || '错误',
        type: ErrorBodyDto,
      }),
    ),
  );
}

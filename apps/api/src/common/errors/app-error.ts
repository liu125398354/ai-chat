/**
 * @file app-error.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 应用错误：映射为 { code, message, requestId }
 */
import { HttpException, HttpStatus } from '@nestjs/common';

export class AppError extends HttpException {
  readonly code: string;

  constructor(code: string, message: string, status: HttpStatus) {
    super({ code, message }, status);
    this.code = code;
  }
}

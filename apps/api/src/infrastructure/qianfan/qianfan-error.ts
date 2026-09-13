/**
 * @file qianfan-error.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-13
 * @description 千帆错误映射为产品 QIANFAN_* / CLIENT_ABORTED 码；message 不含 AK/SK
 */
import { ERROR_CODES } from '@ai-chat/shared';

export class QianfanAppError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const SECRET_RE = /(QIANFAN_)?(ACCESS|SECRET)_KEY[=:]\s*\S+/gi;

/** 去掉凭证与过长内部描述。 */
export function sanitizeVendorMessage(raw: string): string {
  const cleaned = raw.replace(SECRET_RE, '').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 180);
}

/**
 * 将 SDK / HTTP 异常映射为产品错误。不把原始堆栈回给浏览器。
 */
export function mapQianfanFailure(err: unknown): QianfanAppError {
  const text = extractText(err).toLowerCase();
  const codeNum = extractErrorCode(err);

  if (isClientAbort(text, err)) {
    return new QianfanAppError(ERROR_CODES.CLIENT_ABORTED, '客户端已断开');
  }
  if (isTimeout(text, err)) {
    return new QianfanAppError(ERROR_CODES.QIANFAN_TIMEOUT, '生成超时，请稍后重试');
  }
  if (isRateLimit(text, codeNum)) {
    return new QianfanAppError(ERROR_CODES.QIANFAN_RATE_LIMIT, '模型调用过于频繁，请稍后重试');
  }
  if (isContentFilter(text, codeNum)) {
    return new QianfanAppError(
      ERROR_CODES.QIANFAN_CONTENT_FILTER,
      '内容未通过安全审核，请修改后再试',
    );
  }
  const fallback = sanitizeVendorMessage(extractText(err)) || '模型服务暂时不可用';
  return new QianfanAppError(ERROR_CODES.QIANFAN_ERROR, fallback);
}

function extractText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const rec = err as { error_msg?: string; message?: string };
    return rec.error_msg || rec.message || JSON.stringify(err);
  }
  return '';
}

function extractErrorCode(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'error_code' in err) {
    const value = (err as { error_code: unknown }).error_code;
    return typeof value === 'number' ? value : Number(value);
  }
  return undefined;
}

function isClientAbort(text: string, err: unknown): boolean {
  if (err instanceof QianfanAppError && err.code === ERROR_CODES.CLIENT_ABORTED) {
    return true;
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return true;
  }
  return /request was aborted/.test(text);
}

function isTimeout(text: string, err: unknown): boolean {
  if (err instanceof QianfanAppError && err.code === ERROR_CODES.QIANFAN_TIMEOUT) {
    return true;
  }
  return /timeout|timed out|etimedout|超时/.test(text);
}

function isRateLimit(text: string, codeNum?: number): boolean {
  if (codeNum === 17 || codeNum === 18 || codeNum === 19 || codeNum === 336501) {
    return true;
  }
  return /rate limit|too many requests|qps|rpm|限流|频繁/.test(text);
}

function isContentFilter(text: string, codeNum?: number): boolean {
  if (
    codeNum === 336003 ||
    codeNum === 336004 ||
    codeNum === 336005 ||
    codeNum === 336007
  ) {
    return true;
  }
  return /content.?filter|unsafe|need_clear_history|审核|敏感/.test(text);
}

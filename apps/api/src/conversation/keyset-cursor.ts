/**
 * @file keyset-cursor.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 会话/消息 keyset 游标：时间 + id，禁止 OFFSET
 */
import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@ai-chat/shared';
import { AppError } from '../common/errors/app-error';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type KeysetCursor = { t: Date; id: string };

const PAGE_MAX = 100;
export const CONVERSATION_PAGE_DEFAULT = 50;
export const MESSAGE_PAGE_DEFAULT = 50;

export function clampPageLimit(raw: number | undefined, fallback: number): number {
  if (raw == null || Number.isNaN(raw)) {
    return fallback;
  }
  return Math.min(PAGE_MAX, Math.max(1, Math.floor(raw)));
}

export function encodeCursor(t: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: t.toISOString(), id }), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): KeysetCursor {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      t?: unknown;
      id?: unknown;
    };
    if (typeof parsed.t !== 'string' || typeof parsed.id !== 'string' || !UUID_RE.test(parsed.id)) {
      throw new Error('shape');
    }
    const t = new Date(parsed.t);
    if (Number.isNaN(t.getTime())) {
      throw new Error('date');
    }
    return { t, id: parsed.id };
  } catch {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, '分页游标无效', HttpStatus.BAD_REQUEST);
  }
}

/** 去掉 ILIKE 通配符，避免用户输入 %/_ 变成全表匹配。 */
export function sanitizeTitleQuery(raw: string): string {
  return raw.replace(/[%_\\]/g, '').trim();
}

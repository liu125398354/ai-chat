/**
 * @file axios-error.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 从 axios / Error 取出用户可见 message
 */
import axios from 'axios';
import type { ApiErrorBody } from '@/types/models';

export function errorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    return err.response?.data?.message || err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message || fallback;
  }
  return fallback;
}

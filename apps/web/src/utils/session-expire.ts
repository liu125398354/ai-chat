/**
 * @file session-expire.ts
 * @author liunannan
 * @date 2026-09-14
 * @description AUTH_EXPIRED / AUTH_REQUIRED 时清 session 并回登录
 */
import { ERROR_CODES } from '@ai-chat/shared';

const AUTH_SESSION_CODES = new Set<string>([ERROR_CODES.AUTH_EXPIRED, ERROR_CODES.AUTH_REQUIRED]);

export function isAuthSessionCode(code?: string) {
  return Boolean(code && AUTH_SESSION_CODES.has(code));
}

/** 清 Token 并跳转登录；登录/注册接口本身的 401 不要走这里。 */
export async function expireClientSession(redirectPath?: string) {
  const { useAuthStore } = await import('@/stores/auth');
  useAuthStore().clearSession();
  const { default: router } = await import('@/router');
  if (router.currentRoute.value.name === 'login') {
    return;
  }
  await router.push({
    name: 'login',
    query: { redirect: redirectPath || router.currentRoute.value.fullPath },
  });
}

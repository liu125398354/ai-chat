/**
 * @file http.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description axios JSON 客户端；AUTH_EXPIRED / AUTH_REQUIRED 清 Token 并跳转登录
 */
import axios from 'axios';
import { ERROR_CODES } from '@ai-chat/shared';
import { useAuthStore } from '@/stores/auth';
import { expireClientSession, isAuthSessionCode } from '@/utils/session-expire';

export const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const url = String(error.config?.url || '');
    if (url.includes('/v1/auth/login') || url.includes('/v1/auth/register')) {
      return Promise.reject(error);
    }
    if (status === 401 || status === 403 || isAuthSessionCode(code)) {
      if (code === ERROR_CODES.AUTH_INVALID) {
        return Promise.reject(error);
      }
      await expireClientSession();
    }
    return Promise.reject(error);
  },
);

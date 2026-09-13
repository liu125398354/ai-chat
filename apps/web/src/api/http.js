/**
 * @file http.js
 * @author liunannan
 * @date 2026-09-13
 * @description axios JSON 客户端；401/403 清 Token 并跳转登录
 */
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

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
    if (status === 401 || status === 403) {
      const url = String(error.config?.url || '');
      if (url.includes('/v1/auth/login')) {
        return Promise.reject(error);
      }
      const auth = useAuthStore();
      auth.clearSession();
      const { default: router } = await import('@/router');
      if (router.currentRoute.value.name !== 'login') {
        router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
      }
    }
    return Promise.reject(error);
  },
);

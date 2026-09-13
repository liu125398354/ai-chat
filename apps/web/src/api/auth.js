/**
 * @file auth.js
 * @author liunannan
 * @date 2026-09-13
 * @description 登录 API
 */
import { http } from './http';

export function login(payload) {
  return http.post('/v1/auth/login', payload).then((res) => res.data);
}

export function logout() {
  return http.post('/v1/auth/logout').catch(() => undefined);
}

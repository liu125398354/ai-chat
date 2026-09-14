/**
 * @file auth.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 登录、注册、公钥与改密 API；密码字段须为 RSA 密文
 */
import { http } from './http';

export function getPublicKey() {
  return http.get('/v1/auth/public-key').then((res) => res.data.publicKey);
}

export function login(payload) {
  return http.post('/v1/auth/login', payload).then((res) => res.data);
}

export function register(payload) {
  return http.post('/v1/auth/register', payload).then((res) => res.data);
}

export function changePassword(payload) {
  return http.post('/v1/auth/password', payload).then((res) => res.data);
}

export function logout() {
  return http.post('/v1/auth/logout').catch(() => undefined);
}

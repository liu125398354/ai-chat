/**
 * @file auth.js
 * @author liunannan
 * @date 2026-09-13
 * @description 登录态：Token 仅存 sessionStorage；提交前加密密码
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import * as authApi from '@/api/auth';
import { encryptPassword } from '@/utils/password-crypto';

const TOKEN_KEY = 'ai-chat-token';
const USER_KEY = 'ai-chat-user';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(sessionStorage.getItem(TOKEN_KEY) || '');
  const user = ref(readUser());

  const isAuthenticated = computed(() => Boolean(token.value));

  function persist(nextToken, nextUser) {
    token.value = nextToken;
    user.value = nextUser;
    sessionStorage.setItem(TOKEN_KEY, nextToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function clearSession() {
    token.value = '';
    user.value = null;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  /** 拉取公钥后加密明文再登录。 */
  async function login(username, password) {
    const publicKey = await authApi.getPublicKey();
    const cipher = await encryptPassword(password, publicKey);
    const data = await authApi.login({ username, password: cipher });
    persist(data.token, data.user);
    return data.user;
  }

  /** 新旧密码均加密后提交。 */
  async function changePassword(oldPassword, newPassword) {
    const publicKey = await authApi.getPublicKey();
    const [oldCipher, newCipher] = await Promise.all([
      encryptPassword(oldPassword, publicKey),
      encryptPassword(newPassword, publicKey),
    ]);
    await authApi.changePassword({ oldPassword: oldCipher, newPassword: newCipher });
  }

  async function logout() {
    await authApi.logout();
    clearSession();
  }

  return { token, user, isAuthenticated, login, logout, changePassword, clearSession };
});

function readUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * @file auth.js
 * @author liunannan
 * @date 2026-09-13
 * @description 登录态：Token 仅存 sessionStorage
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import * as authApi from '@/api/auth';

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

  async function login(username, password) {
    const data = await authApi.login({ username, password });
    persist(data.token, data.user);
    return data.user;
  }

  async function logout() {
    await authApi.logout();
    clearSession();
  }

  return { token, user, isAuthenticated, login, logout, clearSession };
});

function readUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

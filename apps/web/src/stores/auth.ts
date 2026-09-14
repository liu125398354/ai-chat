/**
 * @file auth.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 登录态：Token 仅存 sessionStorage；提交前加密密码
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import * as authApi from '@/api/auth';
import { useChatStore } from '@/stores/chat';
import { useConversationsStore } from '@/stores/conversations';
import type { AuthUser } from '@/types/models';
import { encryptPassword } from '@/utils/password-crypto';

const TOKEN_KEY = 'ai-chat-token';
const USER_KEY = 'ai-chat-user';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(sessionStorage.getItem(TOKEN_KEY) || '');
  const user = ref<AuthUser | null>(readUser());

  const isAuthenticated = computed(() => Boolean(token.value));

  function persist(nextToken: string, nextUser: AuthUser) {
    token.value = nextToken;
    user.value = nextUser;
    sessionStorage.setItem(TOKEN_KEY, nextToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function resetWorkspace() {
    useChatStore().clear();
    useConversationsStore().reset();
  }

  function clearSession() {
    token.value = '';
    user.value = null;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    resetWorkspace();
  }

  /** 拉取公钥后加密明文再登录。 */
  async function login(username: string, password: string) {
    const publicKey = await authApi.getPublicKey();
    const cipher = await encryptPassword(password, publicKey);
    const data = await authApi.login({ username, password: cipher });
    resetWorkspace();
    persist(data.token, data.user);
    return data.user;
  }

  /** 拉取公钥后加密明文再注册；成功即写入登录态。 */
  async function register(username: string, password: string) {
    const publicKey = await authApi.getPublicKey();
    const cipher = await encryptPassword(password, publicKey);
    const data = await authApi.register({ username, password: cipher });
    resetWorkspace();
    persist(data.token, data.user);
    return data.user;
  }

  /** 新旧密码均加密后提交。 */
  async function changePassword(oldPassword: string, newPassword: string) {
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

  return { token, user, isAuthenticated, login, register, logout, changePassword, clearSession };
});

function readUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

<!--
  @file LoginView.vue
  @author liunannan
  @date 2026-09-13
  @description 登录页：提交凭证并跳转工作台
-->
<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const username = ref('');
const password = ref('');
const submitting = ref(false);
const error = ref('');
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

async function onSubmit() {
  error.value = '';
  submitting.value = true;
  try {
    await auth.login(username.value, password.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/chat';
    await router.replace(redirect);
  } catch (err) {
    error.value = err.response?.data?.message || '用户名或密码错误';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <form class="card" @submit.prevent="onSubmit">
      <h1>AI Chat</h1>
      <p class="sub">登录后进入对话工作台</p>
      <label>
        用户名
        <input v-model="username" name="username" autocomplete="username" required maxlength="64" />
      </label>
      <label>
        密码
        <input
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          required
          maxlength="128"
        />
      </label>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <button type="submit" :disabled="submitting">{{ submitting ? '登录中…' : '登录' }}</button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(1200px 500px at 10% -10%, #d7efe4, transparent),
    #f3efe6;
}
.card {
  width: 360px;
  padding: 32px 28px;
  background: #fffdf8;
  border: 1px solid #e4ddd0;
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(40, 36, 28, 0.08);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
h1 {
  margin: 0;
  font-size: 24px;
  letter-spacing: 0.04em;
}
.sub {
  margin: 0 0 8px;
  color: #6b6458;
  font-size: 14px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #3d3a34;
}
input {
  padding: 10px 12px;
  border: 1px solid #d9d1c3;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}
button {
  margin-top: 8px;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: #1f6f5b;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.err {
  margin: 0;
  color: #b42318;
  font-size: 13px;
}
</style>

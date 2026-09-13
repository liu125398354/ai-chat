<!--
  @file LoginView.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-13
  @description 登录页：RSA 加密密码后提交并跳转工作台
-->
<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const form = reactive({
  username: '',
  password: '',
});
const submitting = ref(false);
const error = ref('');
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

async function onSubmit() {
  error.value = '';
  submitting.value = true;
  try {
    await auth.login(form.username, form.password);
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
    <a-card class="card" :bordered="false">
      <h1>AI Chat</h1>
      <p class="sub">登录后进入对话工作台</p>
      <a-form layout="vertical" :model="form" @finish="onSubmit">
        <a-form-item label="用户名" name="username" :rules="[{ required: true, message: '请输入用户名' }]">
          <a-input
            v-model:value="form.username"
            autocomplete="username"
            :maxlength="64"
          />
        </a-form-item>
        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password
            v-model:value="form.password"
            autocomplete="current-password"
            :maxlength="128"
          />
        </a-form-item>
        <a-alert v-if="error" type="error" :message="error" show-icon class="err" />
        <a-button type="primary" html-type="submit" block :loading="submitting">
          登录
        </a-button>
      </a-form>
    </a-card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(1200px 500px at 10% -10%, #d7efe4, transparent),
    #f3efe6;
}
.card {
  width: 380px;
  max-width: calc(100vw - 32px);
  background: #fffdf8;
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(40, 36, 28, 0.08);
}
h1 {
  margin: 0;
  font-size: 24px;
  letter-spacing: 0.04em;
}
.sub {
  margin: 0 0 16px;
  color: #6b6458;
  font-size: 14px;
}
.err {
  margin-bottom: 12px;
}
</style>

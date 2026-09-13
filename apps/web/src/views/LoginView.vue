<!--
  @file LoginView.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-13
  @description 登录页：提交凭证并跳转工作台；夜空平涂与静止夕烧线
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
    <div class="horizon" aria-hidden="true" />
    <div class="card-frame">
      <span class="corner tl" />
      <span class="corner tr" />
      <span class="corner bl" />
      <span class="corner br" />
      <a-card class="card" :bordered="false">
        <h1>
          <span class="mark" aria-hidden="true" />
          AI Chat
        </h1>
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
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100%;
  display: grid;
  place-items: center;
  background: var(--color-rail);
}
.horizon {
  position: absolute;
  top: 18%;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-horizon);
  pointer-events: none;
}
.card-frame {
  position: relative;
  width: 380px;
  max-width: calc(100vw - 32px);
}
.corner {
  position: absolute;
  width: 8px;
  height: 8px;
  color: var(--color-brand);
  border-color: currentColor;
  border-style: solid;
  pointer-events: none;
  z-index: 1;
}
.corner.tl {
  top: -1px;
  left: -1px;
  border-width: 1px 0 0 1px;
}
.corner.tr {
  top: -1px;
  right: -1px;
  border-width: 1px 1px 0 0;
}
.corner.bl {
  bottom: -1px;
  left: -1px;
  border-width: 0 0 1px 1px;
}
.corner.br {
  bottom: -1px;
  right: -1px;
  border-width: 0 1px 1px 0;
}
.card {
  background: var(--color-paper-raised);
  border-radius: 12px;
  box-shadow: 0 16px 40px var(--color-shadow);
}
h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.12em;
}
.mark {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  background: var(--color-brand);
}
.sub {
  margin: 8px 0 16px;
  color: var(--color-ink-secondary);
  font-size: 14px;
}
.err {
  margin-bottom: 12px;
}
</style>

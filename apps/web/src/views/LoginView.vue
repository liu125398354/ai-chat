<!--
  @file LoginView.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-17
  @description 登录/注册页：同一套 RSA 加密提交；夜空底与品牌标
-->

<template>
  <div class="login-page">
    <NightSky />
    <div class="card-frame">
      <span class="corner tl" />
      <span class="corner tr" />
      <span class="corner bl" />
      <span class="corner br" />
      <a-card class="card" :bordered="false">
        <h1>
          <BrandMark :size="28" />
          AI Chat
        </h1>
        <p class="sub">{{ isRegister ? '注册后进入对话工作台' : '登录后进入对话工作台' }}</p>
        <a-form layout="vertical" :model="form" :rules="rules" @finish="onSubmit">
          <a-form-item label="用户名" name="username" validate-trigger="blur">
            <a-input
              v-model:value="form.username"
              autocomplete="username"
              :maxlength="64"
              placeholder="请输入用户名"
            >
              <template #prefix>
                <UserOutlined class="affix" aria-hidden="true" />
              </template>
            </a-input>
          </a-form-item>
          <a-form-item label="密码" name="password" validate-trigger="blur">
            <a-input-password
              v-model:value="form.password"
              :autocomplete="isRegister ? 'new-password' : 'current-password'"
              :maxlength="128"
              placeholder="请输入密码"
            >
              <template #prefix>
                <LockOutlined class="affix" aria-hidden="true" />
              </template>
            </a-input-password>
          </a-form-item>
          <a-form-item v-if="isRegister" label="确认密码" name="confirmPassword" validate-trigger="blur">
            <a-input-password
              v-model:value="form.confirmPassword"
              autocomplete="new-password"
              :maxlength="128"
              placeholder="再次输入密码"
            >
              <template #prefix>
                <LockOutlined class="affix" aria-hidden="true" />
              </template>
            </a-input-password>
          </a-form-item>
          <a-alert v-if="error" type="error" role="alert" :message="error" show-icon class="err" />
          <a-button type="primary" html-type="submit" block size="large" :loading="submitting">
            <template #icon>
              <UserAddOutlined v-if="isRegister" aria-hidden="true" />
              <LoginOutlined v-else aria-hidden="true" />
            </template>
            {{ isRegister ? '注册并进入' : '登录工作台' }}
          </a-button>
        </a-form>
        <p class="switch">
          <button type="button" class="linkish" @click="toggleMode">
            {{ isRegister ? '已有账号？去登录' : '没有账号？注册' }}
          </button>
        </p>
      </a-card>
    </div>
    <footer class="legal">
      <router-link :to="{ name: 'legal', params: { slug: 'terms' } }">用户协议</router-link>
      <span aria-hidden="true">·</span>
      <router-link :to="{ name: 'legal', params: { slug: 'disclaimer' } }">模型输出免责</router-link>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LockOutlined, LoginOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons-vue';
import BrandMark from '@/components/BrandMark.vue';
import NightSky from '@/components/NightSky.vue';
import { useAuthStore } from '@/stores/auth';
import { registerLoginAntd } from '@/plugins/antd-login';
import { errorMessage } from '@/utils/axios-error';

registerLoginAntd(getCurrentInstance()?.appContext.app);

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
});
const submitting = ref(false);
const error = ref('');
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const isRegister = computed(() => route.name === 'register');

const rules = computed(() => ({
  username: [{ required: true, message: '请输入用户名' }],
  password: isRegister.value
    ? [
        { required: true, message: '请输入密码' },
        { min: 8, max: 128, message: '密码长度为 8–128 个字符' },
      ]
    : [{ required: true, message: '请输入密码' }],
  confirmPassword: [
    { required: true, message: '请再次输入密码' },
    {
      validator: async (_rule: unknown, value: string) => {
        if (value && value !== form.password) {
          throw new Error('两次输入的密码不一致');
        }
      },
    },
  ],
}));

watch(isRegister, () => {
  error.value = '';
  form.confirmPassword = '';
});

async function onSubmit() {
  error.value = '';
  submitting.value = true;
  try {
    if (isRegister.value) {
      await auth.register(form.username.trim(), form.password);
    } else {
      await auth.login(form.username, form.password);
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/chat';
    await router.replace(redirect);
  } catch (err) {
    error.value = isRegister.value ? errorMessage(err, '注册失败') : '用户名或密码错误';
  } finally {
    submitting.value = false;
  }
}

function toggleMode() {
  router.replace({
    name: isRegister.value ? 'login' : 'register',
    query: route.query.redirect ? { redirect: route.query.redirect } : undefined,
  });
}

/** 填表时空闲预取工作台；Markdown 栈随 ChatView 静态依赖一并拉取。 */
function prefetchChatWorkbench() {
  import('@/views/ChatView.vue');
}

onMounted(() => {
  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') {
    ric(prefetchChatWorkbench, { timeout: 2500 });
  } else {
    window.setTimeout(prefetchChatWorkbench, 400);
  }
});
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100%;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.card-frame {
  position: relative;
  width: 380px;
  max-width: calc(100vw - 32px);
  z-index: 1;
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
  border-radius: var(--radius-xl);
  box-shadow: 0 16px 40px var(--color-shadow);
}
h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: var(--fs-card);
  font-weight: 600;
  letter-spacing: 0.12em;
}
.affix {
  color: var(--color-ink-muted);
}
.sub {
  margin: 8px 0 16px;
  color: var(--color-ink-secondary);
  font-size: var(--fs-body);
}
.err {
  margin-bottom: 12px;
}
.switch {
  margin: 16px 0 0;
  text-align: center;
}
.linkish {
  border: 0;
  background: none;
  color: var(--color-brand);
  cursor: pointer;
  padding: 0;
}
.legal {
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  z-index: 1;
  color: var(--color-rail-text);
  font-size: var(--fs-small);
}
.legal a {
  color: var(--color-rail-text);
}
.legal a:hover {
  color: #fff;
}
</style>

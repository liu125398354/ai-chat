<!--
  @file LegalView.vue
  @author liunannan
  @date 2026-09-14
  @updated 2026-09-14
  @description 未登录可访问的用户协议与模型输出免责声明
-->

<template>
  <div class="legal-page">
    <NightSky />
    <article v-if="page" class="card">
      <h1>
        <BrandMark :size="24" />
        {{ page.title }}
      </h1>
      <p v-for="(text, index) in page.paragraphs" :key="index">{{ text }}</p>
      <router-link class="back" :to="{ name: 'login' }">
        <ArrowLeftOutlined />
        返回登录
      </router-link>
    </article>
    <article v-else class="card">
      <h1>
        <BrandMark :size="24" />
        未找到该文档
      </h1>
      <p>请从登录页打开用户协议或模型输出免责声明。</p>
      <router-link class="back" :to="{ name: 'login' }">
        <ArrowLeftOutlined />
        返回登录
      </router-link>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeftOutlined } from '@ant-design/icons-vue';
import BrandMark from '@/components/BrandMark.vue';
import NightSky from '@/components/NightSky.vue';

const route = useRoute();

const pages = {
  terms: {
    title: '用户协议',
    paragraphs: [
      '欢迎使用 AI Chat。使用本服务即表示你理解：账号仅用于访问本人的对话工作台，会话内容仅对账号所有者可见。',
      '你应妥善保管用户名与密码，不得将账号出借给他人。不得利用本服务从事违法、侵害他人权益或干扰服务运行的行为。',
      '我们可能因维护、安全或合规需要中断或调整服务。本页为产品内说明，不构成对外签署的正式合同文本。',
    ],
  },
  disclaimer: {
    title: '模型输出免责声明',
    paragraphs: [
      '助手回复由百度千帆大模型生成，属于概率性输出，可能不准确、不完整或过时。',
      '模型输出不构成法律、医疗、金融或其他专业建议，也不能替代持证专业人士的意见。重要决策请自行核验。',
      '请勿向对话中提交不必要的个人敏感信息。因依赖模型输出而产生的后果由使用者自行承担。',
    ],
  },
};

const page = computed(() => {
  const raw = route.params.slug;
  const key = Array.isArray(raw) ? raw[0] : raw;
  if (!key || !(key in pages)) return null;
  return pages[key as keyof typeof pages];
});
</script>

<style scoped>
.legal-page {
  position: relative;
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 32px 16px;
  overflow: auto;
}
.card {
  position: relative;
  z-index: 1;
  width: 560px;
  max-width: calc(100vw - 32px);
  padding: 28px 32px;
  background: var(--color-paper-raised);
  border-radius: 12px;
  box-shadow: 0 16px 40px var(--color-shadow);
}
h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.08em;
}
p {
  margin: 0 0 12px;
  color: var(--color-ink-secondary);
  line-height: 1.7;
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: var(--color-brand);
}
</style>

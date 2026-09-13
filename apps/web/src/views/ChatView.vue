<!--
  @file ChatView.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-13
  @description 工作台：固定侧栏滚动列表 + 消息区内滚动 + 流式展示
-->
<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MenuOutlined } from '@ant-design/icons-vue';
import { message as antdMessage, Modal } from 'ant-design-vue';
import MarkdownView from '@/components/MarkdownView.vue';
import ChangePasswordModal from '@/components/ChangePasswordModal.vue';
import ConversationSidebar from '@/components/ConversationSidebar.vue';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { useConversationsStore } from '@/stores/conversations';
import { copyText } from '@/utils/clipboard';
import { titleFromUserContent } from '@/utils/conversation-title';

const auth = useAuthStore();
const conversations = useConversationsStore();
const chat = useChatStore();
const router = useRouter();
const route = useRoute();
const draft = ref('');
const composerKey = ref(0);
const composerRef = ref(null);
const messagesEl = ref(null);
const sendError = ref('');
const passwordOpen = ref(false);
const drawerOpen = ref(false);
const isMobile = ref(false);
const copiedId = ref('');
let media = null;
let copiedTimer = 0;

const emptyWorkbench = computed(
  () => !conversations.currentId && !conversations.loading && conversations.items.length === 0,
);

const lastAssistant = computed(() => {
  const list = chat.messages;
  return list.length ? list[list.length - 1] : null;
});

const streamText = computed(() => lastAssistant.value?.content || '');

function syncViewport() {
  isMobile.value = media.matches;
  if (!media.matches) {
    drawerOpen.value = false;
  }
}

onMounted(async () => {
  media = window.matchMedia('(max-width: 768px)');
  syncViewport();
  media.addEventListener('change', syncViewport);
  await conversations.fetchList();
  const fromQuery = typeof route.query.c === 'string' ? route.query.c : '';
  const nextId = fromQuery || conversations.items[0]?.id || '';
  if (nextId) {
    conversations.select(nextId);
  }
});

onUnmounted(() => {
  media?.removeEventListener('change', syncViewport);
  if (copiedTimer) window.clearTimeout(copiedTimer);
});

watch(
  () => conversations.currentId,
  async (id, prev) => {
    if (id === prev) return;
    drawerOpen.value = false;
    if (!id) {
      chat.clear();
      if (route.query.c) {
        const query = { ...route.query };
        delete query.c;
        router.replace({ query });
      }
      return;
    }
    if (chat.generating && chat.streamConversationId === id) {
      router.replace({ query: { ...route.query, c: id } });
      return;
    }
    await chat.load(id);
    router.replace({ query: { ...route.query, c: id } });
  },
);

watch(
  () => chat.generating,
  async (now, was) => {
    if (was && !now) {
      await conversations.fetchList({ silent: true });
    }
  },
);

watch(
  () => [chat.messages.length, streamText.value],
  async () => {
    await nextTick();
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
    }
  },
);

/** 草稿新对话：无 currentId、无消息、未生成。 */
function isDraftNewChat() {
  return Boolean(
    !conversations.currentId && !chat.loading && !chat.generating && chat.messages.length === 0,
  );
}

async function onNewChat() {
  draft.value = '';
  composerKey.value += 1;
  drawerOpen.value = false;
  if (!isDraftNewChat()) {
    conversations.select('');
  }
  await nextTick();
  composerRef.value?.focus?.();
}

function onSelect(id) {
  conversations.select(id);
}

async function onRename(id, title) {
  try {
    await conversations.rename(id, title);
  } catch (err) {
    antdMessage.error(err.response?.data?.message || '重命名失败');
  }
}

async function onDelete(id) {
  await nextTick();
  Modal.confirm({
    title: '删除会话',
    content: '删除该会话后不可恢复，确认删除？',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    zIndex: 2000,
    async onOk() {
      await conversations.remove(id);
    },
  });
}

async function onLogout() {
  chat.abortInFlight();
  await auth.logout();
  await router.push({ name: 'login' });
}

async function onSend() {
  sendError.value = '';
  const text = draft.value.trim();
  if (!text || chat.generating) return;
  if (text.length > 8000) {
    sendError.value = '单条消息最多 8000 字';
    return;
  }
  const payload = text;
  draft.value = '';
  composerKey.value += 1;
  let conversationId = conversations.currentId;
  if (!conversationId) {
    try {
      const created = await conversations.create();
      conversationId = created.id;
    } catch (err) {
      draft.value = payload;
      sendError.value = err.response?.data?.message || '创建会话失败';
      antdMessage.error(sendError.value);
      return;
    }
  }
  if (conversations.isDefaultTitle(conversationId)) {
    conversations.touch(conversationId, titleFromUserContent(payload));
  } else {
    conversations.touch(conversationId);
  }
  const sending = chat.send(conversationId, payload);
  if (conversations.currentId !== conversationId) {
    conversations.select(conversationId);
  }
  await sending;
}

async function onRetry() {
  if (!conversations.currentId || chat.generating) return;
  await chat.retryLastFailed(conversations.currentId);
}

function markCopied(id) {
  copiedId.value = id;
  if (copiedTimer) window.clearTimeout(copiedTimer);
  copiedTimer = window.setTimeout(() => {
    copiedId.value = '';
    copiedTimer = 0;
  }, 1500);
}

/** 复制单条消息原文（Markdown/纯文本）。 */
async function copyMessage(msg) {
  const ok = await copyText(msg.content || '');
  if (!ok) {
    antdMessage.error('复制失败');
    return;
  }
  markCopied(msg.id);
}

/** 按角色拼接当前会话全部消息。 */
async function copyThread() {
  const text = chat.messages
    .map((msg) => `${msg.role === 'user' ? '用户' : '助手'}\n${msg.content || ''}`)
    .join('\n\n---\n\n');
  const ok = await copyText(text);
  if (!ok) {
    antdMessage.error('复制失败');
    return;
  }
  markCopied('thread');
}

function onKeydown(e) {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    onSend();
  }
}
</script>

<template>
  <a-layout class="workbench">
    <a-layout-sider
      v-if="!isMobile"
      :width="280"
      theme="dark"
      class="sidebar"
    >
      <ConversationSidebar
        :items="conversations.items"
        :current-id="conversations.currentId"
        :loading="conversations.loading"
        :error="conversations.error"
        :username="auth.user?.username"
        @new="onNewChat"
        @select="onSelect"
        @delete="onDelete"
        @rename="onRename"
        @logout="onLogout"
        @change-password="passwordOpen = true"
      />
    </a-layout-sider>

    <a-drawer
      v-if="isMobile"
      v-model:open="drawerOpen"
      title="会话"
      placement="left"
      :width="280"
      :body-style="{ padding: 0, height: 'calc(100% - 55px)', background: '#243028' }"
    >
      <ConversationSidebar
        :items="conversations.items"
        :current-id="conversations.currentId"
        :loading="conversations.loading"
        :error="conversations.error"
        :username="auth.user?.username"
        @new="onNewChat"
        @select="onSelect"
        @delete="onDelete"
        @rename="onRename"
        @logout="onLogout"
        @change-password="passwordOpen = true"
      />
    </a-drawer>

    <a-layout class="main">
      <a-layout-header v-if="isMobile" class="mobile-bar">
        <a-button type="text" @click="drawerOpen = true">
          <MenuOutlined />
        </a-button>
        <span>AI Chat</span>
      </a-layout-header>
      <div ref="messagesEl" class="messages thin-scroll">
        <div v-if="chat.messages.length" class="thread-bar">
          <button type="button" class="copy-btn" @click="copyThread">
            {{ copiedId === 'thread' ? '已复制会话' : '复制本会话' }}
          </button>
        </div>
        <a-skeleton v-if="chat.loading" active :paragraph="{ rows: 4 }" />
        <a-empty v-else-if="emptyWorkbench" description="在下方输入以开始新对话。" />
        <a-empty
          v-else-if="chat.messages.length === 0"
          :description="conversations.currentId ? '这一轮还没有消息，在下方提问即可。' : '输入消息开始新对话。'"
        />
        <article
          v-for="msg in chat.messages"
          :key="msg.id"
          class="msg"
          :class="msg.role"
        >
          <div class="bubble">
            <div v-if="msg.role === 'user'" class="plain">{{ msg.content }}</div>
            <MarkdownView
              v-else
              :source="msg.content"
              :live="chat.generating && lastAssistant && lastAssistant.id === msg.id"
            />
            <div v-if="msg.status === 'failed'" class="fail-row">
              <a-alert type="error" :message="chat.error || msg.errorCode || '生成失败'" show-icon />
              <a-button size="small" :disabled="chat.generating" @click="onRetry">重试</a-button>
            </div>
          </div>
          <button type="button" class="copy-btn msg-copy" @click="copyMessage(msg)">
            {{ copiedId === msg.id ? '已复制' : '复制' }}
          </button>
        </article>
        <a-alert
          v-if="chat.error && lastAssistant?.status !== 'failed'"
          type="error"
          :message="chat.error"
          show-icon
          class="alert-gap"
        />
        <a-alert v-if="sendError" type="error" :message="sendError" show-icon class="alert-gap" />
      </div>
      <div class="composer">
        <textarea
          :key="composerKey"
          ref="composerRef"
          v-model="draft"
          rows="3"
          maxlength="8000"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          @keydown="onKeydown"
        />
        <a-button type="primary" :disabled="chat.generating || !draft.trim()" @click="onSend">
          发送
        </a-button>
      </div>
    </a-layout>
  </a-layout>
  <ChangePasswordModal v-model:open="passwordOpen" />
</template>

<style scoped>
.workbench {
  height: 100%;
  overflow: hidden;
}
.sidebar {
  background: #243028 !important;
  overflow: hidden;
}
.sidebar :deep(.ant-layout-sider-children) {
  height: 100%;
  overflow: hidden;
}
.main {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f6f1e8;
  overflow: hidden;
}
.mobile-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 8px;
  background: #fffdf8;
  line-height: 48px;
  flex-shrink: 0;
}
.messages {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px 32px;
}
.thread-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.copy-btn {
  border: 1px solid #d9d1c3;
  border-radius: 6px;
  background: #fff;
  color: #4a4338;
  font-size: 12px;
  line-height: 1;
  padding: 4px 8px;
  cursor: pointer;
}
.copy-btn:hover {
  border-color: #1f6f5b;
  color: #1f6f5b;
}
.msg {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: fit-content;
  max-width: min(720px, 100%);
  margin: 12px 0;
  gap: 6px;
}
.msg.user {
  margin-left: auto;
}
.bubble {
  min-width: 0;
  width: fit-content;
  max-width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
}
.msg.user .bubble {
  background: #1f6f5b;
  color: #fff;
}
.msg.assistant .bubble {
  align-self: flex-start;
  background: #fffdf8;
  border: 1px solid #e4ddd0;
}
.msg-copy {
  flex-shrink: 0;
  align-self: flex-end;
}
.plain {
  white-space: pre-wrap;
  word-break: break-word;
}
.composer {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 16px 32px 24px;
  border-top: 1px solid #e4ddd0;
  background: #fffdf8;
  flex-shrink: 0;
}
.composer textarea {
  flex: 1;
  resize: none;
  padding: 10px 12px;
  border: 1px solid #d9d1c3;
  border-radius: 10px;
  background: #fff;
  outline: none;
}
.composer textarea:focus {
  border-color: #1f6f5b;
}
.composer textarea:disabled {
  opacity: 0.65;
}
.fail-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.alert-gap {
  margin-top: 12px;
}
</style>

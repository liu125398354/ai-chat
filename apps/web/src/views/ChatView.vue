<!--
  @file ChatView.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-14
  @description 工作台：固定侧栏滚动列表 + 消息区内滚动 + 流式展示；生成可停止
-->
<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CopyOutlined, MenuOutlined, PauseOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons-vue';
import { message as antdMessage, Modal } from 'ant-design-vue';
import BrandMark from '@/components/BrandMark.vue';
import MarkdownView from '@/components/MarkdownView.vue';
import ChangePasswordModal from '@/components/ChangePasswordModal.vue';
import ConversationSidebar from '@/components/ConversationSidebar.vue';
import EmptyFrame from '@/components/EmptyFrame.vue';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { useConversationsStore } from '@/stores/conversations';
import { copyText } from '@/utils/clipboard';
import { titleFromUserContent } from '@/utils/conversation-title';
import { CONTEXT_MAX_MESSAGES } from '@/utils/context-window';
import { readLastConversation, writeLastConversation } from '@/utils/last-conversation';

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
const enteringIds = ref({});
let media = null;
let copiedTimer = 0;
let skipNextEnter = true;
let prevMessageIds = [];
let restoringOlder = false;
const stickToBottom = ref(true);

const emptyWorkbench = computed(
  () =>
    !conversations.currentId &&
    !conversations.loading &&
    conversations.items.length === 0 &&
    !conversations.query,
);

const lastAssistant = computed(() => {
  const list = chat.messages;
  return list.length ? list[list.length - 1] : null;
});

const streamText = computed(() => lastAssistant.value?.content || '');

const showContextHint = computed(() => chat.messages.length > CONTEXT_MAX_MESSAGES);

const contextHintText = computed(
  () => `仅使用最近 ${CONTEXT_MAX_MESSAGES} 条作为上下文`,
);

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
  const nextId = await resolveResumeId();
  if (nextId === conversations.currentId) {
    if (nextId) {
      await chat.load(nextId);
      writeLastConversation(auth.user?.id, nextId);
    } else {
      chat.clear();
    }
    return;
  }
  conversations.select(nextId);
});

/** 优先 URL，其次该用户上次选中；已删除或不属于自己则回退列表最近一项。 */
async function resolveResumeId() {
  const fromQuery = typeof route.query.c === 'string' ? route.query.c : '';
  const remembered = readLastConversation(auth.user?.id);
  if (fromQuery && (await conversations.isOwned(fromQuery))) {
    return fromQuery;
  }
  if (remembered && (await conversations.isOwned(remembered))) {
    return remembered;
  }
  return conversations.items[0]?.id || '';
}

onUnmounted(() => {
  media?.removeEventListener('change', syncViewport);
  if (copiedTimer) window.clearTimeout(copiedTimer);
});

watch(
  () => conversations.currentId,
  async (id, prev) => {
    if (id === prev) return;
    if (id && auth.user?.id) {
      writeLastConversation(auth.user.id, id);
    }
    drawerOpen.value = false;
    enteringIds.value = {};
    if (!id) {
      skipNextEnter = false;
      prevMessageIds = [];
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
    skipNextEnter = true;
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
    if (restoringOlder) return;
    if (!stickToBottom.value) return;
    await nextTick();
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
    }
  },
);

watch(
  () => [chat.loading, chat.messages.map((msg) => msg.id)],
  ([loading, ids]) => {
    if (skipNextEnter) {
      if (loading) return;
      skipNextEnter = false;
      prevMessageIds = ids;
      return;
    }
    if (ids.length > prevMessageIds.length) {
      const added = ids.filter((id) => !prevMessageIds.includes(id));
      if (added.length) {
        const next = { ...enteringIds.value };
        added.forEach((id) => {
          next[id] = true;
        });
        enteringIds.value = next;
        window.setTimeout(() => {
          const cleared = { ...enteringIds.value };
          added.forEach((id) => {
            delete cleared[id];
          });
          enteringIds.value = cleared;
        }, 200);
      }
    }
    prevMessageIds = ids;
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
  if (conversations.query) {
    await conversations.setQuery('');
  }
  if (!isDraftNewChat()) {
    conversations.select('');
  }
  await nextTick();
  composerRef.value?.focus?.();
}

function onSelect(id) {
  conversations.select(id);
}

async function onSearch(q) {
  await conversations.setQuery(q);
}

async function onLoadMore() {
  await conversations.fetchList({ append: true });
}

async function onMessagesScroll() {
  const el = messagesEl.value;
  if (!el) return;
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  if (el.scrollTop > 48 || !chat.hasOlder || chat.loadingOlder || restoringOlder) {
    return;
  }
  restoringOlder = true;
  skipNextEnter = true;
  const prevHeight = el.scrollHeight;
  const prevTop = el.scrollTop;
  try {
    await chat.loadOlder(conversations.currentId);
    await nextTick();
    el.scrollTop = el.scrollHeight - prevHeight + prevTop;
  } finally {
    restoringOlder = false;
  }
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

function onStop() {
  chat.abortInFlight();
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
        :loading-more="conversations.loadingMore"
        :has-more="conversations.hasMore"
        :error="conversations.error"
        :username="auth.user?.username"
        :query="conversations.query"
        @new="onNewChat"
        @select="onSelect"
        @delete="onDelete"
        @rename="onRename"
        @logout="onLogout"
        @change-password="passwordOpen = true"
        @search="onSearch"
        @load-more="onLoadMore"
      />
    </a-layout-sider>

    <a-drawer
      v-if="isMobile"
      v-model:open="drawerOpen"
      title="会话"
      placement="left"
      :width="280"
      rootClassName="night-rail-drawer"
      :body-style="{ padding: 0, height: 'calc(100% - 55px)', background: 'var(--color-rail)' }"
    >
      <ConversationSidebar
        :items="conversations.items"
        :current-id="conversations.currentId"
        :loading="conversations.loading"
        :loading-more="conversations.loadingMore"
        :has-more="conversations.hasMore"
        :error="conversations.error"
        :username="auth.user?.username"
        :query="conversations.query"
        @new="onNewChat"
        @select="onSelect"
        @delete="onDelete"
        @rename="onRename"
        @logout="onLogout"
        @change-password="passwordOpen = true"
        @search="onSearch"
        @load-more="onLoadMore"
      />
    </a-drawer>

    <a-layout class="main">
      <a-layout-header v-if="isMobile" class="mobile-bar">
        <a-button type="text" @click="drawerOpen = true">
          <MenuOutlined />
        </a-button>
        <BrandMark :size="20" />
        <span>AI Chat</span>
      </a-layout-header>
      <div ref="messagesEl" class="messages thin-scroll" @scroll="onMessagesScroll">
        <div v-if="chat.messages.length" class="thread-bar">
          <button type="button" class="copy-btn" @click="copyThread">
            <CopyOutlined />
            {{ copiedId === 'thread' ? '已复制会话' : '复制本会话' }}
          </button>
        </div>
        <a-skeleton v-if="chat.loading" active :paragraph="{ rows: 4 }" />
        <a-empty v-else-if="emptyWorkbench" description="在下方输入以开始新对话。">
          <template #image>
            <EmptyFrame />
          </template>
        </a-empty>
        <a-empty
          v-else-if="chat.messages.length === 0"
          :description="conversations.currentId ? '这一轮还没有消息，在下方提问即可。' : '输入消息开始新对话。'"
        >
          <template #image>
            <EmptyFrame />
          </template>
        </a-empty>
        <article
          v-for="msg in chat.messages"
          :key="msg.id"
          class="msg"
          :class="[msg.role, { 'msg-enter': enteringIds[msg.id] }]"
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
              <a-button size="small" :disabled="chat.generating" @click="onRetry">
                <template #icon><ReloadOutlined /></template>
                重试
              </a-button>
            </div>
          </div>
          <button type="button" class="copy-btn msg-copy" @click="copyMessage(msg)">
            <CopyOutlined />
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
        <a-alert
          v-if="showContextHint"
          type="info"
          show-icon
          class="context-hint"
          :message="contextHintText"
        />
        <div class="composer-row">
          <textarea
            :key="composerKey"
            ref="composerRef"
            v-model="draft"
            rows="3"
            maxlength="8000"
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            @keydown="onKeydown"
          />
          <div class="composer-actions">
            <a-button
              type="primary"
              size="large"
              :disabled="chat.generating || !draft.trim()"
              @click="onSend"
            >
              <template #icon><SendOutlined /></template>
              发送
            </a-button>
            <a-button v-if="chat.generating" size="large" @click="onStop">
              <template #icon><PauseOutlined /></template>
              停止
            </a-button>
          </div>
        </div>
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
  background: var(--color-rail) !important;
  overflow: hidden;
  border-inline-end: 1px solid var(--color-rail-active) !important;
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
  background: var(--color-paper);
  overflow: hidden;
}
.mobile-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 8px;
  background: var(--color-paper-raised);
  line-height: 48px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-line);
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--color-line-strong);
  border-radius: 4px;
  background: var(--color-paper-raised);
  color: var(--color-ink-muted);
  font-size: 12px;
  line-height: 1;
  padding: 4px 8px;
  cursor: pointer;
}
.copy-btn:hover {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
  color: var(--color-brand);
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
.msg.assistant {
  margin-right: auto;
  align-items: flex-start;
}
.msg-enter {
  animation: msg-in 180ms var(--ease-tech);
}
@keyframes msg-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.bubble {
  min-width: 0;
  width: fit-content;
  max-width: 100%;
  padding: 12px 14px;
  border-radius: 8px;
}
.msg.user .bubble {
  background: var(--color-brand);
  color: #fff;
}
.msg.assistant .bubble {
  align-self: flex-start;
  background: var(--color-paper-raised);
  border: 1px solid var(--color-line);
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
  flex-direction: column;
  gap: 12px;
  padding: 16px 32px 24px;
  border-top: 1px solid var(--color-line);
  background: var(--color-paper-raised);
  flex-shrink: 0;
}
.context-hint {
  margin: 0;
}
.composer-row {
  display: flex;
  align-items: stretch;
  gap: 12px;
}
.composer-actions {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  width: 108px;
  flex-shrink: 0;
}
.composer-actions :deep(.ant-btn) {
  width: 100%;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.composer textarea {
  flex: 1;
  resize: none;
  padding: 10px 12px;
  border: 1px solid var(--color-line-strong);
  border-radius: 8px;
  background: #fff;
  outline: none;
  transition: border-color 160ms var(--ease-tech), box-shadow 160ms var(--ease-tech);
}
.composer textarea:focus {
  border-color: var(--color-brand);
  box-shadow: inset 0 0 0 1px var(--color-brand);
}
.composer :deep(.ant-btn-primary:disabled) {
  opacity: 0.45;
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

@media (prefers-reduced-motion: reduce) {
  .msg-enter {
    animation: none;
  }
}
</style>

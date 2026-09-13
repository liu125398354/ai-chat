<!--
  @file ChatView.vue
  @author liunannan
  @date 2026-09-13
  @description 工作台：左会话列表 / 中消息 / 底输入
-->
<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MarkdownView from '@/components/MarkdownView.vue';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { useConversationsStore } from '@/stores/conversations';

const auth = useAuthStore();
const conversations = useConversationsStore();
const chat = useChatStore();
const router = useRouter();
const route = useRoute();
const draft = ref('');
const messagesEl = ref(null);
const sendError = ref('');

const emptyWorkbench = computed(
  () => !conversations.currentId && !conversations.loading && conversations.items.length === 0,
);

const lastAssistant = computed(() => {
  const list = chat.messages;
  return list.length ? list[list.length - 1] : null;
});

onMounted(async () => {
  await conversations.fetchList();
  const fromQuery = typeof route.query.c === 'string' ? route.query.c : '';
  const nextId = fromQuery || conversations.items[0]?.id || '';
  if (nextId) {
    conversations.select(nextId);
  }
});

watch(
  () => conversations.currentId,
  async (id, prev) => {
    if (id === prev) return;
    if (!id) {
      chat.clear();
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
      await conversations.fetchList();
    }
  },
);

watch(
  () => chat.messages.length,
  async () => {
    await nextTick();
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
    }
  },
);

async function onNewChat() {
  await conversations.create();
}

async function onSelect(id) {
  conversations.select(id);
}

async function onDelete(id) {
  if (!window.confirm('删除该会话后不可恢复，确认删除？')) return;
  await conversations.remove(id);
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
  let conversationId = conversations.currentId;
  if (!conversationId) {
    try {
      const created = await conversations.create();
      conversationId = created.id;
    } catch (err) {
      sendError.value = err.response?.data?.message || '创建会话失败';
      return;
    }
  }
  draft.value = '';
  await chat.send(conversationId, text);
}

async function onRetry() {
  if (!conversations.currentId || chat.generating) return;
  await chat.retryLastFailed(conversations.currentId);
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    onSend();
  }
}
</script>

<template>
  <div class="workbench">
    <aside class="sidebar">
      <div class="side-head">
        <strong>会话</strong>
        <button type="button" class="ghost" @click="onNewChat">新对话</button>
      </div>
      <div v-if="conversations.loading" class="skel-list" aria-hidden="true">
        <div class="skel" />
        <div class="skel" />
        <div class="skel" />
      </div>
      <p v-else-if="conversations.error" class="err">{{ conversations.error }}</p>
      <p v-else-if="conversations.items.length === 0" class="muted">还没有会话</p>
      <ul v-else class="conv-list">
        <li
          v-for="item in conversations.items"
          :key="item.id"
          :class="{ active: item.id === conversations.currentId }"
        >
          <button type="button" class="conv-btn" @click="onSelect(item.id)">
            {{ item.title }}
          </button>
          <button type="button" class="danger" @click="onDelete(item.id)">删</button>
        </li>
      </ul>
      <div class="side-foot">
        <span>{{ auth.user?.username }}</span>
        <button type="button" class="ghost" @click="onLogout">退出</button>
      </div>
    </aside>

    <section class="main">
      <div ref="messagesEl" class="messages">
        <div v-if="chat.loading" class="skel-msg" aria-hidden="true">
          <div class="skel wide" />
          <div class="skel" />
        </div>
        <p v-else-if="emptyWorkbench" class="welcome">创建新对话，或直接在下方输入以开始。</p>
        <p v-else-if="chat.messages.length === 0" class="welcome">
          这一轮还没有消息，在下方提问即可。
        </p>
        <article
          v-for="msg in chat.messages"
          :key="msg.id"
          class="bubble"
          :class="msg.role"
        >
          <div v-if="msg.role === 'user'" class="plain">{{ msg.content }}</div>
          <MarkdownView
            v-else
            :source="msg.content"
            :live="chat.generating && lastAssistant && lastAssistant.id === msg.id"
          />
          <p v-if="chat.generating && lastAssistant && lastAssistant.id === msg.id && !msg.content" class="muted">
            生成中…
          </p>
          <div v-if="msg.status === 'failed'" class="fail-row">
            <p class="err">{{ chat.error || msg.errorCode || '生成失败' }}</p>
            <button type="button" class="retry" :disabled="chat.generating" @click="onRetry">
              重试
            </button>
          </div>
        </article>
        <p v-if="chat.error && lastAssistant?.status !== 'failed'" class="err">{{ chat.error }}</p>
        <p v-if="sendError" class="err">{{ sendError }}</p>
      </div>
      <form class="composer" @submit.prevent="onSend">
        <textarea
          v-model="draft"
          rows="3"
          maxlength="8000"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          :disabled="chat.generating"
          @keydown="onKeydown"
        />
        <button type="submit" :disabled="chat.generating || !draft.trim()">
          {{ chat.generating ? '生成中…' : '发送' }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.workbench {
  display: grid;
  grid-template-columns: 260px 1fr;
  height: 100vh;
  background: #f6f1e8;
}
.sidebar {
  display: flex;
  flex-direction: column;
  background: #243028;
  color: #e7eee9;
  padding: 16px 12px;
}
.side-head,
.side-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.side-foot {
  margin-top: auto;
  padding-top: 12px;
  font-size: 13px;
}
.conv-list {
  list-style: none;
  margin: 16px 0;
  padding: 0;
  overflow: auto;
  flex: 1;
}
.conv-list li {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.conv-list li.active .conv-btn {
  background: #3a5248;
}
.conv-btn {
  flex: 1;
  text-align: left;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.ghost,
.danger {
  border: 0;
  background: transparent;
  color: #b7cfc3;
  cursor: pointer;
  font-size: 13px;
}
.danger {
  color: #e8b4b4;
}
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.messages {
  flex: 1;
  overflow: auto;
  padding: 24px 32px;
}
.welcome,
.muted {
  color: #6b6458;
}
.bubble {
  max-width: 720px;
  margin: 12px 0;
  padding: 12px 14px;
  border-radius: 12px;
}
.bubble.user {
  margin-left: auto;
  background: #1f6f5b;
  color: #fff;
}
.bubble.assistant {
  background: #fffdf8;
  border: 1px solid #e4ddd0;
}
.plain {
  white-space: pre-wrap;
  word-break: break-word;
}
.composer {
  display: flex;
  gap: 12px;
  padding: 16px 32px 24px;
  border-top: 1px solid #e4ddd0;
  background: #fffdf8;
}
textarea {
  flex: 1;
  resize: none;
  padding: 10px 12px;
  border: 1px solid #d9d1c3;
  border-radius: 10px;
  font: inherit;
}
.composer button {
  align-self: flex-end;
  padding: 10px 16px;
  border: 0;
  border-radius: 8px;
  background: #1f6f5b;
  color: #fff;
  cursor: pointer;
}
.composer button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.err {
  color: #b42318;
  font-size: 13px;
}
.skel-list,
.skel-msg {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0;
}
.skel {
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(90deg, #2c3a34, #3a5248, #2c3a34);
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}
.skel-msg .skel {
  background: linear-gradient(90deg, #efe8dc, #f7f2ea, #efe8dc);
  background-size: 200% 100%;
  height: 48px;
}
.skel-msg .skel.wide {
  width: 70%;
}
.fail-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.retry {
  border: 1px solid #d9d1c3;
  background: #fff;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
}
@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
</style>

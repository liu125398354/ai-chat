/**
 * @file chat.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-16
 * @description 当前会话消息与 generating；停止/切会话 abort 前端 SSE，服务端据此停千帆；generating 时拒绝第二路
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ERROR_CODES } from '@ai-chat/shared';
import { listMessages } from '@/api/conversations';
import { streamMessages } from '@/api/chat';
import { useConversationsStore } from '@/stores/conversations';
import type { ChatMessage, StreamError } from '@/types/models';
import { errorMessage } from '@/utils/axios-error';
import { MESSAGE_PAGE_SIZE } from '@/utils/pagination';

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([]);
  const loading = ref(false);
  const generating = ref(false);
  const error = ref('');
  const streamConversationId = ref('');
  const hasOlder = ref(false);
  const loadingOlder = ref(false);
  let olderCursor: string | null = null;
  let abortController: AbortController | null = null;

  function abortInFlight() {
    abortController?.abort();
    abortController = null;
    generating.value = false;
    streamConversationId.value = '';
  }

  function clear() {
    abortInFlight();
    messages.value = [];
    error.value = '';
    hasOlder.value = false;
    olderCursor = null;
  }

  async function load(conversationId: string) {
    if (generating.value && streamConversationId.value === conversationId) {
      return;
    }
    if (streamConversationId.value && streamConversationId.value !== conversationId) {
      abortInFlight();
    }
    loading.value = true;
    error.value = '';
    messages.value = [];
    hasOlder.value = false;
    olderCursor = null;
    try {
      const data = await listMessages(conversationId, { limit: MESSAGE_PAGE_SIZE });
      if (generating.value && streamConversationId.value === conversationId) {
        return;
      }
      if (useConversationsStore().currentId !== conversationId) {
        return;
      }
      messages.value = data.items || [];
      olderCursor = data.nextCursor || null;
      hasOlder.value = Boolean(olderCursor);
    } catch (err) {
      error.value = errorMessage(err, '加载消息失败');
    } finally {
      loading.value = false;
    }
  }

  /** 向上滚动时预加载更早消息；按 createdAt 拼到现有列表前面。 */
  async function loadOlder(conversationId: string) {
    if (!conversationId || !olderCursor || loadingOlder.value || generating.value) {
      return;
    }
    loadingOlder.value = true;
    try {
      const data = await listMessages(conversationId, {
        limit: MESSAGE_PAGE_SIZE,
        cursor: olderCursor,
      });
      if (useConversationsStore().currentId !== conversationId) {
        return;
      }
      const incoming = data.items || [];
      const seen = new Set(messages.value.map((row) => row.id));
      messages.value = [...incoming.filter((row) => !seen.has(row.id)), ...messages.value];
      olderCursor = data.nextCursor || null;
      hasOlder.value = Boolean(olderCursor);
    } catch (err) {
      error.value = errorMessage(err, '加载更早消息失败');
    } finally {
      loadingOlder.value = false;
    }
  }

  /**
   * 乐观插入后拉 SSE；创建失败不得调用本方法。generating 时直接返回。
   * reuseLastUser：重试失败回复，不再插一条相同 user。
   */
  async function send(
    conversationId: string,
    content: string,
    options: { reuseLastUser?: boolean } = {},
  ) {
    if (generating.value) {
      error.value = '请等待当前回复完成';
      return;
    }
    generating.value = true;
    streamConversationId.value = conversationId;
    error.value = '';
    const reuseLastUser = Boolean(options.reuseLastUser);
    if (reuseLastUser) {
      while (messages.value.length) {
        const tail = messages.value[messages.value.length - 1];
        if (tail.role === 'assistant' && tail.status === 'failed') {
          messages.value = messages.value.slice(0, -1);
          continue;
        }
        break;
      }
    }
    const existingUser = reuseLastUser
      ? [...messages.value].reverse().find((row) => row.role === 'user')
      : undefined;
    const tempUser: ChatMessage = existingUser || {
      id: `temp-user-${Date.now()}`,
      conversationId,
      role: 'user',
      content,
      status: 'completed',
      errorCode: null,
      createdAt: new Date().toISOString(),
    };
    const tempAsst: ChatMessage = {
      id: `temp-asst-${Date.now()}`,
      conversationId,
      role: 'assistant',
      content: '',
      status: 'completed',
      errorCode: null,
      createdAt: new Date().toISOString(),
    };
    messages.value = reuseLastUser
      ? [...messages.value, tempAsst]
      : [...messages.value, tempUser, tempAsst];
    abortController = new AbortController();
    const targetId = conversationId;
    try {
      await streamMessages(conversationId, { content }, abortController.signal, (event, data) => {
        if (streamConversationId.value !== targetId) return;
        if (event === 'meta') {
          if (typeof data.userMessageId === 'string') {
            tempUser.id = data.userMessageId;
          }
          if (typeof data.title === 'string' && data.title) {
            useConversationsStore().touch(targetId, data.title);
          }
        }
        if (event === 'delta' && typeof data.content === 'string' && data.content) {
          tempAsst.content += data.content;
          const idx = messages.value.findIndex((row) => row.id === tempAsst.id);
          if (idx >= 0) {
            messages.value[idx] = { ...messages.value[idx], content: tempAsst.content };
          }
        }
        if (event === 'done' && typeof data.messageId === 'string') {
          tempAsst.id = data.messageId;
          tempAsst.status = 'completed';
          tempAsst.errorCode = null;
        }
        if (event === 'error') {
          tempAsst.status = 'failed';
          tempAsst.errorCode = typeof data.code === 'string' ? data.code : ERROR_CODES.QIANFAN_ERROR;
          error.value = typeof data.message === 'string' ? data.message : '生成失败';
        }
      });
    } catch (err) {
      const streamErr = err as StreamError;
      if (streamErr.name === 'AbortError') return;
      if (streamErr.status === 409) {
        messages.value = messages.value.filter((row) => {
          if (row.id === tempAsst.id) return false;
          if (!reuseLastUser && row.id === tempUser.id) return false;
          return true;
        });
        error.value = streamErr.message || '请等待当前回复完成';
        return;
      }
      tempAsst.status = 'failed';
      tempAsst.errorCode = streamErr.code || ERROR_CODES.INTERNAL_ERROR;
      error.value = errorMessage(err, '发送失败');
    } finally {
      if (streamConversationId.value === targetId) {
        generating.value = false;
        streamConversationId.value = '';
        abortController = null;
      }
    }
    if (!error.value && useConversationsStore().currentId === targetId) {
      await reconcile(conversationId);
    }
  }

  /** done 后静默拉一页消息，校准临时 id / 半包。 */
  async function reconcile(conversationId: string) {
    try {
      const data = await listMessages(conversationId, { limit: MESSAGE_PAGE_SIZE });
      if (useConversationsStore().currentId !== conversationId) {
        return;
      }
      if (generating.value && streamConversationId.value === conversationId) {
        return;
      }
      messages.value = data.items || [];
      olderCursor = data.nextCursor || null;
      hasOlder.value = Boolean(olderCursor);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('reconcile messages failed', err);
      }
    }
  }

  async function retryLastFailed(conversationId: string) {
    const lastUser = [...messages.value].reverse().find((row) => row.role === 'user');
    if (!lastUser || generating.value) return;
    await send(conversationId, lastUser.content, { reuseLastUser: true });
  }

  return {
    messages,
    loading,
    generating,
    error,
    streamConversationId,
    hasOlder,
    loadingOlder,
    load,
    loadOlder,
    send,
    abortInFlight,
    clear,
    retryLastFailed,
  };
});

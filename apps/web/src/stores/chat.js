/**
 * @file chat.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-13
 * @description 当前会话消息与 generating；切会话 abort 前端 SSE，服务端据此停千帆；generating 时拒绝第二路
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { listMessages } from '@/api/conversations';
import { streamMessages } from '@/api/chat';
import { useConversationsStore } from '@/stores/conversations';

export const useChatStore = defineStore('chat', () => {
  const messages = ref([]);
  const loading = ref(false);
  const generating = ref(false);
  const error = ref('');
  const streamConversationId = ref('');
  let abortController = null;

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
  }

  async function load(conversationId) {
    if (generating.value && streamConversationId.value === conversationId) {
      return;
    }
    if (streamConversationId.value && streamConversationId.value !== conversationId) {
      abortInFlight();
    }
    loading.value = true;
    error.value = '';
    messages.value = [];
    try {
      const data = await listMessages(conversationId);
      if (generating.value && streamConversationId.value === conversationId) {
        return;
      }
      messages.value = data.items || [];
    } catch (err) {
      error.value = err.response?.data?.message || err.message || '加载消息失败';
    } finally {
      loading.value = false;
    }
  }

  /**
   * 乐观插入后拉 SSE；创建失败不得调用本方法。generating 时直接返回。
   */
  async function send(conversationId, content) {
    if (generating.value) {
      error.value = '请等待当前回复完成';
      return;
    }
    generating.value = true;
    streamConversationId.value = conversationId;
    error.value = '';
    const tempUser = {
      id: `temp-user-${Date.now()}`,
      conversationId,
      role: 'user',
      content,
      status: 'completed',
      errorCode: null,
      createdAt: new Date().toISOString(),
    };
    const tempAsst = {
      id: `temp-asst-${Date.now()}`,
      conversationId,
      role: 'assistant',
      content: '',
      status: 'completed',
      errorCode: null,
      createdAt: new Date().toISOString(),
    };
    messages.value = [...messages.value, tempUser, tempAsst];
    abortController = new AbortController();
    const targetId = conversationId;
    try {
      await streamMessages(
        conversationId,
        { content },
        abortController.signal,
        (event, data) => {
          if (streamConversationId.value !== targetId) return;
          if (event === 'meta') {
            if (data.userMessageId) {
              tempUser.id = data.userMessageId;
            }
            if (data.title) {
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
          if (event === 'done' && data.messageId) {
            tempAsst.id = data.messageId;
            tempAsst.status = 'completed';
            tempAsst.errorCode = null;
          }
          if (event === 'error') {
            tempAsst.status = 'failed';
            tempAsst.errorCode = data.code || 'QIANFAN_ERROR';
            error.value = data.message || '生成失败';
          }
        },
      );
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (err.status === 409) {
        messages.value = messages.value.filter(
          (row) => row.id !== tempUser.id && row.id !== tempAsst.id,
        );
        error.value = err.message || '请等待当前回复完成';
        return;
      }
      tempAsst.status = 'failed';
      tempAsst.errorCode = err.code || 'INTERNAL_ERROR';
      error.value = err.message || '发送失败';
    } finally {
      if (streamConversationId.value === targetId) {
        generating.value = false;
        streamConversationId.value = '';
        abortController = null;
      }
    }
  }

  async function retryLastFailed(conversationId) {
    const lastUser = [...messages.value].reverse().find((row) => row.role === 'user');
    if (!lastUser || generating.value) return;
    await send(conversationId, lastUser.content);
  }

  return {
    messages,
    loading,
    generating,
    error,
    streamConversationId,
    load,
    send,
    abortInFlight,
    clear,
    retryLastFailed,
  };
});

/**
 * @file chat.js
 * @author liunannan
 * @date 2026-09-13
 * @description 当前会话消息与 generating；切会话 abort 防串台
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { listMessages } from '@/api/conversations';
import { streamMessages } from '@/api/chat';

export const useChatStore = defineStore('chat', () => {
  const messages = ref([]);
  const loading = ref(false);
  const generating = ref(false);
  const error = ref('');
  let abortController = null;

  function abortInFlight() {
    abortController?.abort();
    abortController = null;
    generating.value = false;
  }

  async function load(conversationId) {
    abortInFlight();
    loading.value = true;
    error.value = '';
    messages.value = [];
    try {
      const data = await listMessages(conversationId);
      messages.value = data.items || [];
    } catch (err) {
      error.value = err.response?.data?.message || err.message || '加载消息失败';
    } finally {
      loading.value = false;
    }
  }

  /**
   * 乐观插入后拉 SSE；失败保留用户消息。
   */
  async function send(conversationId, content) {
    if (generating.value) return;
    generating.value = true;
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
    try {
      await streamMessages(
        conversationId,
        { content },
        abortController.signal,
        (event, data) => {
          if (event === 'delta' && data.content) {
            tempAsst.content += data.content;
          }
          if (event === 'done' && data.messageId) {
            tempAsst.id = data.messageId;
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
      tempAsst.status = 'failed';
      tempAsst.errorCode = err.code || 'INTERNAL_ERROR';
      error.value = err.message || '发送失败';
    } finally {
      generating.value = false;
      abortController = null;
    }
  }

  return { messages, loading, generating, error, load, send, abortInFlight };
});

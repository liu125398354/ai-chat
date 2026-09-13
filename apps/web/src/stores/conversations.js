/**
 * @file conversations.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-13
 * @description 会话列表与当前 ID；列表对象不含 messages
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as convApi from '@/api/conversations';
import { DEFAULT_CONVERSATION_TITLE } from '@/utils/conversation-title';

export const useConversationsStore = defineStore('conversations', () => {
  const items = ref([]);
  const currentId = ref('');
  const loading = ref(false);
  const error = ref('');

  async function fetchList(options = {}) {
    const silent = Boolean(options.silent);
    if (!silent) {
      loading.value = true;
    }
    error.value = '';
    try {
      const data = await convApi.listConversations();
      items.value = data.items || [];
    } catch (err) {
      error.value = err.response?.data?.message || err.message || '加载会话失败';
    } finally {
      if (!silent) {
        loading.value = false;
      }
    }
  }

  async function create(title) {
    const created = await convApi.createConversation(title);
    items.value = [created, ...items.value.filter((row) => row.id !== created.id)];
    currentId.value = created.id;
    return created;
  }

  async function remove(id) {
    await convApi.deleteConversation(id);
    items.value = items.value.filter((row) => row.id !== id);
    if (currentId.value === id) {
      currentId.value = items.value[0]?.id || '';
    }
  }

  async function rename(id, title) {
    const updated = await convApi.renameConversation(id, title);
    const idx = items.value.findIndex((row) => row.id === id);
    if (idx >= 0) {
      items.value[idx] = updated;
    }
    return updated;
  }

  /** 首条提问或 SSE meta 后更新标题并置顶，不整表刷新。 */
  function touch(id, title) {
    const idx = items.value.findIndex((row) => row.id === id);
    if (idx < 0) return;
    const next = {
      ...items.value[idx],
      ...(title ? { title } : {}),
      updatedAt: new Date().toISOString(),
    };
    items.value.splice(idx, 1);
    items.value.unshift(next);
  }

  function isDefaultTitle(id) {
    const row = items.value.find((item) => item.id === id);
    return !row || row.title === DEFAULT_CONVERSATION_TITLE;
  }

  function select(id) {
    currentId.value = id;
  }

  return {
    items,
    currentId,
    loading,
    error,
    fetchList,
    create,
    remove,
    rename,
    touch,
    isDefaultTitle,
    select,
  };
});

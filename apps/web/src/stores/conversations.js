/**
 * @file conversations.js
 * @author liunannan
 * @date 2026-09-13
 * @description 会话列表与当前 ID；列表对象不含 messages
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as convApi from '@/api/conversations';

export const useConversationsStore = defineStore('conversations', () => {
  const items = ref([]);
  const currentId = ref('');
  const loading = ref(false);
  const error = ref('');

  async function fetchList() {
    loading.value = true;
    error.value = '';
    try {
      const data = await convApi.listConversations();
      items.value = data.items || [];
    } catch (err) {
      error.value = err.response?.data?.message || err.message || '加载会话失败';
    } finally {
      loading.value = false;
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

  function select(id) {
    currentId.value = id;
  }

  return { items, currentId, loading, error, fetchList, create, remove, select };
});

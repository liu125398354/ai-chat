/**
 * @file conversations.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 会话列表与当前 ID；keyset 分页与标题搜索；列表不含 messages
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import * as convApi from '@/api/conversations';
import { CONVERSATION_PAGE_SIZE } from '@/utils/pagination';
import { DEFAULT_CONVERSATION_TITLE } from '@/utils/conversation-title';

export const useConversationsStore = defineStore('conversations', () => {
  const items = ref([]);
  const currentId = ref('');
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref('');
  const query = ref('');
  const nextCursor = ref(null);
  const hasMore = computed(() => Boolean(nextCursor.value));

  async function fetchList(options = {}) {
    const silent = Boolean(options.silent);
    const append = Boolean(options.append);
    if (append) {
      if (!nextCursor.value || loadingMore.value) return;
      loadingMore.value = true;
    } else if (!silent) {
      loading.value = true;
    }
    error.value = '';
    try {
      const data = await convApi.listConversations({
        limit: CONVERSATION_PAGE_SIZE,
        cursor: append ? nextCursor.value : undefined,
        q: query.value || undefined,
      });
      const page = data.items || [];
      if (append) {
        const seen = new Set(items.value.map((row) => row.id));
        items.value = [...items.value, ...page.filter((row) => !seen.has(row.id))];
        nextCursor.value = data.nextCursor || null;
      } else if (silent) {
        const pageIds = new Set(page.map((row) => row.id));
        const rest = items.value.filter((row) => !pageIds.has(row.id));
        items.value = [...page, ...rest];
      } else {
        items.value = page;
        nextCursor.value = data.nextCursor || null;
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message || '加载会话失败';
    } finally {
      loading.value = false;
      loadingMore.value = false;
    }
  }

  function setQuery(next) {
    query.value = next;
    return fetchList();
  }

  /** 落库并插入侧栏；不选中，避免 watch 在首条发送前 load 冲掉乐观消息。 */
  async function create(title) {
    const created = await convApi.createConversation(title);
    items.value = [created, ...items.value.filter((row) => row.id !== created.id)];
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
    const idx = items.value.findIndex((item) => item.id === id);
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

  /** 当前用户是否仍拥有该会话；首屏列表未覆盖时再探消息接口。 */
  async function isOwned(id) {
    if (!id) return false;
    if (items.value.some((row) => row.id === id)) return true;
    try {
      await convApi.listMessages(id, { limit: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /** 换户 / 登出时丢弃列表与当前选中，避免串台。 */
  function reset() {
    items.value = [];
    currentId.value = '';
    loading.value = false;
    loadingMore.value = false;
    error.value = '';
    query.value = '';
    nextCursor.value = null;
  }

  return {
    items,
    currentId,
    loading,
    loadingMore,
    error,
    query,
    hasMore,
    fetchList,
    setQuery,
    create,
    remove,
    rename,
    touch,
    isDefaultTitle,
    select,
    isOwned,
    reset,
  };
});

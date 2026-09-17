<!--
  @file ConversationSidebar.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-17
  @description 会话列表：搜索、keyset 加载更多、条目多时窗口化渲染
-->

<template>
  <div class="side">
    <div class="side-head">
      <div class="brand">
        <BrandMark :size="22" />
        <strong>会话</strong>
      </div>
      <a-button type="primary" size="small" @click="$emit('new')">
        <template #icon><PlusOutlined /></template>
        新对话
      </a-button>
    </div>
    <div class="search-wrap">
      <SearchOutlined class="search-ico" />
      <input
        v-model="searchDraft"
        class="search"
        type="search"
        maxlength="100"
        placeholder="搜索会话标题"
        autocomplete="off"
        @input="onSearchInput"
      />
    </div>
    <div class="side-body" :aria-busy="loading">
      <a-skeleton v-if="loading" active :title="false" :paragraph="{ rows: 6 }" />
      <a-alert v-else-if="error" type="error" role="alert" :message="error" show-icon />
      <a-empty v-else-if="items.length === 0" :description="query ? '没有匹配的会话' : '还没有会话'">
        <template #image>
          <EmptyFrame />
        </template>
      </a-empty>
      <ul v-else ref="listRef" class="conv-list thin-scroll thin-scroll-dark" @scroll="onListScroll">
      <li v-if="padTop" class="spacer" :style="{ height: padTop + 'px' }" aria-hidden="true" />
      <li
        v-for="item in visibleItems"
        :key="item.id"
        :class="{
          active: item.id === currentId,
          'menu-open': menuOpenId === item.id,
          confirming: confirmingId === item.id,
        }"
        @mouseleave="onRowLeave(item.id)"
      >
        <span class="active-bar" aria-hidden="true" />
        <input
          v-if="editingId === item.id"
          :ref="setRenameEl"
          v-model="editingTitle"
          class="rename-input"
          maxlength="200"
          @blur="commitRename(item)"
          @keydown="onRenameKeydown($event, item)"
          @click.stop
        />
        <button
          v-else
          type="button"
          class="conv-btn"
          :title="item.title"
          @click="$emit('select', item.id)"
        >
          {{ item.title }}
        </button>
        <a-dropdown
          v-if="editingId !== item.id"
          :open="menuOpenId === item.id"
          :trigger="['click']"
          @openChange="(open: boolean) => onOpenChange(open, item.id)"
        >
          <button type="button" class="more-btn" title="更多" @click.stop>
            <MoreOutlined />
          </button>
          <template #overlay>
            <a-menu @click="onMenuClick($event, item)">
              <a-menu-item key="rename">
                <EditOutlined />
                重命名
              </a-menu-item>
              <a-menu-item key="delete">
                <DeleteOutlined />
                删除
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </li>
      <li v-if="padBottom" class="spacer" :style="{ height: padBottom + 'px' }" aria-hidden="true" />
    </ul>
    </div>
    <div class="side-foot">
      <div class="foot-id">
        <span class="user" :title="username">{{ username }}</span>
        <span class="user-hint">当前账户</span>
      </div>
      <div class="foot-actions">
        <button type="button" class="foot-link" @click="$emit('change-password')">
          <UnlockOutlined />
          更换密码
        </button>
        <span class="foot-dot" aria-hidden="true">·</span>
        <button type="button" class="foot-link" @click="$emit('logout')">
          <LogoutOutlined />
          离开
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { PropType } from 'vue';
import {
  DeleteOutlined,
  EditOutlined,
  LogoutOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  UnlockOutlined,
} from '@ant-design/icons-vue';
import BrandMark from '@/components/BrandMark.vue';
import EmptyFrame from '@/components/EmptyFrame.vue';
import type { Conversation } from '@/types/models';

const ROW_HEIGHT = 44;
const OVERSCAN = 8;
const VIRTUAL_THRESHOLD = 40;

const props = defineProps({
  items: { type: Array as PropType<Conversation[]>, default: () => [] },
  currentId: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  loadingMore: { type: Boolean, default: false },
  hasMore: { type: Boolean, default: false },
  error: { type: String, default: '' },
  username: { type: String, default: '' },
  query: { type: String, default: '' },
});

const emit = defineEmits(['new', 'select', 'delete', 'rename', 'logout', 'change-password', 'search', 'load-more']);

const editingId = ref('');
const editingTitle = ref('');
const renameInput = ref<HTMLInputElement | null>(null);
const menuOpenId = ref('');
const confirmingId = ref('');
const searchDraft = ref(props.query);
const listRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportH = ref(400);
let searchTimer = 0;

watch(
  () => props.query,
  (q) => {
    if (q !== searchDraft.value) {
      searchDraft.value = q;
    }
  },
);

const useVirtual = computed(() => props.items.length > VIRTUAL_THRESHOLD);
const startIndex = computed(() => {
  if (!useVirtual.value) return 0;
  return Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN);
});
const endIndex = computed(() => {
  if (!useVirtual.value) return props.items.length;
  const visible = Math.ceil(viewportH.value / ROW_HEIGHT) + OVERSCAN * 2;
  return Math.min(props.items.length, startIndex.value + visible);
});
const visibleItems = computed(() => props.items.slice(startIndex.value, endIndex.value));
const padTop = computed(() => (useVirtual.value ? startIndex.value * ROW_HEIGHT : 0));
const padBottom = computed(() =>
  useVirtual.value ? Math.max(0, (props.items.length - endIndex.value) * ROW_HEIGHT) : 0,
);

function onSearchInput(e: Event) {
  searchDraft.value = (e.target as HTMLInputElement).value;
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    emit('search', searchDraft.value.trim());
  }, 300);
}

function onListScroll(e: Event) {
  const el = e.target as HTMLElement;
  scrollTop.value = el.scrollTop;
  viewportH.value = el.clientHeight;
  if (props.hasMore && !props.loadingMore && el.scrollTop + el.clientHeight > el.scrollHeight - 72) {
    emit('load-more');
  }
}

function setRenameEl(el: unknown) {
  renameInput.value = el instanceof HTMLInputElement ? el : null;
}

function startRename(item: Conversation) {
  menuOpenId.value = '';
  editingId.value = item.id;
  editingTitle.value = item.title;
  nextTick(() => {
    renameInput.value?.focus?.();
    renameInput.value?.select?.();
  });
}

function cancelRename() {
  editingId.value = '';
  editingTitle.value = '';
}

function commitRename(item: Conversation) {
  const title = editingTitle.value.trim();
  cancelRename();
  if (!title || title === item.title) return;
  emit('rename', item.id, title);
}

function onRenameKeydown(e: KeyboardEvent, item: Conversation) {
  if (e.key === 'Enter') {
    e.preventDefault();
    commitRename(item);
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelRename();
  }
}

function onOpenChange(open: boolean, id: string) {
  if (confirmingId.value === id && open) {
    return;
  }
  menuOpenId.value = open ? id : '';
}

function onRowLeave(id: string) {
  if (confirmingId.value === id) {
    confirmingId.value = '';
  }
}

function onMenuClick({ key }: { key: string | number }, item: Conversation) {
  if (key === 'rename') {
    startRename(item);
  }
  if (key === 'delete') {
    menuOpenId.value = '';
    confirmingId.value = item.id;
    emit('delete', item.id);
  }
}
</script>

<style scoped>
.side {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 16px 12px;
  color: var(--color-rail-text);
  background: linear-gradient(180deg, rgba(10, 12, 24, 0.55) 0%, rgba(18, 20, 40, 0.42) 100%);
  --empty-icon: rgba(215, 220, 240, 0.82);
}
.side::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.03;
  background-image: repeating-linear-gradient(
      0deg,
      #fff 0 1px,
      transparent 1px 3px
    ),
    repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 4px);
}
.side-head {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.side-head :deep(.ant-btn) {
  display: inline-flex;
  align-items: center;
}
.side :deep(.ant-dropdown-menu-title-content) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.side-body {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 12px;
  overflow: hidden;
}
.side-body :deep(.ant-empty) {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.side-body :deep(.ant-skeleton) {
  padding-top: 8px;
}
.side-head strong {
  font-size: var(--fs-secondary);
  font-weight: 600;
  letter-spacing: 0.08em;
}
.search-wrap {
  position: relative;
  margin: 12px 0 0;
}
.search-ico {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(215, 220, 240, 0.45);
  pointer-events: none;
}
.search {
  position: relative;
  width: 100%;
  padding: 6px 8px 6px 28px;
  border: 1px solid rgba(90, 110, 180, 0.35);
  border-radius: var(--radius-md);
  background: rgba(12, 14, 28, 0.72);
  color: var(--color-rail-text);
  outline: none;
}
.search:focus {
  border-color: var(--color-brand);
}
.search::placeholder {
  color: rgba(215, 220, 240, 0.48);
}
.side-foot {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  margin: 12px -12px -16px;
  padding: 14px 16px 16px;
  border-top: 1px solid rgba(90, 110, 180, 0.28);
  background: rgba(12, 14, 28, 0.72);
  font-size: var(--fs-secondary);
}
.side :deep(.ant-empty-description) {
  color: var(--color-rail-text);
}
.foot-id {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.user {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.user-hint {
  flex-shrink: 0;
  font-size: var(--fs-caption);
  letter-spacing: 0.08em;
  color: rgba(215, 220, 240, 0.55);
}
.foot-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.foot-dot {
  padding: 0 2px;
  color: rgba(215, 220, 240, 0.35);
}
.foot-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: rgba(215, 220, 240, 0.78);
  font-size: var(--fs-small);
  letter-spacing: 0.04em;
  cursor: pointer;
  padding: 0;
}
.foot-link:hover {
  color: #fff;
}
.conv-list {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.conv-list li {
  position: relative;
  display: flex;
  gap: 4px;
  height: 38px;
  margin-bottom: 6px;
  align-items: center;
  border-radius: var(--radius-md);
}
.conv-list li.spacer {
  height: auto;
  margin: 0;
  padding: 0;
  pointer-events: none;
}
.conv-list li.active {
  background: rgba(59, 91, 219, 0.32);
}
.conv-list li:hover:not(.active) {
  background: rgba(28, 32, 64, 0.55);
}
.active-bar {
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--color-brand);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform var(--dur-fast) var(--ease-tech);
  pointer-events: none;
}
.conv-list li.active .active-bar {
  transform: scaleY(1);
}
.conv-btn {
  flex: 1;
  min-width: 0;
  text-align: left;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: inherit;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.more-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-rail-text);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-micro) var(--ease-tech);
}
.conv-list li:hover:not(.confirming) .more-btn,
.conv-list li.menu-open .more-btn {
  opacity: 1;
  pointer-events: auto;
}
.more-btn:hover {
  background: rgba(12, 14, 28, 0.55);
}
.rename-input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--color-brand);
  border-radius: var(--radius-md);
  background: rgba(12, 14, 28, 0.78);
  color: var(--color-rail-text);
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .active-bar {
    transition: none;
  }
}
</style>

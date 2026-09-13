<!--
  @file ConversationSidebar.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-13
  @description 会话列表：⋯ 菜单提供重命名与删除，未悬停不显示操作
-->
<script setup>
import { nextTick, ref } from 'vue';
import EmptyFrame from '@/components/EmptyFrame.vue';

defineProps({
  items: { type: Array, default: () => [] },
  currentId: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  username: { type: String, default: '' },
});

const emit = defineEmits(['new', 'select', 'delete', 'rename', 'logout', 'change-password']);

const editingId = ref('');
const editingTitle = ref('');
const renameInput = ref(null);
const menuOpenId = ref('');
const confirmingId = ref('');

function setRenameEl(el) {
  renameInput.value = el;
}

function startRename(item) {
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

function commitRename(item) {
  const title = editingTitle.value.trim();
  cancelRename();
  if (!title || title === item.title) return;
  emit('rename', item.id, title);
}

function onRenameKeydown(e, item) {
  if (e.key === 'Enter') {
    e.preventDefault();
    commitRename(item);
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelRename();
  }
}

function onOpenChange(open, id) {
  if (confirmingId.value === id && open) {
    return;
  }
  menuOpenId.value = open ? id : '';
}

function onRowLeave(id) {
  if (confirmingId.value === id) {
    confirmingId.value = '';
  }
}

function onMenuClick({ key }, item) {
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

<template>
  <div class="side">
    <div class="side-head">
      <strong>会话</strong>
      <a-button type="primary" size="small" @click="$emit('new')">新对话</a-button>
    </div>
    <a-skeleton v-if="loading" active :title="false" :paragraph="{ rows: 6 }" />
    <a-alert v-else-if="error" type="error" :message="error" show-icon />
    <a-empty v-else-if="items.length === 0" description="还没有会话">
      <template #image>
        <EmptyFrame />
      </template>
    </a-empty>
    <ul v-else class="conv-list thin-scroll thin-scroll-dark">
      <li
        v-for="item in items"
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
          @openChange="(open) => onOpenChange(open, item.id)"
        >
          <button type="button" class="more-btn" title="更多" @click.stop>
            ⋯
          </button>
          <template #overlay>
            <a-menu @click="onMenuClick($event, item)">
              <a-menu-item key="rename">重命名</a-menu-item>
              <a-menu-item key="delete">删除</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </li>
    </ul>
    <div class="side-foot">
      <span class="user">{{ username }}</span>
      <a-space>
        <button type="button" class="foot-link" @click="$emit('change-password')">改密</button>
        <button type="button" class="foot-link" @click="$emit('logout')">退出</button>
      </a-space>
    </div>
  </div>
</template>

<style scoped>
.side {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 16px 12px;
  color: var(--color-rail-text);
  background: var(--color-rail);
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
.side-head,
.side-foot {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.side-head strong {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
}
.side-foot {
  padding-top: 12px;
  font-size: 13px;
}
.side :deep(.ant-empty-description) {
  color: var(--color-rail-text);
}
.foot-link {
  border: 0;
  background: transparent;
  color: var(--color-rail-text);
  font-size: 13px;
  cursor: pointer;
  padding: 0 4px;
}
.foot-link:hover {
  color: #fff;
}
.conv-list {
  position: relative;
  list-style: none;
  margin: 16px 0;
  padding: 0;
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.conv-list li {
  position: relative;
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
  align-items: center;
  border-radius: 6px;
}
.conv-list li.active {
  background: var(--color-rail-active);
}
.conv-list li:hover:not(.active) {
  background: var(--color-rail-hover);
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
  transition: transform 160ms var(--ease-tech);
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
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.more-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--color-rail-text);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms var(--ease-tech);
}
.conv-list li:hover:not(.confirming) .more-btn,
.conv-list li.menu-open .more-btn {
  opacity: 1;
  pointer-events: auto;
}
.more-btn:hover {
  background: var(--color-rail-inset);
}
.rename-input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--color-brand);
  border-radius: 6px;
  background: var(--color-rail-inset);
  color: var(--color-rail-text);
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .active-bar {
    transition: none;
  }
}
</style>

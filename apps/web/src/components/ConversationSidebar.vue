<!--
  @file ConversationSidebar.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-13
  @description 会话列表：⋯ 菜单提供重命名与删除，未悬停不显示操作
-->
<script setup>
import { nextTick, ref } from 'vue';

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
    <a-empty v-else-if="items.length === 0" description="还没有会话" />
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
        <a-button type="link" size="small" @click="$emit('change-password')">改密</a-button>
        <a-button type="link" size="small" @click="$emit('logout')">退出</a-button>
      </a-space>
    </div>
  </div>
</template>

<style scoped>
.side {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 16px 12px;
  color: #e7eee9;
}
.side-head,
.side-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.side-foot {
  padding-top: 12px;
  font-size: 13px;
}
.user {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}
.conv-list {
  list-style: none;
  margin: 16px 0;
  padding: 0;
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.conv-list li {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
  align-items: center;
  border-radius: 8px;
}
.conv-list li.active .conv-btn {
  background: #3a5248;
}
.conv-btn {
  flex: 1;
  min-width: 0;
  text-align: left;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-btn:hover {
  background: #32443c;
}
.more-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #e7eee9;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.conv-list li:hover:not(.confirming) .more-btn,
.conv-list li.menu-open .more-btn {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.more-btn:hover {
  background: #1c2622;
}
.rename-input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid #3a5248;
  border-radius: 6px;
  background: #1c2622;
  color: #e7eee9;
  outline: none;
}
</style>

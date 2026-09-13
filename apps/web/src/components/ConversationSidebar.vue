<!--
  @file ConversationSidebar.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-13
  @description 会话列表：提问摘要标题、悬停删除、双击重命名
-->
<script setup>
import { nextTick, ref } from 'vue';
import { DeleteOutlined } from '@ant-design/icons-vue';

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

function startRename(item) {
  editingId.value = item.id;
  editingTitle.value = item.title;
  nextTick(() => {
    renameInput.value?.focus?.();
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
    <ul v-else class="conv-list">
      <li
        v-for="item in items"
        :key="item.id"
        :class="{ active: item.id === currentId }"
      >
        <a-input
          v-if="editingId === item.id"
          ref="renameInput"
          v-model:value="editingTitle"
          size="small"
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
          @dblclick.stop="startRename(item)"
        >
          {{ item.title }}
        </button>
        <a-button
          v-if="editingId !== item.id"
          class="del-btn"
          type="text"
          danger
          size="small"
          title="删除"
          @click.stop="$emit('delete', item.id)"
        >
          <DeleteOutlined />
        </a-button>
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
.del-btn {
  flex-shrink: 0;
  opacity: 0;
  color: #e8b4b4 !important;
}
.conv-list li:hover .del-btn,
.conv-list li:focus-within .del-btn {
  opacity: 1;
}
@media (hover: none) {
  .conv-list li.active .del-btn {
    opacity: 1;
  }
}
.conv-list :deep(.ant-input) {
  flex: 1;
  background: #1c2622;
  color: #e7eee9;
  border-color: #3a5248;
}
</style>

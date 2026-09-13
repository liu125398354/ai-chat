<!--
  @file ConversationSidebar.vue
  @author liunannan
  @date 2026-09-13
  @description 会话列表侧栏：新对话、滚动列表、改密与退出
-->
<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  currentId: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  username: { type: String, default: '' },
});

defineEmits(['new', 'select', 'delete', 'logout', 'change-password']);
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
        <button type="button" class="conv-btn" @click="$emit('select', item.id)">
          {{ item.title }}
        </button>
        <a-button type="link" danger size="small" @click="$emit('delete', item.id)">
          删
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
}
.conv-list li.active .conv-btn {
  background: #3a5248;
}
.conv-btn {
  flex: 1;
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
</style>

<!--
  @file EmptyFrame.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-14
  @description 空态：空对话气泡，表示还没有内容
-->

<template>
  <div class="empty-frame" aria-hidden="true">
    <svg class="empty-icon" viewBox="0 0 72 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="8"
        y="6"
        width="56"
        height="38"
        rx="10"
        stroke="currentColor"
        stroke-width="2.2"
      />
      <path
        d="M24 44 L18 56 L36 44"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <circle cx="26" cy="25" r="2.4" fill="currentColor" opacity="0.28" />
      <circle cx="36" cy="25" r="2.4" fill="currentColor" opacity="0.28" />
      <circle cx="46" cy="25" r="2.4" fill="currentColor" opacity="0.28" />
    </svg>
  </div>
</template>

<style scoped>
.empty-frame {
  display: flex;
  justify-content: center;
  margin: 0 auto 8px;
  color: var(--empty-icon, rgba(215, 220, 240, 0.78));
}
.empty-icon {
  display: block;
  width: 72px;
  height: 64px;
}
</style>

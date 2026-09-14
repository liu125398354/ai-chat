<!--
  @file BrandMark.vue
  @author liunannan
  @date 2026-09-14
  @description 品牌标：夜窗几何 + 一枚信号点，不作吉祥物
-->

<template>
  <svg
    class="brand-mark"
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
    <path d="M9 9h14v14H9z" stroke="#fff" stroke-width="1.4" />
    <path d="M16 9v14M9 16h14" stroke="#fff" stroke-width="1.2" />
    <circle cx="21.5" cy="12.5" r="2.1" fill="var(--color-signal)" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 28 });
</script>

<style scoped>
.brand-mark {
  display: block;
  flex-shrink: 0;
}
</style>

<!--
  @file EmptyFrame.vue
  @author liunannan
  @date 2026-09-13
  @description 空态细线矩形与两只角线，不作插画
-->
<template>
  <div class="empty-frame" aria-hidden="true">
    <span class="empty-box" />
  </div>
</template>

<style scoped>
.empty-frame {
  display: flex;
  justify-content: center;
  margin: 0 auto 8px;
}
.empty-box {
  position: relative;
  width: 48px;
  height: 32px;
  border: 1px solid var(--empty-line, var(--color-line-strong));
  border-radius: 2px;
}
.empty-box::before,
.empty-box::after {
  content: "";
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: var(--color-brand);
  border-style: solid;
  pointer-events: none;
}
.empty-box::before {
  top: -1px;
  left: -1px;
  border-width: 1px 0 0 1px;
}
.empty-box::after {
  right: -1px;
  bottom: -1px;
  border-width: 0 1px 1px 0;
}
</style>

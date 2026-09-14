<!--
  @file App.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-13
  @description 根组件：Ant Design 中文语言包、主题与路由出口
-->

<template>
  <a-config-provider
    :locale="zhCN"
    :theme="{
      token: {
        colorPrimary: '#3B5BDB',
        borderRadius: 8,
      },
    }"
  >
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN';
</script>

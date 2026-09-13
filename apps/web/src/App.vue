<!--
  @file App.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-13
  @description 根组件：Ant Design 中文语言包、主题与路由出口
-->
<script setup>
import zhCN from 'ant-design-vue/es/locale/zh_CN';
</script>

<template>
  <a-config-provider
    :locale="zhCN"
    :theme="{
      token: {
        colorPrimary: '#1f6f5b',
        borderRadius: 8,
      },
    }"
  >
    <router-view />
  </a-config-provider>
</template>

/**
 * @file main.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description Web 入口：Pinia + 路由；Antd 按路由注册以免撑大首包
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { ConfigProvider } from 'ant-design-vue';
import App from './App.vue';
import router from './router';
import 'ant-design-vue/dist/reset.css';
import './styles/base.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ConfigProvider);
app.mount('#app');

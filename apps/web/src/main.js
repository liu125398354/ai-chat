/**
 * @file main.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-13
 * @description Web 入口：Pinia + 路由 + ant-design-vue
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import App from './App.vue';
import router from './router';
import 'ant-design-vue/dist/reset.css';
import './styles/base.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(Antd);
app.mount('#app');

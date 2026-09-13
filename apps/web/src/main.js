/**
 * @file main.js
 * @author liunannan
 * @date 2026-09-13
 * @description Web 入口：Pinia + 路由
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/base.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

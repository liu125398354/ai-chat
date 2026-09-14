/**
 * @file main.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description Web 入口：Pinia + 路由 + 按需注册 ant-design-vue
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import {
  Alert,
  Button,
  Card,
  ConfigProvider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Skeleton,
} from 'ant-design-vue';
import App from './App.vue';
import router from './router';
import 'ant-design-vue/dist/reset.css';
import './styles/base.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(Alert);
app.use(Button);
app.use(Card);
app.use(ConfigProvider);
app.use(Drawer);
app.use(Dropdown);
app.use(Empty);
app.use(Form);
app.use(Input);
app.use(Layout);
app.use(Menu);
app.use(Modal);
app.use(Skeleton);
app.mount('#app');

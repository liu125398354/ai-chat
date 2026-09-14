/**
 * @file antd-workbench.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 工作台才注册的 Antd 组件，避免登录首包带上 Layout/Menu/Modal
 */
import {
  Alert,
  Button,
  Card,
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
import type { App } from 'vue';

let registered = false;

/** 在 ChatView setup 里调用一次；直达 /chat 时也要带上登录同款表单组件。 */
export function registerWorkbenchAntd(app: App | undefined) {
  if (registered || !app) return;
  registered = true;
  app.use(Alert);
  app.use(Button);
  app.use(Card);
  app.use(Drawer);
  app.use(Dropdown);
  app.use(Empty);
  app.use(Form);
  app.use(Input);
  app.use(Layout);
  app.use(Menu);
  app.use(Modal);
  app.use(Skeleton);
}

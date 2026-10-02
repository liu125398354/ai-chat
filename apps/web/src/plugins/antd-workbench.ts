/**
 * @file antd-workbench.ts
 * @author liunannan
 * @date 2026-09-14
 * @updated 2026-10-02
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
import { useAntdOnce } from './antd-once';

let registered = false;

/** 在 ChatView setup 里调用一次；直达 /chat 时也要带上登录同款表单组件。已由登录页装过的组件会跳过。 */
export function registerWorkbenchAntd(app: App | undefined) {
  if (registered || !app) return;
  registered = true;
  useAntdOnce(app, [
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
  ]);
}

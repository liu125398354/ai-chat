/**
 * @file antd-login.ts
 * @author liunannan
 * @date 2026-09-14
 * @updated 2026-10-02
 * @description 登录/注册页 Antd 组件，不打进入口，与工作台共用部分由 Rollup 抽共享块
 */
import { Alert, Button, Card, Form, Input } from 'ant-design-vue';
import type { App } from 'vue';
import { useAntdOnce } from './antd-once';

let registered = false;

export function registerLoginAntd(app: App | undefined) {
  if (registered || !app) return;
  registered = true;
  useAntdOnce(app, [Alert, Button, Card, Form, Input]);
}

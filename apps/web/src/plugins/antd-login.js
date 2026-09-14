/**
 * @file antd-login.js
 * @author liunannan
 * @date 2026-09-14
 * @description 登录/注册页 Antd 组件，不打进入口，与工作台共用部分由 Rollup 抽共享块
 */
import { Alert, Button, Card, Form, Input } from 'ant-design-vue';

let registered = false;

export function registerLoginAntd(app) {
  if (registered || !app) return;
  registered = true;
  app.use(Alert);
  app.use(Button);
  app.use(Card);
  app.use(Form);
  app.use(Input);
}

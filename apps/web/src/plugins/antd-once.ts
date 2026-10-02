/**
 * @file antd-once.ts
 * @author liunannan
 * @date 2026-10-02
 * @description 按插件对象去重 app.use，登录页与工作台共用同一批 Antd 组件时不再重复安装
 */
import type { App, Plugin } from 'vue';

const installed = new WeakSet<object>();

/** 同一组件只安装一次，避免 Vue 警告 Plugin has already been applied。 */
export function useAntdOnce(app: App, plugins: Plugin[]) {
  for (const plugin of plugins) {
    if (installed.has(plugin)) continue;
    installed.add(plugin);
    app.use(plugin);
  }
}

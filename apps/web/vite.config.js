/**
 * @file vite.config.js
 * @author liunannan
 * @date 2026-09-13
 * @description Vite：别名 @ → src，开发代理 /api → API 3000
 */
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        timeout: 125000,
        proxyTimeout: 125000,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});

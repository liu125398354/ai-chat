/**
 * @file vite.config.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description Vite：生产关闭 sourcemap、开发代理 /api（SSE 关缓冲）
 */
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const qianfanTimeoutMs = Number(process.env.QIANFAN_TIMEOUT_MS) || 120000;
const proxyTimeout = qianfanTimeoutMs + 5000;

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [vue()],
  build: {
    sourcemap: false,
  },
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
        timeout: proxyTimeout,
        proxyTimeout,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure(proxy) {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            const ct = String(proxyRes.headers['content-type'] || '');
            if (ct.includes('text/event-stream')) {
              res.setHeader('Cache-Control', 'no-cache, no-transform');
              res.setHeader('X-Accel-Buffering', 'no');
            }
          });
        },
      },
    },
  },
});

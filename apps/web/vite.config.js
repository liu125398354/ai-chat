/**
 * @file vite.config.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description Vite：分包、关掉 sourcemap、开发代理 /api（SSE 关缓冲）
 */
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const qianfanTimeoutMs = Number(process.env.QIANFAN_TIMEOUT_MS) || 120000;
const proxyTimeout = qianfanTimeoutMs + 5000;

/**
 * 登录与工作台都依赖 Vue 运行时，单独成包便于长期缓存。
 * Markdown/KaTeX/hljs 只随 Chat 拉取；不要把整个 ant-design-vue 打进同一 named chunk，
 * 否则 Layout 等会并入登录首包。
 */
function manualChunks(id) {
  const n = id.replace(/\\/g, '/');
  if (!n.includes('node_modules')) return undefined;
  if (
    n.includes('/katex/') ||
    n.includes('/markdown-it/') ||
    n.includes('/highlight.js/') ||
    n.includes('/dompurify/') ||
    n.includes('/github-markdown-css/')
  ) {
    return 'markdown';
  }
  if (n.includes('/vue-router/') || n.includes('/pinia/') || n.includes('/@vue/') || /\/vue\/dist\//.test(n)) {
    return 'vue';
  }
  return undefined;
}

/** 现代浏览器走 woff2；去掉 KaTeX ttf 减小镜像，CSS 仍保留 woff 回退。 */
function omitKatexTtf() {
  return {
    name: 'omit-katex-ttf',
    generateBundle(_opts, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (/KaTeX_.*\.ttf$/.test(fileName)) {
          delete bundle[fileName];
        }
      }
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [vue(), omitKatexTtf()],
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: { manualChunks },
    },
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

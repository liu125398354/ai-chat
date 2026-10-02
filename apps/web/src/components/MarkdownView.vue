<!--
  @file MarkdownView.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-10-02
  @description 助手 Markdown：KaTeX 公式 + GitHub 风格 + 代码复制 + 已闭合 mermaid 图表；流式跳过 KaTeX 并在末字后渲染品牌色闪烁光标
-->

<template>
  <div class="md-wrap">
    <div ref="bodyRef" class="md-body markdown-body" v-html="html" @click="onBodyClick" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import DOMPurify from 'dompurify';
import { markdown as md, markdownLive } from '@/utils/markdown';
import { closedMermaidBodies } from '@/utils/mermaid-fence';
import { copyText } from '@/utils/clipboard';
import 'katex/dist/katex.min.css';
import 'github-markdown-css/github-markdown-light.css';
import 'highlight.js/styles/github.min.css';

let katexHooked = false;

function ensureKatexPurifyHook() {
  if (katexHooked) return;
  katexHooked = true;
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName !== 'style') return;
    const el = node as Element;
    const inKatex =
      el.classList?.contains('katex') ||
      (typeof el.closest === 'function' && el.closest('.katex'));
    if (inKatex) {
      data.forceKeepAttr = true;
    }
  });
}

const props = defineProps({
  source: { type: String, default: '' },
  live: { type: Boolean, default: false },
});
const displaySource = ref(props.source);
const bodyRef = ref<HTMLElement | null>(null);
const svgCache = new Map<string, string>();
let paintTicket = 0;
let mermaidSeq = 0;
let mermaidApi: typeof import('mermaid').default | null = null;

/** 按需加载 mermaid，避免没有图表的会话把库打进首屏。 */
async function loadMermaid() {
  if (!mermaidApi) {
    const mod = await import('mermaid');
    mermaidApi = mod.default;
    mermaidApi.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      htmlLabels: false,
      suppressErrorRendering: true,
      logLevel: 'fatal',
    });
  }
  return mermaidApi;
}

function sanitizeSvg(svg: string) {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

function markMermaid(block: HTMLElement, state: 'pending' | 'error' | 'ready') {
  block.classList.toggle('is-pending', state === 'pending');
  block.classList.toggle('is-error', state === 'error');
  block.classList.toggle('is-ready', state === 'ready');
}

/**
 * 把已闭合的 mermaid 围栏画成 SVG。流式中未闭合的围栏保持源码，避免半截语法反复报错。
 */
async function paintDiagrams() {
  const ticket = ++paintTicket;
  const root = bodyRef.value;
  if (!root) return;
  const blocks = [...root.querySelectorAll<HTMLElement>('.mermaid-block')];
  if (!blocks.length) return;
  const closed = new Set(closedMermaidBodies(displaySource.value || ''));
  const api = await loadMermaid();
  if (ticket !== paintTicket || !bodyRef.value) return;

  for (const block of blocks) {
    if (ticket !== paintTicket) return;
    const raw = block.querySelector('.mermaid-src code')?.textContent ?? '';
    const view = block.querySelector<HTMLElement>('.mermaid-view');
    if (!view) continue;
    const ready = !props.live || closed.has(raw);
    if (!ready) {
      markMermaid(block, 'pending');
      view.replaceChildren();
      continue;
    }
    let svg = svgCache.get(raw);
    if (!svg) {
      try {
        const parsed = await api.parse(raw, { suppressErrors: true });
        if (ticket !== paintTicket) return;
        if (!parsed) {
          markMermaid(block, props.live ? 'pending' : 'error');
          view.replaceChildren();
          continue;
        }
        const rendered = await api.render(`mmd-${Date.now().toString(36)}-${++mermaidSeq}`, raw);
        if (ticket !== paintTicket) return;
        svg = sanitizeSvg(rendered.svg);
        if (!svg.includes('<svg')) {
          markMermaid(block, props.live ? 'pending' : 'error');
          view.replaceChildren();
          continue;
        }
        svgCache.set(raw, svg);
        if (svgCache.size > 32) {
          const oldest = svgCache.keys().next().value;
          if (oldest) svgCache.delete(oldest);
        }
      } catch {
        markMermaid(block, props.live ? 'pending' : 'error');
        view.replaceChildren();
        continue;
      }
    }
    view.innerHTML = svg;
    markMermaid(block, 'ready');
  }
}
let raf = 0;
let copiedTimer = 0;

function paint() {
  displaySource.value = props.source;
  raf = 0;
}

watch(
  () => [props.source, props.live],
  () => {
    if (!props.live) {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      displaySource.value = props.source;
      return;
    }
    if (raf) return;
    raf = requestAnimationFrame(paint);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  paintTicket += 1;
  if (raf) cancelAnimationFrame(raf);
  if (copiedTimer) window.clearTimeout(copiedTimer);
});

const VOID_TAGS = new Set(['HR', 'BR', 'IMG']);

/**
 * 取最后一个可插入行内节点的宿主，让流式光标跟在末字后。
 */
function lastInlineHost(root: HTMLElement) {
  let node: Node = root;
  while (node?.nodeType === 1) {
    const el = node as HTMLElement;
    const kids = [...el.childNodes].filter((child) => {
      if (child.nodeType === 1 && (child as HTMLElement).classList?.contains('caret')) return false;
      if (child.nodeType === 3 && !child.textContent?.trim()) return false;
      return true;
    });
    if (!kids.length) return el;
    const last = kids[kids.length - 1];
    if (last.nodeType === Node.TEXT_NODE) return el;
    if (last.nodeType === Node.ELEMENT_NODE) {
      if ((last as HTMLElement).classList?.contains('mermaid-block')) return el;
      if (VOID_TAGS.has((last as HTMLElement).tagName)) return el;
      node = last;
      continue;
    }
    return el;
  }
  return root;
}

/** 把闪烁光标插进消毒后的 HTML 末字后面，与 v-html 同一拍更新。 */
function withLiveCaret(html: string) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html || '';
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.setAttribute('aria-hidden', 'true');
  lastInlineHost(wrap).appendChild(caret);
  return wrap.innerHTML;
}

const html = computed(() => {
  ensureKatexPurifyHook();
  const engine = props.live ? markdownLive : md;
  const sanitized = DOMPurify.sanitize(engine.render(displaySource.value || ''), {
    USE_PROFILES: { html: true, mathMl: true },
    ADD_ATTR: ['class', 'style', 'aria-hidden', 'aria-label', 'type', 'encoding'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
  return props.live ? withLiveCaret(sanitized) : sanitized;
});

onMounted(() => {
  void paintDiagrams();
});

watch(html, () => {
  void paintDiagrams();
}, { flush: 'post' });

/** 代码块「复制」走事件委托，避免把源码放进属性。 */
async function onBodyClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const btn = target?.closest?.('.code-copy');
  if (!btn || !(event.currentTarget as HTMLElement).contains(btn)) return;
  event.preventDefault();
  const block = btn.closest('.code-block');
  const text = block?.querySelector('pre')?.innerText ?? '';
  const ok = await copyText(text);
  if (!ok) return;
  btn.textContent = '已复制';
  if (copiedTimer) window.clearTimeout(copiedTimer);
  copiedTimer = window.setTimeout(() => {
    btn.textContent = '复制';
    copiedTimer = 0;
  }, 1500);
}
</script>

<style scoped>
.md-wrap {
  position: relative;
  min-width: 0;
}
.md-body {
  background: transparent !important;
  color: inherit;
  font-size: var(--fs-message);
  line-height: 1.65;
  max-width: none;
}
.md-body :deep(.katex),
.md-body :deep(.katex *) {
  box-sizing: content-box;
}
.md-body :deep(.katex) {
  display: inline-block;
  vertical-align: middle;
  overflow: visible;
  font-size: 1.21em;
  line-height: 1.2;
  text-indent: 0;
}
.md-body :deep(.katex-display-wrap) {
  overflow-x: auto;
  overflow-y: hidden;
  margin: 0.8em 0;
  text-align: center;
}
.md-body :deep(.katex-display) {
  display: block;
  margin: 0.4em 0;
}
.md-body :deep(.katex-html) {
  overflow: visible;
}
.md-body :deep(.code-block) {
  position: relative;
  margin: 0.8em 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-paper);
}
.md-body :deep(.code-head) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--color-paper);
  border-bottom: 1px solid var(--color-line);
  font-size: var(--fs-small);
  color: var(--color-ink-secondary);
}
.md-body :deep(.code-copy) {
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  background: var(--color-paper-raised);
  color: var(--color-ink);
  font-size: var(--fs-small);
  line-height: 1;
  padding: 3px 8px;
  cursor: pointer;
}
.md-body :deep(.code-copy:hover) {
  background: var(--color-brand-soft);
}
.md-body :deep(.code-block pre) {
  margin: 0;
  padding: 12px 14px;
  overflow: auto;
  background: var(--color-paper);
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.md-body :deep(.code-block pre:hover) {
  scrollbar-color: rgba(31, 35, 40, 0.28) transparent;
}
.md-body :deep(.code-block pre)::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.md-body :deep(.code-block pre)::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 8px;
}
.md-body :deep(.code-block pre:hover)::-webkit-scrollbar-thumb {
  background: rgba(31, 35, 40, 0.28);
}
.md-body :deep(.code-block code.hljs) {
  background: transparent;
  padding: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-secondary);
}
.md-body :deep(.mermaid-block) {
  margin: 0.8em 0;
  overflow-x: auto;
}
.md-body :deep(.mermaid-src) {
  display: none;
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-paper);
  overflow: auto;
  font-family: var(--font-mono);
  font-size: var(--fs-secondary);
  white-space: pre-wrap;
}
.md-body :deep(.mermaid-block.is-pending .mermaid-src),
.md-body :deep(.mermaid-block.is-error .mermaid-src) {
  display: block;
}
.md-body :deep(.mermaid-view svg) {
  max-width: 100%;
  height: auto;
}
.md-body :deep(.mermaid-block.is-error .mermaid-view)::before {
  content: '这张图还不能绘制';
  display: block;
  margin-bottom: 8px;
  color: var(--color-ink-secondary);
  font-size: var(--fs-small);
}
/* 流式光标：8px 品牌色块，1s 阶梯闪烁；reduced-motion 下静态常驻 */
.md-body :deep(.caret) {
  display: inline-block;
  width: 8px;
  height: 1em;
  margin-left: 2px;
  border-radius: 1px;
  background: var(--color-brand);
  animation: caret-blink 1s step-end infinite;
  vertical-align: -0.12em;
}
@keyframes caret-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .md-body :deep(.caret) {
    animation: none;
    opacity: 1;
  }
}
</style>

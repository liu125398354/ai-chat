<!--
  @file MarkdownView.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-13
  @description 助手 Markdown：KaTeX 公式 + GitHub 风格 + 代码复制；消毒后 v-html
-->
<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import DOMPurify from 'dompurify';
import { markdown as md } from '@/utils/markdown';
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
    const inKatex =
      node.classList?.contains('katex') ||
      (typeof node.closest === 'function' && node.closest('.katex'));
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
  if (raf) cancelAnimationFrame(raf);
  if (copiedTimer) window.clearTimeout(copiedTimer);
});

const VOID_TAGS = new Set(['HR', 'BR', 'IMG']);

/**
 * 取最后一个可插入行内节点的宿主，让流式光标跟在末字后。
 */
function lastInlineHost(root) {
  let node = root;
  while (node?.nodeType === 1) {
    const kids = [...node.childNodes].filter((child) => {
      if (child.nodeType === 1 && child.classList?.contains('caret')) return false;
      if (child.nodeType === 3 && !child.textContent.trim()) return false;
      return true;
    });
    if (!kids.length) return node;
    const last = kids[kids.length - 1];
    if (last.nodeType === Node.TEXT_NODE) return node;
    if (last.nodeType === Node.ELEMENT_NODE) {
      if (VOID_TAGS.has(last.tagName)) return node;
      node = last;
      continue;
    }
    return node;
  }
  return root;
}

/** 把闪烁光标插进消毒后的 HTML 末字后面，与 v-html 同一拍更新。 */
function withLiveCaret(html) {
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
  const sanitized = DOMPurify.sanitize(md.render(displaySource.value || ''), {
    USE_PROFILES: { html: true, mathMl: true },
    ADD_ATTR: ['class', 'style', 'aria-hidden', 'aria-label', 'type', 'encoding'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
  return props.live ? withLiveCaret(sanitized) : sanitized;
});

/** 代码块「复制」走事件委托，避免把源码放进属性。 */
async function onBodyClick(event) {
  const btn = event.target.closest?.('.code-copy');
  if (!btn || !event.currentTarget.contains(btn)) return;
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

<template>
  <div class="md-wrap">
    <div class="md-body markdown-body" v-html="html" @click="onBodyClick" />
  </div>
</template>

<style scoped>
.md-wrap {
  position: relative;
  min-width: 0;
}
.md-body {
  background: transparent !important;
  color: inherit;
  font-size: 15px;
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
  border: 1px solid #d0d7de;
  border-radius: 8px;
  overflow: hidden;
  background: #f6f8fa;
}
.md-body :deep(.code-head) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f3f4f6;
  border-bottom: 1px solid #d0d7de;
  font-size: 12px;
  color: #656d76;
}
.md-body :deep(.code-copy) {
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #fff;
  color: #1f2328;
  font-size: 12px;
  line-height: 1;
  padding: 3px 8px;
  cursor: pointer;
}
.md-body :deep(.code-copy:hover) {
  background: #f6f8fa;
}
.md-body :deep(.code-block pre) {
  margin: 0;
  padding: 12px 14px;
  overflow: auto;
  background: #f6f8fa;
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
  font-size: 13px;
}
.md-body :deep(.caret) {
  display: inline-block;
  width: 7px;
  height: 1em;
  margin-left: 2px;
  background: #1f6f5b;
  animation: blink 1s step-end infinite;
  vertical-align: -0.1em;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>

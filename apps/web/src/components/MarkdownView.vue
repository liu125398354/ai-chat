<!--
  @file MarkdownView.vue
  @author liunannan
  @date 2026-09-13
  @updated 2026-09-13
  @description 助手 Markdown：markdown-it → DOMPurify；流式用 rAF 贴合 delta
-->
<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import 'highlight.js/styles/github.min.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);

const props = defineProps({
  source: { type: String, default: '' },
  live: { type: Boolean, default: false },
});

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return md.utils.escapeHtml(code);
  },
});

const displaySource = ref(props.source);
let raf = 0;

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
});

const html = computed(() =>
  DOMPurify.sanitize(md.render(displaySource.value || ''), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  }),
);
</script>

<template>
  <div class="md-wrap">
    <div class="md-body" v-html="html" />
    <span v-if="live" class="caret" aria-hidden="true" />
  </div>
</template>

<style scoped>
.md-wrap {
  position: relative;
}
.md-body :deep(pre) {
  overflow: auto;
  padding: 12px;
  border-radius: 8px;
  background: #1e2430;
  color: #e8edf5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}
.md-body :deep(a) {
  color: #2f6f5e;
}
.md-body :deep(p) {
  margin: 0.4em 0;
}
.md-body :deep(ul),
.md-body :deep(ol) {
  padding-left: 1.2em;
}
.caret {
  display: inline-block;
  width: 7px;
  height: 1em;
  margin-left: 2px;
  background: #1f6f5b;
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
}
@keyframes blink {
  50% { opacity: 0; }
}
</style>

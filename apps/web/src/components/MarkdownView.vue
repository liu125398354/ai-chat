<!--
  @file MarkdownView.vue
  @author liunannan
  @date 2026-09-13
  @description 助手 Markdown：markdown-it → DOMPurify 后才 v-html
-->
<script setup>
import { computed } from 'vue';
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

const html = computed(() =>
  DOMPurify.sanitize(md.render(props.source || ''), {
    USE_PROFILES: { html: true },
  }),
);
</script>

<template>
  <div class="md-body" v-html="html" />
</template>

<style scoped>
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
</style>

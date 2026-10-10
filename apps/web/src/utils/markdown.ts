/**
 * @file markdown.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-10-10
 * @description 创建带 KaTeX、代码高亮、代码块工具条与 mermaid 图表卡片的 markdown-it 实例
 */
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import latex from 'highlight.js/lib/languages/latex';
import markdownLang from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import type { LanguageFn } from 'highlight.js';
import type { Token } from 'markdown-it';
import { markdownItKatex } from './markdown-it-katex';
import { mermaidFenceBody } from './mermaid-fence';

const HLJS_LANGS: Record<string, LanguageFn> = {
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  dockerfile,
  go,
  java,
  javascript,
  json,
  kotlin,
  latex,
  markdown: markdownLang,
  php,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml,
};

for (const [name, def] of Object.entries(HLJS_LANGS)) {
  hljs.registerLanguage(name, def);
}
hljs.registerLanguage('tex', latex);

const LANG_ALIAS: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  html: 'xml',
  vue: 'xml',
  cplusplus: 'cpp',
  'c++': 'cpp',
  cs: 'csharp',
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightCode(code: string, lang: string) {
  const key = LANG_ALIAS[lang] || lang;
  try {
    if (key && hljs.getLanguage(key)) {
      return hljs.highlight(code, { language: key, ignoreIllegals: true }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
}

/** mermaid 围栏只放转义后的源码，真正绘图在消毒之后进行。 */
function renderMermaidFence(content: string) {
  const body = escapeHtml(mermaidFenceBody(content));
  return (
    `<div class="mermaid-block">` +
    `<div class="mermaid-head"><span class="mermaid-label">图表</span></div>` +
    `<pre class="mermaid-src"><code>${body}</code></pre>` +
    `<div class="mermaid-view" role="img" aria-label="Mermaid 图表"></div>` +
    `</div>\n`
  );
}

/** 代码围栏外包一层，供点击复制；mermaid 改为图表占位；不高亮失败时回退转义。 */
function renderFence(md: MarkdownIt) {
  return (tokens: Token[], idx: number) => {
    const token = tokens[idx];
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
    const lang = info.split(/\s+/g)[0] || '';
    if (lang.toLowerCase() === 'mermaid') {
      return renderMermaidFence(token.content);
    }
    const highlighted = highlightCode(token.content, lang);
    const label = escapeHtml(lang || 'code');
    return (
      `<div class="code-block">` +
      `<div class="code-head"><span class="code-lang">${label}</span>` +
      `<button type="button" class="code-copy">复制</button></div>` +
      `<pre><code class="hljs">${highlighted}</code></pre>` +
      `</div>\n`
    );
  };
}

const MATH_ENV =
  /(?:^|\n)([ \t]*)\\begin\{(pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|matrix|smallmatrix|cases|aligned|align\*?|equation\*?|gather\*?)\}([\s\S]*?)\\end\{\2\}/g;

/**
 * 模型常直接输出 \\begin{vmatrix} 而不加 $$；已在公式环境内则跳过。
 */
export function wrapBareMathEnvs(src: string) {
  return src.replace(MATH_ENV, (full, indent: string, env: string, body: string, offset: number) => {
    const before = src.slice(0, offset);
    if ((before.match(/\$\$/g) || []).length % 2 === 1) return full;
    if (/\\\[\s*$/.test(before)) return full;
    return `\n${indent}$$\\begin{${env}}${body}\\end{${env}}$$\n`;
  });
}

export function createMarkdown(options: { katex?: boolean } = {}) {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
    typographer: false,
  });
  if (options.katex !== false) {
    md.use(markdownItKatex);
  }
  md.renderer.rules.fence = renderFence(md);
  const orig = md.render.bind(md);
  md.render = (src: string, env?: unknown) => orig(wrapBareMathEnvs(src || ''), env);
  return md;
}

export const markdown = createMarkdown();
/** 流式预览：跳过 KaTeX，降低未闭合 $$ / 围栏时的 CPU。 */
export const markdownLive = createMarkdown({ katex: false });

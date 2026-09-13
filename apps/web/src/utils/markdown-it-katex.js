/**
 * @file markdown-it-katex.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-13
 * @description markdown-it 插件：宽松解析 $...$ / $$...$$ / \\(...\\) / \\[...\\] 为 KaTeX
 */
import katex from 'katex';

const KATEX_OPTS = {
  throwOnError: false,
  strict: 'ignore',
  output: 'html',
  minRuleThickness: 0.04,
};

const DISPLAY_ENV =
  /\\begin\{(pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|matrix|smallmatrix|cases|aligned|align\*?|equation\*?|gather\*?)\}/;

function renderKatex(tex, displayMode) {
  const src = tex.trim();
  const display = displayMode || DISPLAY_ENV.test(src);
  try {
    return katex.renderToString(src, { ...KATEX_OPTS, displayMode: display });
  } catch {
    const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<code>${esc}</code>`;
  }
}

function isEscaped(src, pos) {
  let n = 0;
  while (pos - n - 1 >= 0 && src.charCodeAt(pos - n - 1) === 0x5c) n += 1;
  return n % 2 === 1;
}

function mathInline(state, silent) {
  const start = state.pos;
  if (state.src.charCodeAt(start) !== 0x24) return false;
  if (isEscaped(state.src, start)) return false;
  const display = state.src.charCodeAt(start + 1) === 0x24;
  const openLen = display ? 2 : 1;

  let close = -1;
  for (let i = start + openLen; i < state.posMax; i += 1) {
    if (state.src.charCodeAt(i) !== 0x24) continue;
    if (isEscaped(state.src, i)) continue;
    if (display) {
      if (state.src.charCodeAt(i + 1) === 0x24) {
        close = i;
        break;
      }
    } else if (state.src.charCodeAt(i + 1) !== 0x24) {
      close = i;
      break;
    }
  }
  if (close < 0) return false;
  const content = state.src.slice(start + openLen, close).trim();
  if (!content) return false;
  if (!silent) {
    const token = state.push(display ? 'math_display' : 'math_inline', 'math', 0);
    token.content = content;
    token.markup = display ? '$$' : '$';
  }
  state.pos = close + openLen;
  return true;
}

function mathBlock(state, start, end, silent) {
  const pos = state.bMarks[start] + state.tShift[start];
  const max = state.eMarks[start];
  if (pos + 1 >= max) return false;
  if (state.src.slice(pos, pos + 2) !== '$$') return false;
  let next = start;
  let closed = false;
  let content = state.src.slice(pos + 2, max);
  if (content.trim().endsWith('$$')) {
    content = content.trim().slice(0, -2);
    closed = true;
  } else {
    while (next < end) {
      next += 1;
      if (next >= end) break;
      const lineStart = state.bMarks[next] + state.tShift[next];
      const lineEnd = state.eMarks[next];
      const line = state.src.slice(lineStart, lineEnd);
      if (line.trim() === '$$') {
        closed = true;
        break;
      }
      content += `\n${line}`;
    }
  }
  if (!closed) return false;
  if (silent) return true;
  const token = state.push('math_block', 'math', 0);
  token.content = content.trim();
  token.markup = '$$';
  token.map = [start, next + 1];
  token.block = true;
  state.line = next + 1;
  return true;
}

function mathParenInline(state, silent) {
  if (state.src.slice(state.pos, state.pos + 2) !== '\\(') return false;
  const end = state.src.indexOf('\\)', state.pos + 2);
  if (end < 0) return false;
  const content = state.src.slice(state.pos + 2, end).trim();
  if (!content) return false;
  if (!silent) {
    const token = state.push('math_inline', 'math', 0);
    token.content = content;
    token.markup = '\\(';
  }
  state.pos = end + 2;
  return true;
}

function mathBracketInline(state, silent) {
  if (state.src.slice(state.pos, state.pos + 2) !== '\\[') return false;
  const end = state.src.indexOf('\\]', state.pos + 2);
  if (end < 0) return false;
  const content = state.src.slice(state.pos + 2, end).trim();
  if (!content) return false;
  if (!silent) {
    const token = state.push('math_block', 'math', 0);
    token.content = content;
    token.markup = '\\[';
    token.block = true;
  }
  state.pos = end + 2;
  return true;
}

function mathBracketBlock(state, start, end, silent) {
  const pos = state.bMarks[start] + state.tShift[start];
  const max = state.eMarks[start];
  const first = state.src.slice(pos, max);
  if (!first.trimStart().startsWith('\\[')) return false;
  let next = start;
  let closed = false;
  let content = '';
  const inlineEnd = first.indexOf('\\]');
  if (inlineEnd >= 0) {
    content = first.slice(first.indexOf('\\[') + 2, inlineEnd);
    closed = true;
  } else {
    content = first.slice(first.indexOf('\\[') + 2);
    while (next < end) {
      next += 1;
      if (next >= end) break;
      const line = state.src.slice(state.bMarks[next] + state.tShift[next], state.eMarks[next]);
      const closeAt = line.indexOf('\\]');
      if (closeAt >= 0) {
        content += `\n${line.slice(0, closeAt)}`;
        closed = true;
        break;
      }
      content += `\n${line}`;
    }
  }
  if (!closed) return false;
  if (silent) return true;
  const token = state.push('math_block', 'math', 0);
  token.content = content.trim();
  token.markup = '\\[';
  token.map = [start, next + 1];
  token.block = true;
  state.line = next + 1;
  return true;
}

/** @param {import('markdown-it')} md */
export function markdownItKatex(md) {
  md.inline.ruler.before('escape', 'math_paren', mathParenInline);
  md.inline.ruler.before('escape', 'math_bracket_inline', mathBracketInline);
  md.inline.ruler.after('backticks', 'math_inline', mathInline);
  md.block.ruler.before('fence', 'math_block', mathBlock, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });
  md.block.ruler.before('fence', 'math_bracket', mathBracketBlock, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });
  md.renderer.rules.math_inline = (tokens, idx) => {
    const tex = tokens[idx].content;
    const html = renderKatex(tex, false);
    if (DISPLAY_ENV.test(tex.trim())) {
      return `<div class="katex-display-wrap">${html}</div>`;
    }
    return html;
  };
  md.renderer.rules.math_display = (tokens, idx) =>
    `<div class="katex-display-wrap">${renderKatex(tokens[idx].content, true)}</div>\n`;
  md.renderer.rules.math_block = (tokens, idx) =>
    `<div class="katex-display-wrap">${renderKatex(tokens[idx].content, true)}</div>\n`;
}

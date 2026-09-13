/**
 * @file markdown-it-katex.js
 * @author liunannan
 * @date 2026-09-13
 * @description markdown-it 插件：渲染 $...$ / $$...$$ / \\(...\\) / \\[...\\] 为 KaTeX
 */
import katex from 'katex';

const KATEX_OPTS = {
  throwOnError: false,
  strict: 'ignore',
  output: 'html',
};

function renderKatex(tex, displayMode) {
  try {
    return katex.renderToString(tex, { ...KATEX_OPTS, displayMode });
  } catch {
    const esc = tex.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<code>${esc}</code>`;
  }
}

function isValidDollar(state, pos) {
  const max = state.posMax;
  const prev = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
  const next = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;
  if (prev === 0x5c) return false;
  if (next === 0x20 || next === 0x09) return { canOpen: false, canClose: true };
  if (prev === 0x20 || prev === 0x09 || prev === -1) return { canOpen: true, canClose: false };
  return { canOpen: true, canClose: true };
}

function mathInline(state, silent) {
  if (state.src[state.pos] !== '$') return false;
  if (state.src[state.pos + 1] === '$') return false;
  const valid = isValidDollar(state, state.pos);
  if (!valid.canOpen) {
    if (!silent) state.pending += '$';
    state.pos += 1;
    return true;
  }
  let pos = state.pos + 1;
  let found = false;
  while (pos < state.posMax) {
    if (state.src[pos] === '$' && state.src[pos - 1] !== '\\') {
      const close = isValidDollar(state, pos);
      if (close.canClose) {
        found = true;
        break;
      }
    }
    pos += 1;
  }
  if (!found) {
    if (!silent) state.pending += '$';
    state.pos += 1;
    return true;
  }
  if (!silent) {
    const token = state.push('math_inline', 'math', 0);
    token.content = state.src.slice(state.pos + 1, pos);
    token.markup = '$';
  }
  state.pos = pos + 1;
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
  if (!silent) {
    const token = state.push('math_inline', 'math', 0);
    token.content = state.src.slice(state.pos + 2, end);
    token.markup = '\\(';
  }
  state.pos = end + 2;
  return true;
}

function mathBracketBlock(state, start, end, silent) {
  const pos = state.bMarks[start] + state.tShift[start];
  const max = state.eMarks[start];
  const open = state.src.slice(pos, max).trimStart();
  if (!open.startsWith('\\[')) return false;
  let next = start;
  let closed = false;
  let content = '';
  const first = state.src.slice(pos, max);
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
  md.inline.ruler.after('backticks', 'math_inline', mathInline);
  md.inline.ruler.after('math_inline', 'math_paren', mathParenInline);
  md.block.ruler.before('fence', 'math_block', mathBlock, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });
  md.block.ruler.before('fence', 'math_bracket', mathBracketBlock, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });
  md.renderer.rules.math_inline = (tokens, idx) => renderKatex(tokens[idx].content, false);
  md.renderer.rules.math_block = (tokens, idx) =>
    `<div class="katex-display-wrap">${renderKatex(tokens[idx].content, true)}</div>\n`;
}

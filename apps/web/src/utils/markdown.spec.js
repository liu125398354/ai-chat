/**
 * @file markdown.spec.js
 * @author liunannan
 * @date 2026-09-13
 * @description 分数、指数、导数、行列式应渲染为 KaTeX，而不是残缺文本
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { markdown, wrapBareMathEnvs } from './markdown.js';

function render(src) {
  return markdown.render(src);
}

describe('math rendering', () => {
  it('renders spaced inline fraction', () => {
    const html = render('分数 $ \\frac{1}{2} $');
    assert.match(html, /katex/);
    assert.match(html, /mfrac|frac/);
    assert.doesNotMatch(html, /\\frac\{1\}\{2\}/);
  });

  it('renders exponent', () => {
    const html = render('指数 $$x^{n+1}$$');
    assert.match(html, /katex/);
    assert.match(html, /msupsub|msup/);
  });

  it('renders derivative', () => {
    const html = render('导数 $$\\frac{\\mathrm{d}y}{\\mathrm{d}x}$$');
    assert.match(html, /katex/);
    assert.match(html, /mfrac|frac/);
  });

  it('renders determinant from $$ vmatrix $$', () => {
    const html = render('$$\\begin{vmatrix}a & b \\\\ c & d\\end{vmatrix}$$');
    assert.match(html, /katex/);
    assert.match(html, /katex-display/);
    assert.doesNotMatch(html, /katex-error/);
  });

  it('promotes inline vmatrix to display math', () => {
    const html = render('$\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$');
    assert.match(html, /katex-display/);
    assert.doesNotMatch(html, /katex-error/);
  });

  it('wraps bare vmatrix environment', () => {
    const src = wrapBareMathEnvs('\\begin{vmatrix}a & b \\\\ c & d\\end{vmatrix}');
    assert.match(src, /\$\$/);
    const html = render('\\begin{vmatrix}a & b \\\\ c & d\\end{vmatrix}');
    assert.match(html, /katex/);
  });

  it('renders \\[ \\] derivative', () => {
    const html = render('求导：\\[ \\frac{d}{dx} f(x) \\]');
    assert.match(html, /katex/);
  });
});

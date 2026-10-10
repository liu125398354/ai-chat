/**
 * @file markdown.spec.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 分数、指数、导数、行列式应渲染为 KaTeX，而不是残缺文本
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { markdown, wrapBareMathEnvs, markdownLive } from './markdown';
import { closedMermaidBodies } from './mermaid-fence';

function render(src: string) {
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

describe('live markdown', () => {
  it('skips KaTeX while streaming', () => {
    const html = markdownLive.render('指数 $$x^{n+1}$$');
    assert.doesNotMatch(html, /katex/);
  });
});

describe('mermaid fence', () => {
  it('renders a mermaid placeholder and escapes the source', () => {
    const html = render('说明\n\n```mermaid\nflowchart TD\n  A["<script>alert(1)</script>"] --> B\n```\n');
    assert.match(html, /class="mermaid-block"/);
    assert.match(html, /class="mermaid-head"/);
    assert.match(html, /class="mermaid-label">图表</);
    assert.match(html, /class="mermaid-src"/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /class="code-block"/);
  });

  it('keeps other fences as code blocks', () => {
    const html = render('```js\nconst a = 1;\n```');
    assert.match(html, /class="code-block"/);
    assert.doesNotMatch(html, /mermaid-block/);
  });

  it('lists only closed mermaid bodies while a fence is still open', () => {
    const src = '```mermaid\nflowchart TD\n  A-->B\n```\n\n接着\n\n```mermaid\nflowchart LR\n  A-->';
    const bodies = closedMermaidBodies(src);
    assert.deepEqual(bodies, ['flowchart TD\n  A-->B']);
    const html = render(src);
    const encoded = html.match(/<code>([\s\S]*?)<\/code>/)?.[1] ?? '';
    const decoded = encoded
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
    assert.equal(decoded, bodies[0]);
  });
});

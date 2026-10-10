/**
 * @file mermaid-diagram.spec.ts
 * @author liunannan
 * @date 2026-10-10
 * @description 图表文件名、尺寸与 SVG id 隔离
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  diagramFileBase,
  namespaceSvgIds,
  prepareSvgMarkup,
  svgAtPixelSize,
  svgPixelSize,
} from './mermaid-diagram';

describe('diagram file name', () => {
  it('uses the title and a 1-based index', () => {
    assert.equal(diagramFileBase('结账流程', 2), '结账流程-2');
  });

  it('strips path and reserved characters', () => {
    assert.equal(diagramFileBase('a/b:c*d?\\e', 1), 'a b c d e-1');
    assert.equal(diagramFileBase('../secret', 1), '.. secret-1');
    assert.doesNotMatch(diagramFileBase('a/b', 1), /[\\/:*?"<>|]/);
  });

  it('falls back when the title is empty and clamps the index', () => {
    assert.equal(diagramFileBase('///', 0), '图表-1');
    assert.equal(diagramFileBase('', -3), '图表-1');
    assert.equal(diagramFileBase('流程', 2.9), '流程-2');
  });

  it('keeps the title within 80 characters', () => {
    assert.equal(diagramFileBase('测'.repeat(100), 3), `${'测'.repeat(80)}-3`);
  });
});

describe('svg markup', () => {
  it('reads viewBox instead of percentage width', () => {
    const svg = '<svg width="100%" height="100%" viewBox="0 0 320 80"></svg>';
    assert.deepEqual(svgPixelSize(svg), { width: 320, height: 80 });
  });

  it('falls back when the svg has no size', () => {
    assert.deepEqual(svgPixelSize('<svg></svg>'), { width: 800, height: 600 });
    assert.deepEqual(svgPixelSize(''), { width: 800, height: 600 });
  });

  it('replaces percentage width with export pixels', () => {
    const sized = svgAtPixelSize('<svg width="100%" height="100%" viewBox="0 0 20 10"></svg>', 40, 20);
    assert.match(sized, /width="40"/);
    assert.match(sized, /height="20"/);
    assert.match(sized, /viewBox="0 0 20 10"/);
    assert.equal(sized.match(/\swidth=/g)?.length, 1);
  });

  it('adds xmlns once and rejects non-svg', () => {
    const once = prepareSvgMarkup('<svg viewBox="0 0 10 10"></svg>');
    assert.match(once, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.equal(prepareSvgMarkup(once).match(/xmlns=/g)?.length, 1);
    assert.equal(prepareSvgMarkup('hello'), '');
  });

  it('renames longer ids before shorter ones', () => {
    const svg = '<svg><g id="ab"></g><g id="a"></g><use href="#a"></use><path style="fill:url(#ab)" /></svg>';
    const next = namespaceSvgIds(svg, 'p-');
    assert.match(next, /id="p-ab"/);
    assert.match(next, /id="p-a"/);
    assert.match(next, /href="#p-a"/);
    assert.match(next, /url\(#p-ab\)/);
    assert.doesNotMatch(next, /id="ab"/);
    assert.doesNotMatch(next, /id="p-p-/);
  });

  it('rewrites style selectors and keeps color hex', () => {
    const svg = [
      '<svg id="diagram">',
      '<style>#diagram .edge-pattern-dotted{stroke:#28253D}#diagram .edge{marker-end:url(#diagram_pointEnd)}</style>',
      '<marker id="diagram_pointEnd"></marker>',
      '<path marker-end="url(#diagram_pointEnd)" />',
      '</svg>',
    ].join('');
    const next = namespaceSvgIds(svg, 'p-');
    assert.match(next, /id="p-diagram"/);
    assert.match(next, /#p-diagram \.edge-pattern-dotted\{stroke:#28253D\}/);
    assert.match(next, /#p-diagram \.edge\{marker-end:url\(#p-diagram_pointEnd\)\}/);
    assert.match(next, /id="p-diagram_pointEnd"/);
    assert.doesNotMatch(next, /#diagram[ {_]/);
    assert.doesNotMatch(next, /url\(#diagram/);
    assert.doesNotMatch(next, /#p-p-/);
  });

  it('does not rewrite a color that only starts with a shorter id', () => {
    const svg = '<svg id="a"><style>#a{fill:#aaa}</style></svg>';
    const next = namespaceSvgIds(svg, 'p-');
    assert.match(next, /#p-a\{fill:#aaa\}/);
    assert.doesNotMatch(next, /#p-aaa/);
  });
});

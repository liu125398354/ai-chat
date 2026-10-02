/**
 * @file mermaid-fence.ts
 * @author liunannan
 * @date 2026-10-02
 * @description 从助手原文里找出已经闭合的 mermaid 围栏，流式阶段只绘制这些图
 */

/** 与 markdown-it 围栏正文对齐：去掉末尾一个换行。 */
export function mermaidFenceBody(content: string) {
  return content.replace(/\n$/, '');
}

const CLOSED_MERMAID = /```[ \t]*mermaid(?:[ \t]+[^\n`]*)?\n([\s\S]*?)```/gi;

/** 返回已闭合 mermaid 围栏的正文；末尾未闭合的围栏不包含在内。 */
export function closedMermaidBodies(src: string) {
  const normalized = (src || '').replace(/\r\n/g, '\n');
  const bodies: string[] = [];
  CLOSED_MERMAID.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CLOSED_MERMAID.exec(normalized))) {
    bodies.push(mermaidFenceBody(match[1] ?? ''));
  }
  return bodies;
}

/**
 * @file chat-context.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-16
 * @description 将落库消息截成最近 N 条并整理为千帆 user/assistant 轮次
 */
export type ContextRow = {
  role: 'user' | 'assistant';
  content: string;
  status?: 'completed' | 'failed';
};
export type QianfanTurn = { role: 'user' | 'assistant'; content: string };

export const DEFAULT_CONTEXT_MAX_CHARS = 32_000;

/**
 * 取最近 maxN 条已完成非空消息；保证以 user 开头、角色交替、最后一条为当前 user。
 * failed 不进上下文；超 maxChars 时从最早轮次丢掉，避免千帆 336103。
 */
export function toQianfanTurns(
  rows: ContextRow[],
  maxN: number,
  maxChars = DEFAULT_CONTEXT_MAX_CHARS,
): QianfanTurn[] {
  const sliced = rows
    .filter(
      (row) =>
        row.status !== 'failed' &&
        row.content &&
        row.content.trim().length > 0,
    )
    .slice(-Math.max(1, maxN))
    .map((row) => ({ role: row.role, content: row.content }));

  while (sliced.length > 0 && sliced[0].role !== 'user') {
    sliced.shift();
  }

  const merged: QianfanTurn[] = [];
  for (const row of sliced) {
    const last = merged[merged.length - 1];
    if (last && last.role === row.role) {
      last.content = `${last.content}\n${row.content}`;
    } else {
      merged.push({ ...row });
    }
  }

  if (merged.length === 0) {
    return [];
  }
  if (merged[merged.length - 1].role !== 'user') {
    merged.pop();
  }

  const budget = Math.max(1, maxChars);
  let chars = merged.reduce((n, turn) => n + turn.content.length, 0);
  while (merged.length > 1 && chars > budget) {
    const removed = merged.shift();
    if (!removed) break;
    chars -= removed.content.length;
    while (merged.length > 0 && merged[0].role !== 'user') {
      const orphan = merged.shift();
      if (!orphan) break;
      chars -= orphan.content.length;
    }
  }
  if (merged.length === 1 && merged[0].content.length > budget) {
    merged[0].content = merged[0].content.slice(-budget);
  }

  if (merged.length === 0 || merged[merged.length - 1].role !== 'user') {
    return [];
  }
  return merged;
}

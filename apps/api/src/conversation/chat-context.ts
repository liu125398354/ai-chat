/**
 * @file chat-context.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 将落库消息截成最近 N 条并整理为千帆 user/assistant 轮次
 */
export type ContextRow = { role: 'user' | 'assistant'; content: string };
export type QianfanTurn = { role: 'user' | 'assistant'; content: string };

/**
 * 取最近 maxN 条非空消息；保证以 user 开头、角色交替、最后一条为当前 user。
 */
export function toQianfanTurns(rows: ContextRow[], maxN: number): QianfanTurn[] {
  const sliced = rows
    .filter((row) => row.content && row.content.trim().length > 0)
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
  return merged;
}

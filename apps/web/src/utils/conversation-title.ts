/**
 * @file conversation-title.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 会话列表标题：默认名与提问摘要
 */
export const DEFAULT_CONVERSATION_TITLE = '新对话';

export function titleFromUserContent(content: string) {
  const oneLine = String(content || '').replace(/\s+/g, ' ').trim();
  if (!oneLine) return DEFAULT_CONVERSATION_TITLE;
  return oneLine.length <= 40 ? oneLine : `${oneLine.slice(0, 40)}…`;
}

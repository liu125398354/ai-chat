/**
 * @file conversation-title.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 默认标题与首条用户消息摘要
 */
export const DEFAULT_CONVERSATION_TITLE = '新对话';

const TITLE_SUMMARY = 40;
const TITLE_MAX = 200;

/** 用提问首行生成列表标题；已有自定义标题时不要覆盖。 */
export function titleFromUserContent(content: string): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  if (!oneLine) {
    return DEFAULT_CONVERSATION_TITLE;
  }
  const clipped =
    oneLine.length <= TITLE_SUMMARY ? oneLine : `${oneLine.slice(0, TITLE_SUMMARY)}…`;
  return clipped.slice(0, TITLE_MAX);
}

/**
 * @file last-conversation.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 按用户记住上次选中的会话；localStorage，登出不清，避免串户
 */

const PREFIX = 'ai-chat-last-conversation:';

export function readLastConversation(userId?: string) {
  if (!userId) return '';
  try {
    return localStorage.getItem(PREFIX + userId) || '';
  } catch {
    return '';
  }
}

export function writeLastConversation(userId?: string, conversationId?: string) {
  if (!userId) return;
  try {
    if (conversationId) {
      localStorage.setItem(PREFIX + userId, conversationId);
    } else {
      localStorage.removeItem(PREFIX + userId);
    }
  } catch {
    /* 无痕模式或配额不足时忽略 */
  }
}

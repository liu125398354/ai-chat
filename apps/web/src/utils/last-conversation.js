/**
 * @file last-conversation.js
 * @author liunannan
 * @date 2026-09-14
 * @description 按用户记住上次选中的会话；localStorage，登出不清，避免串户
 */

const PREFIX = 'ai-chat-last-conversation:';

/** @param {string} [userId] */
export function readLastConversation(userId) {
  if (!userId) return '';
  try {
    return localStorage.getItem(PREFIX + userId) || '';
  } catch {
    return '';
  }
}

/**
 * @param {string} [userId]
 * @param {string} [conversationId]
 */
export function writeLastConversation(userId, conversationId) {
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

/**
 * @file conversations.js
 * @author liunannan
 * @date 2026-09-13
 * @description 会话与历史消息 API（列表不含 messages）
 */
import { http } from './http';

export function listConversations() {
  return http.get('/v1/conversations').then((res) => res.data);
}

export function createConversation(title) {
  return http.post('/v1/conversations', title ? { title } : {}).then((res) => res.data);
}

export function deleteConversation(id) {
  return http.delete(`/v1/conversations/${id}`);
}

export function renameConversation(id, title) {
  return http.patch(`/v1/conversations/${id}`, { title }).then((res) => res.data);
}

export function listMessages(conversationId) {
  return http.get(`/v1/conversations/${conversationId}/messages`).then((res) => res.data);
}

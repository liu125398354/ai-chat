/**
 * @file conversations.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 会话与历史消息 API；列表 keyset，不含 messages 正文
 */
import { http } from './http';

export function listConversations(params = {}) {
  const query = {};
  if (params.limit) query.limit = params.limit;
  if (params.cursor) query.cursor = params.cursor;
  if (params.q) query.q = params.q;
  return http.get('/v1/conversations', { params: query }).then((res) => res.data);
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

export function listMessages(conversationId, params = {}) {
  const query = {};
  if (params.limit) query.limit = params.limit;
  if (params.cursor) query.cursor = params.cursor;
  return http
    .get(`/v1/conversations/${conversationId}/messages`, { params: query })
    .then((res) => res.data);
}

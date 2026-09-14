/**
 * @file conversations.ts
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description 会话与历史消息 API；列表 keyset，不含 messages 正文
 */
import { http } from './http';
import type { ChatMessage, Conversation, CursorPage } from '@/types/models';

export function listConversations(params: { limit?: number; cursor?: string; q?: string } = {}) {
  const query: { limit?: number; cursor?: string; q?: string } = {};
  if (params.limit) query.limit = params.limit;
  if (params.cursor) query.cursor = params.cursor;
  if (params.q) query.q = params.q;
  return http.get<CursorPage<Conversation>>('/v1/conversations', { params: query }).then((res) => res.data);
}

export function createConversation(title?: string) {
  return http.post<Conversation>('/v1/conversations', title ? { title } : {}).then((res) => res.data);
}

export function deleteConversation(id: string) {
  return http.delete(`/v1/conversations/${id}`);
}

export function renameConversation(id: string, title: string) {
  return http.patch<Conversation>(`/v1/conversations/${id}`, { title }).then((res) => res.data);
}

export function listMessages(conversationId: string, params: { limit?: number; cursor?: string } = {}) {
  const query: { limit?: number; cursor?: string } = {};
  if (params.limit) query.limit = params.limit;
  if (params.cursor) query.cursor = params.cursor;
  return http
    .get<CursorPage<ChatMessage>>(`/v1/conversations/${conversationId}/messages`, { params: query })
    .then((res) => res.data);
}

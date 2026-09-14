/**
 * @file models.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 前端与 API 对齐的会话/消息/用户形状（仅类型，无运行时）
 */
export type AuthUser = {
  id: string;
  username: string;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  status: string;
  errorCode: string | null;
  createdAt: string;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor?: string | null;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type ApiErrorBody = {
  code?: string;
  message?: string;
  requestId?: string;
};

export type StreamError = Error & {
  code?: string;
  status?: number;
};

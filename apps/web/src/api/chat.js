/**
 * @file chat.js
 * @author liunannan
 * @date 2026-09-13
 * @updated 2026-09-14
 * @description SSE 流式发送：必须 fetch + Bearer，禁止 EventSource
 */
import { ERROR_CODES } from '@ai-chat/shared';
import { expireClientSession, isAuthSessionCode } from '@/utils/session-expire';

/**
 * POST 流式对话并解析 SSE 事件。
 * @param {string} conversationId
 * @param {{ content: string }} body
 * @param {AbortSignal} [signal]
 * @param {(event: string, data: object) => void} onEvent
 */
export async function streamMessages(conversationId, body, signal, onEvent) {
  const token = sessionStorage.getItem('ai-chat-token');
  const res = await fetch(`/api/v1/conversations/${conversationId}/messages:stream`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let payload = { code: ERROR_CODES.INTERNAL_ERROR, message: '发送失败' };
    try {
      payload = await res.json();
    } catch {
      /* 非 JSON 错误体 */
    }
    if (res.status === 401 || res.status === 403 || isAuthSessionCode(payload.code)) {
      await expireClientSession();
    }
    const err = new Error(payload.message || '发送失败');
    err.code = payload.code;
    err.status = res.status;
    throw err;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('浏览器不支持流式读取');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = consumeSse(buffer, onEvent);
  }
  buffer += decoder.decode();
  consumeSse(buffer, onEvent, true);
}

/**
 * 按空行切分 SSE 块并回调；兼容 LF / CRLF。
 * @param {string} buffer
 * @param {(event: string, data: object) => void} onEvent
 * @param {boolean} [flushTail]
 */
function consumeSse(buffer, onEvent, flushTail = false) {
  const parts = buffer.split(/\r?\n\r?\n/);
  const rest = flushTail ? '' : parts.pop() || '';
  const blocks = flushTail ? (buffer.trim() ? [buffer] : []) : parts;
  for (const part of blocks) {
    const parsed = parseSseBlock(part);
    if (parsed) onEvent(parsed.event, parsed.data);
  }
  return rest;
}

/** @param {string} block */
function parseSseBlock(block) {
  let event = 'message';
  const dataLines = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return { event, data: { content: dataLines.join('\n') } };
  }
}

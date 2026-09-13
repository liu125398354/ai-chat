/**
 * @file chat.js
 * @author liunannan
 * @date 2026-09-13
 * @description SSE 流式发送：必须 fetch + Bearer，禁止 EventSource
 */

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
    let payload = { code: 'INTERNAL_ERROR', message: '发送失败' };
    try {
      payload = await res.json();
    } catch {
      /* 非 JSON 错误体 */
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
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      const parsed = parseSseBlock(part);
      if (parsed) onEvent(parsed.event, parsed.data);
    }
  }
  const tail = parseSseBlock(buffer);
  if (tail) onEvent(tail.event, tail.data);
}

/** @param {string} block */
function parseSseBlock(block) {
  let event = 'message';
  const dataLines = [];
  for (const line of block.split('\n')) {
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

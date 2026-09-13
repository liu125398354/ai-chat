/**
 * @file client-disconnect.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 将 HTTP 客户端断开映射为 AbortSignal，供千帆流取消
 */
import { IncomingMessage, ServerResponse } from 'node:http';

/**
 * 监听 req/res close；仅在尚未 markCompleted 时 abort。
 * 正常 `res.end()` 也会触发 close，必须先 markCompleted。
 */
export function bindClientDisconnect(
  req: IncomingMessage,
  res: ServerResponse,
): {
  signal: AbortSignal;
  markCompleted: () => void;
  dispose: () => void;
} {
  const ac = new AbortController();
  let completed = false;

  const onClose = (): void => {
    if (!completed && !ac.signal.aborted) {
      ac.abort();
    }
  };

  req.on('close', onClose);
  res.on('close', onClose);

  return {
    signal: ac.signal,
    markCompleted(): void {
      completed = true;
    },
    dispose(): void {
      req.off('close', onClose);
      res.off('close', onClose);
    },
  };
}

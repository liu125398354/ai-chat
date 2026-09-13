/**
 * @file qianfan-stream-abort.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 取消千帆 SDK 流：调用 Stream.controller.abort() 以中断 node-fetch
 */
import { ERROR_CODES } from '@ai-chat/shared';
import { QianfanAppError } from './qianfan-error';

export type QianfanStreamHandle = AsyncIterable<unknown> & {
  controller?: { abort: () => void };
};

export function clientAbortedError(): QianfanAppError {
  return new QianfanAppError(ERROR_CODES.CLIENT_ABORTED, '客户端已断开');
}

export function isClientAbortError(err: unknown): boolean {
  if (err instanceof QianfanAppError && err.code === ERROR_CODES.CLIENT_ABORTED) {
    return true;
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return true;
  }
  if (err instanceof Error && /request was aborted/i.test(err.message)) {
    return true;
  }
  return false;
}

/** 中断 SDK 持有的上游 HTTP；无 controller 时为 no-op。 */
export function abortQianfanStream(stream: QianfanStreamHandle | undefined): void {
  stream?.controller?.abort();
}

/**
 * @file qianfan-stream-abort.spec.ts
 * @author liunannan
 * @date 2026-09-13
 * @description abort 千帆 Stream.controller 与 CLIENT_ABORTED 判定
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ERROR_CODES } from '@ai-chat/shared';
import { QianfanAppError } from './qianfan-error';
import {
  abortQianfanStream,
  clientAbortedError,
  isClientAbortError,
} from './qianfan-stream-abort';

describe('abortQianfanStream', () => {
  it('calls SDK Stream.controller.abort', () => {
    let aborted = 0;
    abortQianfanStream({
      async *[Symbol.asyncIterator]() {
        yield undefined;
      },
      controller: {
        abort() {
          aborted += 1;
        },
      },
    });
    assert.equal(aborted, 1);
  });

  it('no-ops when stream or controller is missing', () => {
    abortQianfanStream(undefined);
    abortQianfanStream({
      async *[Symbol.asyncIterator]() {
        yield undefined;
      },
    });
  });
});

describe('isClientAbortError', () => {
  it('recognizes CLIENT_ABORTED and AbortError', () => {
    assert.equal(isClientAbortError(clientAbortedError()), true);
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    assert.equal(isClientAbortError(abort), true);
    assert.equal(isClientAbortError(new Error('Request was aborted.')), true);
    assert.equal(
      isClientAbortError(new QianfanAppError(ERROR_CODES.QIANFAN_TIMEOUT, 'timeout')),
      false,
    );
  });
});

/**
 * @file qianfan-error.spec.ts
 * @author liunannan
 * @date 2026-09-16
 * @description 千帆 336103 与 SDK 整包 JSON 不得原样回给前端
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ERROR_CODES } from '@ai-chat/shared';
import { mapQianfanFailure } from './qianfan-error';

describe('mapQianfanFailure', () => {
  it('maps 336103 Prompt tokens too long from SDK JSON message', () => {
    const raw = JSON.stringify({
      headers: { 'content-type': 'application/json; charset=utf-8' },
      error_code: 336103,
      error_msg: 'Prompt tokens too long',
    });
    const mapped = mapQianfanFailure(new Error(raw));
    assert.equal(mapped.code, ERROR_CODES.QIANFAN_ERROR);
    assert.match(mapped.message, /上下文过长/);
    assert.doesNotMatch(mapped.message, /headers|access-control/i);
  });

  it('maps chunk objects with error_code 336103', () => {
    const mapped = mapQianfanFailure({
      error_code: 336103,
      error_msg: 'Prompt tokens too long',
    });
    assert.match(mapped.message, /上下文过长/);
  });
});

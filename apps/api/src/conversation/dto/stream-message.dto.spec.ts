/**
 * @file stream-message.dto.spec.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 流式 content 非空且不超过 8000
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StreamMessageDto } from './stream-message.dto';

async function check(content: unknown) {
  const dto = plainToInstance(StreamMessageDto, { content });
  return validate(dto);
}

describe('StreamMessageDto', () => {
  it('accepts a 8000-char payload', async () => {
    const errors = await check('x'.repeat(8000));
    assert.equal(errors.length, 0);
  });

  it('rejects content longer than 8000', async () => {
    const errors = await check('x'.repeat(8001));
    assert.ok(errors.some((row) => row.property === 'content'));
  });

  it('rejects blank content after trim', async () => {
    const errors = await check('   ');
    assert.ok(errors.some((row) => row.property === 'content'));
  });
});

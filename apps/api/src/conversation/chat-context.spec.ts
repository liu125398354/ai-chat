/**
 * @file chat-context.spec.ts
 * @author liunannan
 * @date 2026-09-16
 * @description 千帆上下文：跳过 failed、字数预算、不以 assistant 开头
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toQianfanTurns } from './chat-context';

describe('toQianfanTurns', () => {
  it('omits failed assistant so a single user turn remains', () => {
    const turns = toQianfanTurns(
      [
        { role: 'user', content: 'hello', status: 'completed' },
        { role: 'assistant', content: '', status: 'failed' },
      ],
      20,
    );
    assert.deepEqual(turns, [{ role: 'user', content: 'hello' }]);
  });

  it('omits failed partials between the same user retry rows', () => {
    const turns = toQianfanTurns(
      [
        { role: 'user', content: 'q1', status: 'completed' },
        { role: 'assistant', content: 'partial', status: 'failed' },
      ],
      20,
    );
    assert.deepEqual(turns, [{ role: 'user', content: 'q1' }]);
  });

  it('trims oldest turns when over char budget', () => {
    const turns = toQianfanTurns(
      [
        { role: 'user', content: 'aaaa', status: 'completed' },
        { role: 'assistant', content: 'bbbb', status: 'completed' },
        { role: 'user', content: 'cccc', status: 'completed' },
      ],
      20,
      8,
    );
    assert.deepEqual(turns, [{ role: 'user', content: 'cccc' }]);
  });
});

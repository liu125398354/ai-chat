/**
 * @file keyset-cursor.spec.ts
 * @author liunannan
 * @date 2026-09-14
 * @description keyset 游标编解码与标题搜索消毒
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '../common/errors/app-error';
import {
  clampPageLimit,
  decodeCursor,
  encodeCursor,
  sanitizeTitleQuery,
} from './keyset-cursor';

describe('keyset-cursor', () => {
  it('round-trips time and id', () => {
    const t = new Date('2026-09-14T08:00:00.000Z');
    const id = 'b2e1f0aa-1111-2222-3333-444455556666';
    const again = decodeCursor(encodeCursor(t, id));
    assert.equal(again.id, id);
    assert.equal(again.t.toISOString(), t.toISOString());
  });

  it('rejects garbage cursor', () => {
    assert.throws(() => decodeCursor('not-a-cursor'), (err: unknown) => err instanceof AppError);
  });

  it('clamps limit and strips ILIKE wildcards', () => {
    assert.equal(clampPageLimit(undefined, 50), 50);
    assert.equal(clampPageLimit(0, 50), 1);
    assert.equal(clampPageLimit(500, 50), 100);
    assert.equal(sanitizeTitleQuery('  a%b_c\\d  '), 'abcd');
  });
});

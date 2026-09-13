/**
 * @file client-disconnect.spec.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 客户端 close 才 abort；正常结束后 close 不再 abort
 */
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { describe, it } from 'node:test';
import { IncomingMessage, ServerResponse } from 'node:http';
import { bindClientDisconnect } from './client-disconnect';

function fakePair(): { req: IncomingMessage; res: ServerResponse } {
  const req = new EventEmitter() as IncomingMessage;
  const res = new EventEmitter() as ServerResponse;
  return { req, res };
}

describe('bindClientDisconnect', () => {
  it('aborts when the client closes before completion', () => {
    const { req, res } = fakePair();
    const handle = bindClientDisconnect(req, res);
    assert.equal(handle.signal.aborted, false);
    req.emit('close');
    assert.equal(handle.signal.aborted, true);
    handle.dispose();
  });

  it('does not abort after markCompleted', () => {
    const { req, res } = fakePair();
    const handle = bindClientDisconnect(req, res);
    handle.markCompleted();
    res.emit('close');
    assert.equal(handle.signal.aborted, false);
    handle.dispose();
  });
});

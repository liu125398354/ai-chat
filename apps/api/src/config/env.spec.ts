/**
 * @file env.spec.ts
 * @author liunannan
 * @date 2026-09-14
 * @description 生产 CORS 与 OpenAPI 开关
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadAppEnv } from './env';

const BASE: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/ai_chat',
  JWT_SECRET: 'sixteen-chars-min',
  QIANFAN_ACCESS_KEY: 'ak-not-placeholder',
  QIANFAN_SECRET_KEY: 'sk-not-placeholder',
};

describe('loadAppEnv', () => {
  it('requires an explicit CORS_ORIGIN in production', () => {
    assert.throws(() => loadAppEnv({ ...BASE, NODE_ENV: 'production' }), /CORS_ORIGIN/);
    const env = loadAppEnv({
      ...BASE,
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://chat.example.com',
    });
    assert.equal(env.corsOrigin, 'https://chat.example.com');
  });

  it('disables OpenAPI in production unless ENABLE_OPENAPI=true', () => {
    const prod = loadAppEnv({
      ...BASE,
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://chat.example.com',
    });
    assert.equal(prod.enableOpenApi, false);
    const forced = loadAppEnv({
      ...BASE,
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://chat.example.com',
      ENABLE_OPENAPI: 'true',
    });
    assert.equal(forced.enableOpenApi, true);
  });
});

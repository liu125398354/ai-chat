/**
 * @file run-prisma.cjs
 * @author liunannan
 * @date 2026-09-14
 * @description 从 @ai-chat/api 的依赖树解析本仓库 Prisma CLI 并执行（不依赖 .bin，也不走 npx 拉最新版）
 */
const { createRequire } = require('module');
const { spawnSync } = require('child_process');
const path = require('path');

const apiRoot = path.resolve(__dirname, '..');
const apiRequire = createRequire(path.join(apiRoot, 'package.json'));

let cli;
try {
  cli = apiRequire.resolve('prisma/build/index.js');
} catch (err) {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(
    'Prisma CLI is not installed for @ai-chat/api. From the repo root run: npm ci --include=dev',
  );
  console.error(detail);
  process.exit(1);
}

const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: apiRoot,
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);

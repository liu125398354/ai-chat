/**
 * @file load-dotenv.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 最先加载 apps/api/.env（兼容 src 与 dist 启动）
 */
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

const candidates = [
  join(process.cwd(), '.env'),
  join(__dirname, '..', '.env'),
  join(__dirname, '..', '..', '.env'),
];

const envPath = candidates.find((p) => existsSync(p));
if (envPath) {
  // override：改 .env 后重启进程时覆盖旧的 process.env（dotenv 默认不覆盖）
  config({ path: envPath, override: true });
}

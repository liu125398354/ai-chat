/**
 * @file load-dotenv.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 最先加载 apps/api/.env，供后续模块读取
 */
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '..', '.env') });

/**
 * @file env.ts
 * @author liunannan
 * @date 2026-09-13
 * @description 启动期环境变量校验；缺 JWT 或千帆 AK/SK 则拒绝启动
 */

const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
  'QIANFAN_ACCESS_KEY',
  'QIANFAN_SECRET_KEY',
] as const;

const PLACEHOLDER = /^(replace-me|replace-with-a-long-random-string)$/i;

export type AppEnv = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: '2h';
  qianfanAccessKey: string;
  qianfanSecretKey: string;
  qianfanModel: string;
  qianfanTimeoutMs: number;
  contextMaxMessages: number;
  corsOrigin: string;
};

/**
 * 读取并校验进程环境。占位符视为未配置。
 */
export function loadAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const missing = REQUIRED.filter((key) => {
    const value = env[key]?.trim();
    return !value || PLACEHOLDER.test(value);
  });
  if (missing.length > 0) {
    throw new Error(`缺少或未替换环境变量: ${missing.join(', ')}（参见 apps/api/.env.example）`);
  }

  const jwtSecret = env.JWT_SECRET!.trim();
  if (jwtSecret.length < 16) {
    throw new Error('JWT_SECRET 长度至少 16 个字符');
  }

  return {
    port: Number(env.PORT) || 3000,
    databaseUrl: env.DATABASE_URL!.trim(),
    jwtSecret,
    jwtExpiresIn: '2h' as const,
    qianfanAccessKey: env.QIANFAN_ACCESS_KEY!.trim(),
    qianfanSecretKey: env.QIANFAN_SECRET_KEY!.trim(),
    qianfanModel: (env.QIANFAN_MODEL || 'ernie-4.0-8k').trim(),
    qianfanTimeoutMs: Number(env.QIANFAN_TIMEOUT_MS) || 120000,
    contextMaxMessages: Number(env.CONTEXT_MAX_MESSAGES) || 20,
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:8080',
  };
}

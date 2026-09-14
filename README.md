# AI Chat

前后端分离的对话工作台：登录、多会话历史、服务端千帆流式（SSE）、Markdown 安全渲染。

依据：`docs/PRD.md`、`docs/TECH.md`、`docs/API.md`、`docs/DATABASE.md`、`docs/UI.md`。

## 仓库结构

```text
apps/web          Vue 3 + JavaScript + Vite（端口 8080，/api 反代到后端）
apps/api          NestJS + TypeScript + Prisma（端口 3000）
packages/shared   错误码与 SSE 事件名（纯 JS）
docs/             PRD / TECH / API / DATABASE / UI
```

## 环境

- Node.js ≥ 20，包管理器 **npm**
- PostgreSQL（连接串 `DATABASE_URL`）
- 百度智能云千帆 IAM：`QIANFAN_ACCESS_KEY` / `QIANFAN_SECRET_KEY`
- 多实例部署时再配 `REDIS_URL`（会话锁）；单进程可省略

复制环境文件（**禁止提交 `.env`**）：

```bash
cp apps/api/.env.example apps/api/.env
```

将 `JWT_SECRET` 与千帆 AK/SK 换成真实值。缺少或仍为占位符时 API **拒绝启动**。生产必须显式设置 `CORS_ORIGIN`。轮换千帆 SK 后只需重启 api，不必发版。

## 本地启动

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

`npm run dev` 会先起 API（3000），`wait-on` 端口就绪后再起 Vite（8080）。也可分终端：`npm run dev:api` 与 `npm run dev:web`。

浏览器打开 `http://localhost:8080`。登录页请求走 `/api/v1/...` → `http://localhost:3000/v1/...`。

- 探活：`GET /health/live`；就绪（`SELECT 1`）：`GET /health/ready`
- 开发环境 OpenAPI：`http://localhost:3000/docs`（生产默认关闭，`ENABLE_OPENAPI=true` 可打开）
- 流式 SSE 请用 fetch，对照 `docs/API.md`

## 测试与门禁

```bash
npm test
npm run lint
npm run build:web
npm run build:api
```

## 容器

仓库根目录 `docker-compose.yml`：Postgres + Redis + api（`prisma migrate deploy` 后 `node dist`）+ web（Nginx 静态 + `/api` 反代，SSE `proxy_buffering off`，读超时 125s）。

独立 Nginx 示例见 `deploy/nginx.sse.conf`。

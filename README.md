# AI Chat

前后端分离的对话工作台：登录、多会话历史、服务端千帆流式（SSE）、Markdown 安全渲染。

依据：`docs/PRD.md`、`docs/TECH.md` v1.1、`docs/API.md`、`docs/DATABASE.md`。

## 仓库结构

```text
apps/web          Vue 3 + JavaScript + Vite（端口 8080，/api 反代到后端）
apps/api          NestJS + TypeScript + Prisma（端口 3000）
packages/shared   错误码与 SSE 事件名（纯 JS）
docs/             PRD / TECH / API / DATABASE
```

## 环境

- Node.js ≥ 20，包管理器 **npm**
- PostgreSQL（连接串 `DATABASE_URL`）
- 百度智能云千帆 IAM：`QIANFAN_ACCESS_KEY` / `QIANFAN_SECRET_KEY`

复制 `apps/api/.env.example` 为 `apps/api/.env`（**禁止提交**）。缺少 `JWT_SECRET` 或千帆 AK/SK 时 API **拒绝启动**。

## 本地启动

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev:api
npm run dev:web
```

浏览器打开 `http://localhost:8080`。登录页请求走 `/api/v1/...` → `http://localhost:3000/v1/...`。

## 里程碑

当前为工程骨架（可编译启动、Prisma 模型、Auth/会话模块与前端路由布局）。千帆流式编排按 TECH 落在 QianfanAdapter，业务闭环见 M1–M3。

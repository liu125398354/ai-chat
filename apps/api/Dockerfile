# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared packages/shared
RUN npm ci --workspace=@ai-chat/api --include-workspace-root

FROM deps AS build
COPY apps/api apps/api
WORKDIR /app/apps/api
RUN node scripts/run-prisma.cjs generate && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/package.json /app/package-lock.json /app/
COPY --from=deps /app/apps /app/apps
COPY --from=deps /app/packages /app/packages
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/prisma /app/apps/api/prisma
WORKDIR /app/apps/api
RUN node scripts/run-prisma.cjs generate
EXPOSE 3000
CMD ["sh", "-c", "node scripts/run-prisma.cjs migrate deploy && node dist/main.js"]

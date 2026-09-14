# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared packages/shared
RUN npm ci --workspace=@ai-chat/web --include-workspace-root
COPY apps/web apps/web
ARG VITE_BASE=/
ENV VITE_BASE=$VITE_BASE
RUN npm run build -w @ai-chat/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

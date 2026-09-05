# 阶段 1: 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制工作区根目录的配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 复制 web 应用代码
COPY apps/web ./apps/web

WORKDIR /app/apps/web

# 安装 pnpm 并安装依赖
RUN npm install -g pnpm && pnpm install --frozen-lockfile --ignore-scripts

# 构建 Next.js
RUN pnpm run build

# 阶段 2: 运行阶段
FROM node:20-alpine AS runner

WORKDIR /app

# 复制 standalone 产物
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

EXPOSE 3001

CMD ["node", "server.js"]
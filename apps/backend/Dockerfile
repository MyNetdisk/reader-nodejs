# 阶段 1: 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制工作区根目录的配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 复制后端应用代码
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

# 安装 pnpm 并安装依赖（加 --ignore-scripts 跳过 @scarf/scarf 等分析脚本）
RUN npm install -g pnpm && pnpm install --frozen-lockfile --ignore-scripts

# 编译 TypeScript
RUN pnpm run build

# 阶段 2: 运行阶段
FROM node:20-alpine AS runner

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制锁文件和后端 package.json
COPY pnpm-lock.yaml ./
COPY apps/backend/package.json ./

# 安装生产依赖（加 --ignore-scripts 跳过构建脚本）
RUN pnpm install --prod --no-frozen-lockfile --ignore-scripts

# 从构建阶段复制编译后的代码
COPY --from=builder /app/apps/backend/dist ./dist

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "dist/main.js"]
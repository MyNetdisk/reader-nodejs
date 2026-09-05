#  Reader Node.js

基于 Node.js 技术栈的电子书阅读平台，采用 Monorepo 架构管理多个应用和共享包。

## 项目简介

Reader Node.js 是一个全栈电子书阅读平台，后端使用 NestJS 构建模块化 API 服务，前端使用 Next.js 实现 SSR/SSG 高性能渲染，支持电子书的上传、解析、管理和在线阅读。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | NestJS + TypeORM |
| 数据库 | MySQL |
| 前端（Web） | Next.js（SSR/SSG） |
| 前端（H5） | Next.js |
| 前端（App） | 待定 |
| 包管理 | pnpm workspace |
| 任务编排 | Turborepo |
| 语言 | TypeScript |

## 项目架构

```
reader-nodejs/
├── apps/
│   ├── backend/        # NestJS 后端服务（含 Dockerfile）
│   ├── web/            # Web 端（Next.js，含 Dockerfile）
│   ├── h5/             # H5 移动端（Next.js）
│   └── app/            # App 端
├── packages/
│   ├── api-types/      # 前后端共享的 API 类型定义
│   ├── utils/          # 共享工具函数
│   └── constants/      # 共享常量
├── docs/               # 项目文档
├── scripts/            # 构建/部署脚本
├── docker-compose.yml  # 根级 Docker Compose 编排（backend + web + db）
├── turbo.json          # Turborepo 配置
├── pnpm-workspace.yaml # pnpm workspace 配置
└── package.json        # 根级依赖和脚本
```

### 架构说明

- **apps/**：存放各独立应用，每个子目录是一个可独立运行的服务或前端项目
- **packages/**：存放跨应用共享的代码包，通过 pnpm workspace 链接，无需发布即可互相引用
- **Turborepo**：负责任务编排，提供智能缓存和并行构建能力

## 快速开始

项目提供两种运行方式，**互为独立、二选一**，请根据场景选择：

- **方式一：本地开发** —— 直接在宿主机用 Node + pnpm 启动，热重载快，适合日常开发联调。需要本机已安装并运行 MySQL。
- **方式二：Docker 部署** —— 一条命令把 backend、web、MySQL 全部容器化拉起，无需本机预装 MySQL，适合集成测试 / 生产部署 / 干净环境复现。

> 两种方式的区别、服务名互通、环境变量等细节见 [docs/docker.md](./docs/docker.md)。

---

### 方式一：本地开发

#### 前置要求

- Node.js 18+
- pnpm 9+
- MySQL 8.0+（本机或可访问的实例，需按 `apps/backend/src/app.module.ts` 中的 `DB_*` 环境变量配置连接）

#### 安装依赖

```bash
pnpm install
```

#### 启动开发环境

```bash
# 启动所有应用（并行）
pnpm run dev

# 仅启动后端
pnpm turbo run dev --filter=backend

# 仅启动 Web 端
pnpm turbo run dev --filter=web
```

#### 构建

```bash
# 构建所有应用
pnpm run build

# 仅构建指定应用
pnpm turbo run build --filter=web
```

#### 代码检查

```bash
pnpm run lint
```

#### 测试

```bash
pnpm run test
```

---

### 方式二：Docker 部署（一键启动）

#### 前置要求

- Docker 20.10+
- Docker Compose v2（Docker Desktop 自带）
- 无需本机预装 Node / pnpm / MySQL，全部在容器内

#### 一键启动

在**项目根目录**执行：

```bash
# 首次运行或代码变更后，加 --build 重新编译镜像
docker compose up --build

# 后台运行
docker compose up -d --build

# 查看日志
docker compose logs -f
```

启动顺序由 `depends_on` 自动保证：`db` 健康检查通过 → `backend` 启动 → `web` 启动。

#### 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| Web 前端 | http://localhost:3001 | Next.js SSR |
| Backend API | http://localhost:3000 | NestJS，Swagger 同端口 |
| MySQL | localhost:3306 | root / rootpassword，库名 `reader` |

容器之间通过服务名互通：`backend` 用 `db:3306` 连数据库，`web` 用 `http://backend:3000` 调后端。

#### 停止与清理

```bash
# 停止容器（保留数据卷）
docker compose down

# 停止并删除数据卷（清空数据库数据）
docker compose down -v
```

更多命令、环境变量、常见问题见 [docs/docker.md](./docs/docker.md)。

## 开发规范

- 所有命令通过 Turborepo 统一编排，根目录执行即可
- 共享代码放在 `packages/` 下，避免应用间直接引用
- 环境变量统一放在各应用根目录的 `.env` 文件中，参考 `.env.example`

## License

MIT
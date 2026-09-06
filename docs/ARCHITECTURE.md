# 🏗️ 项目架构设计

本文档说明项目的整体架构、目录组织、应用间关系和启动编排。

> 数据库设计见 [DATABASE.md](./DATABASE.md)，环境配置见 [SETUP.md](./SETUP.md)，Docker 部署见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

---

## 一、总体架构

Reader Node.js 是一个 Monorepo 全栈电子书阅读平台：

```
                  ┌─────────────┐
                  │   浏览器用户  │
                  └──────┬──────┘
                         │ HTTP
            ┌────────────┴────────────┐
            ▼                         ▼
   ┌─────────────────┐      ┌─────────────────┐
   │   web (Next.js)  │      │   h5 (Next.js)  │ ← 移动端（规划中）
   │   SSR / 客户端    │      │                 │
   │      :3001       │      │                 │
   └────────┬────────┘      └─────────────────┘
            │ fetch NEXT_PUBLIC_API_URL
            ▼
   ┌─────────────────┐
   │ backend (NestJS) │
   │   /api/v1/*      │
   │   Swagger        │
   │      :3000       │
   └────────┬────────┘
            │ TypeORM (mysql2)
            ▼
   ┌─────────────────┐
   │   MySQL 8.0      │
   │   库 reader       │
   │     :3306        │
   └─────────────────┘
```

- **Web 前端**（浏览器 + SSR）调用后端 REST API
- **后端**通过 TypeORM 读写 MySQL
- **MySQL** 存储业务数据

---

## 二、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端框架 | NestJS 12 | 模块化、装饰器风格、内置依赖注入 |
| ORM | TypeORM 1.x | 通过 entity 定义表结构，`@nestjs/typeorm` 集成 |
| 数据库 | MySQL 8.0 | 便携 ZIP 版（本地）/ 官方镜像（Docker） |
| 数据库驱动 | mysql2 | TypeORM 的 mysql 驱动 |
| 前端（Web） | Next.js 16（App Router） | React 19，SSR + Turbopack |
| 前端样式 | Tailwind CSS 4 | 原子化 CSS，PostCSS 集成 |
| 前端（H5） | Next.js | 移动端（规划中，目前为空占位） |
| 前端（App） | 待定 | App 端（目前为空占位） |
| 语言 | TypeScript | 全栈类型安全 |
| 包管理 | pnpm 11 + workspace | 通过 `pnpm-workspace.yaml` 链接子包 |
| 任务编排 | Turborepo 2 | 并行 dev/build，智能缓存 |
| API 文档 | Swagger（`@nestjs/swagger`） | 自动生成 OpenAPI，挂在 `/api-docs` |

---

## 三、目录结构

```
reader-nodejs/
├── apps/                      # 独立应用，每个子目录可单独运行
│   ├── backend/               # NestJS 后端服务（:3000）
│   │   ├── src/
│   │   │   ├── app.module.ts      # 根模块：ConfigModule + TypeOrmModule + 业务模块
│   │   │   ├── main.ts            # 启动入口：listen(3000)、全局前缀 /api/v1、Swagger
│   │   │   ├── app.controller.ts # 健康检查路由 GET /
│   │   │   └── book/              # 书籍业务模块
│   │   │       ├── book.module.ts    # 模块定义：导入 TypeOrmModule.forFeature([Book])
│   │   │       ├── book.controller.ts# REST CRUD 路由 /api/v1/books
│   │   │       ├── book.service.ts  # 业务逻辑 + Repository 调用
│   │   │       ├── dto/              # 请求体校验 + Swagger 文档
│   │   │       └── entities/book.entity.ts  # TypeORM entity（表结构定义）
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── web/                   # Next.js Web 端（:3001）
│   │   ├── src/app/              # App Router：page.tsx / layout.tsx
│   │   ├── next.config.ts        # output: 'standalone'（供 Docker 用）
│   │   └── package.json
│   ├── h5/                   # H5 移动端（规划中，.gitkeep 占位）
│   └── app/                  # App 端（待定，.gitkeep 占位）
├── packages/                 # 跨应用共享包，通过 pnpm workspace 链接
│   ├── api-types/            # 前后端共享的 API 类型定义（占位）
│   ├── utils/                # 共享工具函数（占位）
│   └── constants/           # 共享常量（占位）
├── db/                       # 本地便携 MySQL（gitignore 忽略）
│   ├── mysql/                # MySQL 解压文件（需自行下载）
│   ├── data/                 # 数据目录（初始化后生成）
│   ├── my.ini                # 配置文件（端口 3306、utf8mb4、InnoDB）
│   └── .mysqld.pid           # db:start 启动后的 PID 文件
├── scripts/                  # 构建/部署/启动脚本
│   ├── db.js                 # 便携 MySQL 管理：start / stop / status
│   ├── dev.js                # 本地开发编排：MySQL → reader 库 → turbo dev
│   └── seed.sql              # 数据库建表 + 示例数据
├── docs/                     # 项目文档
│   ├── README.md             # 文档中心索引
│   ├── ARCHITECTURE.md       # 本文档
│   ├── SETUP.md              # 开发环境配置
│   ├── MYSQL_SETUP.md        # 本地 MySQL 安装详细步骤
│   ├── DATABASE.md           # 数据库设计与规范
│   └── DEPLOYMENT.md         # Docker 部署说明
├── docker-compose.yml        # 根级编排：db + backend + web 三服务
├── turbo.json                # Turborepo 任务定义（dev/build/lint/test）
├── pnpm-workspace.yaml       # workspace 声明：apps/* + packages/*
├── package.json              # 根级依赖和脚本（dev/db:*/build/lint/test）
└── .gitignore                # 忽略 node_modules / dist / .next / db/data / .env 等
```

### 目录职责

| 目录 | 职责 | 是否可单独运行 |
|------|------|----------------|
| `apps/*` | 独立部署单元，每个是一个完整应用 | 是 |
| `packages/*` | 跨应用共享代码，通过 workspace 链接，不单独发布 | 否 |
| `db/` | 仅本地开发用的便携 MySQL，不提交到仓库 | — |
| `scripts/` | 顶层工具脚本（开发编排、数据库管理、种子数据） | 否 |
| `docs/` | 项目文档，根 README 是总览，docs 内是详细说明 | 否 |

---

## 四、后端架构

NestJS 采用模块化设计，每个业务领域是一个 Module。

### 4.1 模块组织

```
AppModule（根）
├── ConfigModule.forRoot({ isGlobal: true })   # 全局 .env 加载
├── TypeOrmModule.forRoot(...)                 # 全局数据库连接
├── BookModule                                 # 书籍业务模块
│   └── TypeOrmModule.forFeature([Book])       # 注入 Book Repository
├── AppController                              # 健康检查 GET /
└── AppService
```

- **根模块** [app.module.ts](../apps/backend/src/app.module.ts)：负责全局配置（`ConfigModule`、`TypeOrmModule.forRoot`），并把所有业务模块聚合到 `imports`
- **业务模块**自治：每个模块自己声明依赖的 entity（`TypeOrmModule.forFeature`）、controller、service、dto
- **新增业务模块**：在 `src/<domain>/` 下创建 module/controller/service/entity，再到 `app.module.ts` 的 `imports` 注册

### 4.2 分层

```
Controller  ← 处理 HTTP，校验 DTO，返回响应
    ↓
Service     ← 业务逻辑，调用 Repository
    ↓
Repository  ← TypeORM 提供，操作 entity 对应的表
    ↓
MySQL
```

### 4.3 启动入口

[main.ts](../apps/backend/src/main.ts)：

```ts
const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api/v1');  // 全局路由前缀
app.enableCors();                // 跨域
// Swagger 挂在 /api-docs
await app.listen(3000);
```

### 4.4 API 文档

Swagger 由 `@nestjs/swagger` 自动生成：

- 装饰器：`@ApiTags`、`@ApiOperation`、`@ApiResponse`、`@ApiProperty` 等
- 访问：http://localhost:3000/api-docs
- DTO 同时承担「请求体校验」和「Swagger 文档」双重职责

---

## 五、前端架构

### 5.1 Web 端（Next.js App Router）

```
apps/web/src/app/
├── layout.tsx     # 根布局：字体、metadata、<html>/<body>
├── page.tsx       # 首页（'use client' + useEffect + fetch 调后端）
├── globals.css    # 全局样式（Tailwind 指令）
└── favicon.ico
```

- **App Router**：基于文件系统的路由，`app/` 目录即路由
- **客户端数据获取**：`'use client'` + `useEffect` + `fetch(NEXT_PUBLIC_API_URL)`
- **样式**：Tailwind CSS 4，通过 PostCSS 集成
- **构建产物**：`output: 'standalone'`，便于 Docker 镜像打包

### 5.2 后端地址

前端通过 `NEXT_PUBLIC_API_URL`（来自 `apps/web/.env.local`）调用后端：

- 本地开发：`http://localhost:3000`
- Docker：浏览器仍走 `localhost:3000`（Docker 端口映射），SSR 走 `http://backend:3000`（内部网络）

详见 [DEPLOYMENT.md](./DEPLOYMENT.md) 第 5.3 节。

---

## 六、共享包

`packages/` 下的包通过 pnpm workspace 链接，应用内可直接 `import`：

| 包 | 用途 | 状态 |
|----|------|------|
| `@reader/api-types` | 前后端共享的请求/响应 TypeScript 类型 | 占位（.gitkeep） |
| `@reader/utils` | 共享工具函数 | 占位 |
| `@reader/constants` | 共享常量（枚举、配置值） | 占位 |

> 包名前缀 `@reader` 为示例，实际命名以各包 `package.json` 的 `name` 字段为准。当前三个包均为空占位，后续按需填充。

---

## 七、启动编排

### 7.1 本地开发（`scripts/dev.js`）

`pnpm dev` 底层执行 `node scripts/dev.js`，按顺序编排：

```
1. startMysql()        node scripts/db.js start
                       ├─ 检测 3306 端口，已占用则跳过
                       ├─ spawn mysqld（detached，读 db/my.ini）
                       ├─ 轮询 3306 直到就绪（最多 30s）
                       └─ 写 db/.mysqld.pid
2. ensureDatabase()    mysql -e "CREATE DATABASE IF NOT EXISTS reader ..."
3. startTurbo()        turbo run dev（backend + web 并行）
                       ├─ backend: nest start --watch（:3000）
                       └─ web:     next dev --port 3001（:3001）
4. 退出（Ctrl+C）       若 db/.mysqld.pid 存在，调用 db:stop 清理
```

### 7.2 数据库管理（`scripts/db.js`）

| 子命令 | 作用 |
|--------|------|
| `start` | 后台启动 mysqld，轮询端口就绪，写 PID 文件 |
| `stop` | 按 PID 文件停止本脚本拉起的 mysqld（Windows 用 `taskkill /T`） |
| `status` | 探测 3306 端口是否在监听 |

### 7.3 Docker 部署（`docker-compose.yml`）

由 `depends_on` + `healthcheck` 保证启动顺序：

```
db（MySQL）healthy ──→ backend 启动 ──→ web 启动
```

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

---

## 八、任务编排（Turborepo）

[turbo.json](../turbo.json) 定义任务依赖：

| 任务 | 依赖 | 输出 | 缓存 |
|------|------|------|------|
| `build` | `^build`（先构建依赖包） | `dist/**` | 默认开启 |
| `dev` | 无 | — | 关闭（`persistent: true`） |
| `lint` | 无 | — | 默认开启 |
| `test` | `build` | — | 默认开启 |

常用命令：

```bash
pnpm dev                            # 启动所有应用（本地开发编排）
pnpm turbo run dev --filter=backend # 只启动 backend
pnpm build                          # 构建所有应用
pnpm turbo run build --filter=web  # 只构建 web
pnpm lint                           # 检查所有应用
pnpm test                           # 测试所有应用
```

---

## 九、本地 vs Docker 对比

| 维度 | 本地开发（pnpm dev） | Docker 部署（docker compose） |
|------|----------------------|-------------------------------|
| 启动目标 | 宿主机 Node 进程，热重载 | 容器化进程，生产构建产物 |
| 依赖 | Node + pnpm + 内置 MySQL | 仅需 Docker |
| MySQL | 便携 ZIP 版（`db/mysql/`） | 官方 `mysql:8.0` 镜像 |
| 数据库连接 | `localhost:3306` | `db:3306`（服务名） |
| 前端调后端 | `localhost:3000` | SSR 走 `backend:3000`，浏览器走 `localhost:3000` |
| 适用场景 | 日常开发联调 | 集成测试、生产部署、干净环境复现 |

两种方式**互不依赖**，可独立使用，但不要同时混跑（端口冲突 3000/3001/3306）。

---

## 十、扩展指引

### 10.1 新增后端业务模块

1. 在 `apps/backend/src/<domain>/` 下创建 module/controller/service/entity/dto
2. entity 用 `@Entity('<table_name>')` 装饰，并在 `app.module.ts` 的 `TypeOrmModule.forRoot({ entities: [...] })` 注册
3. 在 `app.module.ts` 的 `imports` 加入新模块
4. 在 `scripts/seed.sql` 同步 DDL（保持与 entity 一致）

### 10.2 新增前端页面

1. 在 `apps/web/src/app/<route>/page.tsx` 创建页面（App Router 文件路由）
2. 客户端组件加 `'use client'`，用 `fetch(NEXT_PUBLIC_API_URL + '/api/v1/...')` 调后端

### 10.3 新增共享包

1. 在 `packages/<name>/` 下创建包，配 `package.json`
2. 在 `apps/<app>/package.json` 的 `dependencies` 加 `"@reader/<name>": "workspace:*"`
3. `pnpm install` 后即可 `import`

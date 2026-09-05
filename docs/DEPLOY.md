# Docker 部署指南

本项目通过根目录的 [docker-compose.yml](../docker-compose.yml) 把 **backend、web、MySQL** 三个服务一次性容器化编排。本文档补充 README 中 Docker 部署方式的细节：架构、命令、环境变量、常见问题。

> 想要快速上手，直接看 README 的「方式二：Docker 部署」即可。本文档用于排查和定制。

## 一、与本地开发的区别

| 维度 | 本地开发（pnpm dev） | Docker 部署（docker compose） |
|------|----------------------|-------------------------------|
| 启动目标 | 宿主机 Node 进程，热重载 | 容器化进程，生产构建产物 |
| 依赖 | 需本机 Node + pnpm + MySQL | 仅需 Docker，MySQL 在容器内 |
| 数据库连接 | backend 连 `localhost:3306` | backend 连 `db:3306`（服务名） |
| 前端调后端 | 浏览器/SSR 都走 `localhost:3000` | SSR 走 `http://backend:3000`，浏览器走 `localhost:3000` |
| 适用场景 | 日常开发联调 | 集成测试、生产部署、干净环境复现 |

两种方式**互不依赖**，可独立使用。不要同时混跑，避免端口冲突（都占用 3000/3001/3306）。

## 二、架构

```
┌──────────────────────────────────────────────────────┐
│                  Docker 默认网络                      │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │   web    │───▶│ backend  │───▶│      db      │   │
│  │ Next.js  │    │ NestJS   │    │  MySQL 8.0   │   │
│  │ :3001    │    │ :3000    │    │   :3306      │   │
│  └──────────┘    └──────────┘    └──────────────┘   │
│       │               │                  │           │
└───────┼───────────────┼──────────────────┼───────────┘
        │               │                  │
   :3001(宿主)      :3000(宿主)        :3306(宿主)
   浏览器访问        API/Swagger        可选外部连接
```

- 三个容器加入同一个默认网络，**通过服务名互相访问**：
  - `web` → `backend:3000`（SSR fetch）
  - `backend` → `db:3306`（TypeORM 连接）
- 宿主机通过 `localhost:端口` 访问对应容器。
- 启动顺序由 `depends_on` 保证：`db` 健康检查通过 → `backend` 启动 → `web` 启动。

## 三、文件分布

| 文件 | 作用 |
|------|------|
| [docker-compose.yml](../docker-compose.yml) | 根级编排，定义 db / backend / web 三服务 |
| [apps/backend/Dockerfile](../apps/backend/Dockerfile) | NestJS 多阶段构建：builder 编译 → runner 跑 `dist/main.js` |
| [apps/web/Dockerfile](../apps/web/Dockerfile) | Next.js 多阶段构建：builder `next build` → runner 跑 `standalone` 产物 |

两个 Dockerfile 的构建上下文（build context）都是**项目根目录**，因此 `COPY apps/backend ...` 这类路径才能生效。compose 文件里 `context: .` 正是为此设置。

## 四、常用命令

所有命令在**项目根目录**执行。

### 4.1 启动

```bash
# 前台启动并实时输出日志，Ctrl+C 停止
docker compose up

# 首次启动或代码/依赖变更后，强制重新构建镜像
docker compose up --build

# 后台启动
docker compose up -d

# 只构建镜像不启动
docker compose build
```

### 4.2 查看

```bash
# 查看容器状态
docker compose ps

# 实时查看所有服务日志
docker compose logs -f

# 只看某个服务的日志
docker compose logs -f backend
docker compose logs -f web
docker compose logs -f db
```

### 4.3 停止与清理

```bash
# 停止并删除容器、网络（保留数据卷）
docker compose down

# 停止并删除容器、网络、数据卷（⚠️ 清空数据库数据）
docker compose down -v

# 仅停止不删除
docker compose stop

# 重新启动已存在的容器（不再构建）
docker compose start
```

### 4.4 进入容器调试

```bash
# 进入 backend 容器 shell
docker compose exec backend sh

# 进入 MySQL 命令行
docker compose exec db mysql -uroot -prootpassword reader
```

## 五、服务详情

### 5.1 db（MySQL 8.0）

| 项 | 值 |
|----|----|
| 镜像 | `mysql:8.0` |
| 容器内端口 | 3306 |
| 宿主机映射 | `3306:3306` |
| root 密码 | `rootpassword` |
| 默认库 | `reader`（启动时自动创建） |
| 数据持久化 | 命名卷 `mysql_data` → `/var/lib/mysql` |
| 健康检查 | `mysqladmin ping -h localhost`，5s 一次，最多重试 10 次 |

数据卷在 `docker compose down` 时**不会**被删除，只有加 `-v` 才会清空。

### 5.2 backend（NestJS）

| 项 | 值 |
|----|----|
| 构建产物 | `apps/backend/dist/main.js` |
| 容器内端口 | 3000 |
| 宿主机映射 | `3000:3000` |
| 启动命令 | `node dist/main.js` |
| 启动依赖 | `db` 健康 |

注入的环境变量（覆盖 `apps/backend/src/app.module.ts` 的默认值）：

| 变量 | 值 | 说明 |
|------|----|----|
| `DB_HOST` | `db` | 指向 MySQL 服务名 |
| `DB_PORT` | `3306` | |
| `DB_USERNAME` | `root` | |
| `DB_PASSWORD` | `rootpassword` | 与 db 服务的 `MYSQL_ROOT_PASSWORD` 一致 |
| `DB_DATABASE` | `reader` | 与 db 服务的 `MYSQL_DATABASE` 一致 |

> ⚠️ 修改 db 的密码/库名时，必须**同步修改** backend 的 `DB_PASSWORD` / `DB_DATABASE`，否则连接会失败。

### 5.3 web（Next.js）

| 项 | 值 |
|----|----|
| 构建模式 | `output: 'standalone'`（见 `apps/web/next.config.ts`） |
| 容器内端口 | 3001 |
| 宿主机映射 | `3001:3001` |
| 启动命令 | `node server.js`（standalone 产物入口） |
| 启动依赖 | `backend`（弱依赖，仅顺序保证） |

注入的环境变量：

| 变量 | 值 | 说明 |
|------|----|----|
| `PORT` | `3001` | Next.js standalone 监听端口 |
| `HOSTNAME` | `0.0.0.0` | 必须为 0.0.0.0 才能被容器外访问 |
| `API_URL` | `http://backend:3000` | **服务端渲染（SSR）** 调后端的地址，走内部网络 |

> 关于前端访问后端的两个地址：
> - **SSR / Server Component** 在容器内执行，用 `API_URL=http://backend:3000` 走内部网络。
> - **浏览器端**代码在用户浏览器执行，无法解析 `backend` 这个服务名，需用 `NEXT_PUBLIC_API_URL`。该变量在 `apps/web/.env.local` 中为 `http://localhost:3000`，是**构建时**内联到前端产物里的。所以浏览器请求会打到宿主机的 3000 端口，再由 Docker 转发到 backend 容器。

## 六、自定义配置

### 6.1 改数据库密码 / 库名

编辑 [docker-compose.yml](../docker-compose.yml)，同时改 db 与 backend 两处：

```yaml
  db:
    environment:
      MYSQL_ROOT_PASSWORD: <新密码>      # ← 改这里
      MYSQL_DATABASE: <新库名>           # ← 改这里

  backend:
    environment:
      DB_PASSWORD: <新密码>              # ← 与上面一致
      DB_DATABASE: <新库名>              # ← 与上面一致
```

改密码后**已有数据卷**里的 root 密码不会自动更新，需先 `docker compose down -v` 清空卷再重新启动。

### 6.2 改端口

只想改宿主机映射端口（容器内不变），例如宿主机 8080 → 容器 3000：

```yaml
  backend:
    ports:
      - "8080:3000"   # 宿主机:容器
```

改完后浏览器端的 `NEXT_PUBLIC_API_URL` 也需相应调整（如 `http://localhost:8080`），并重新构建 web 镜像。

### 6.3 仅重建某个服务

```bash
# 代码变更后只重建并重启 backend
docker compose up -d --build backend

# 只重启 web
docker compose up -d --build web
```

## 七、常见问题

### Q1：启动后 backend 一直报 `ECONNREFUSED` 连不上数据库

- 确认 `db` 容器健康：`docker compose ps`，db 列应显示 `healthy`。
- 确认 `DB_HOST=db` 而非 `localhost`（容器内 localhost 指向容器自身）。
- 确认 `DB_PASSWORD` 与 `MYSQL_ROOT_PASSWORD` 完全一致。

### Q2：端口被占用（`port is already allocated` / `address already in use`）

宿主机 3000 / 3001 / 3306 已被其他进程占用。两个解法：
- 停掉占用进程；
- 或按 6.2 改 compose 的宿主机端口映射。

### Q3：改了代码但启动后没生效

`docker compose up` 默认复用旧镜像。代码变更后必须加 `--build`：
```bash
docker compose up --build
```

### Q4：`docker compose down -v` 后再启动，数据库是空的

这是预期行为 —— `-v` 删除了 `mysql_data` 卷。TypeORM 的 `synchronize: true`（见 `app.module.ts`）会在 backend 启动时按 entity 自动建表，但**不会**恢复业务数据。

### Q5：web 浏览器请求报 CORS / 连不上后端

浏览器端用的是 `NEXT_PUBLIC_API_URL`（来自 `apps/web/.env.local`），不是 compose 里的 `API_URL`。若改了 backend 宿主机端口，需同步改 `.env.local` 并重新构建 web 镜像。

### Q6：想看 backend 的 Swagger 文档

启动后访问 `http://localhost:3000`（具体路径取决于 `apps/backend/src/main.ts` 中 Swagger 的挂载路径）。

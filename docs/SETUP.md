# 🛠️ 开发环境配置指南

本文档说明在宿主机上配置并启动本地开发环境的全部步骤：依赖安装、数据库准备、环境变量、启动命令。

> 想直接跑起来，看根 [README.md](../README.md) 的「方式一：本地开发」即可；本文档用于排查和定制。
> Docker 部署方式见 [DEPLOYMENT.md](./DEPLOYMENT.md)，两种方式互不依赖。

---

## 一、前置要求

| 工具 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18+ | 推荐使用 LTS（如 20.x / 22.x） |
| pnpm | 9+ | 项目指定 `pnpm@11.25.0`（见根 `package.json` 的 `packageManager`） |
| MySQL | 8.0+ | **无需本机预装**，项目内置便携版（见下节） |
| Git | 任意 | 拉取代码、提交 |

> Windows 用户：若 PowerShell 执行策略阻止 `pnpm.ps1`，可直接 `node scripts/dev.js` 启动，或执行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 后再用 `pnpm`。

---

## 二、数据库准备（便携版 MySQL）

项目把 MySQL 8.0 的免安装 ZIP 版集中放在根目录 `db/` 下，免系统服务、免管理员权限：

```
db/
├── mysql/          ← MySQL 解压文件（需自行下载，见 MYSQL_SETUP.md 第一步）
│   └── bin/mysqld  ← 数据库服务进程
├── data/           ← 初始化后自动生成（与 mysql/ 同级）
├── my.ini          ← 配置文件（端口 3306、utf8mb4、InnoDB）
└── .mysqld.pid     ← db:start 启动后生成的 PID 文件
```

`db/mysql/`、`db/data/`、`db/.mysqld.pid` 已在 `.gitignore` 中忽略，不会提交。

### 首次准备

1. 下载 MySQL ZIP 并解压到 `db/mysql/`
2. 用 `--defaults-file=db/my.ini --initialize-insecure` 初始化 `db/data/`
3. 启动后设置 root 密码为 `password`（与后端 `.env` 默认值对齐）

完整步骤见 **[MYSQL_SETUP.md](./MYSQL_SETUP.md)**，包含脚本方式（推荐）和手动方式。

---

## 三、安装依赖

在项目根目录执行：

```bash
pnpm install
```

`pnpm-workspace.yaml` 已声明 `apps/*` 和 `packages/*` 为 workspace 包，pnpm 会自动链接所有子包依赖。

---

## 四、环境变量配置

环境变量按应用分开存放，各应用根目录的 `.env` 文件由 NestJS `ConfigModule` / Next.js 自动加载。

### 4.1 后端 `apps/backend/.env`

后端通过 `DB_*` 连接数据库，参考 [apps/backend/src/app.module.ts](../apps/backend/src/app.module.ts)：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_HOST` | `localhost` | 数据库主机，便携 MySQL 用 `localhost` |
| `DB_PORT` | `3306` | 与 `db/my.ini` 的 `port` 一致 |
| `DB_USERNAME` | `root` | |
| `DB_PASSWORD` | `password` | 首次初始化后需设置，见 [MYSQL_SETUP.md](./MYSQL_SETUP.md) 第四步 |
| `DB_DATABASE` | `reader` | `pnpm dev` 启动时自动 `CREATE DATABASE IF NOT EXISTS` |

项目已提供 `.env.example` 作为模板，复制为 `.env` 后按本机情况修改即可。

### 4.2 前端 `apps/web/.env.local`

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | **浏览器端**调用后端的地址，构建时内联到产物 |

> `NEXT_PUBLIC_` 前缀的变量会在构建时被替换进前端代码，修改后需重启 `next dev`。

### 4.3 Docker 部署的环境变量

Docker 方式的环境变量在 [docker-compose.yml](../docker-compose.yml) 中注入，详见 [DEPLOYMENT.md](./DEPLOYMENT.md) 第五节。

---

## 五、启动方式

### 5.1 一键启动（推荐）

```bash
pnpm dev
```

底层执行 `node scripts/dev.js`，按以下顺序自动编排：

```
启动 MySQL（db:start）→ 等待 3306 就绪 → 确保 reader 库存在 → turbo run dev（backend + web 并行）
```

- 若 MySQL 已在运行，会跳过启动直接复用
- Ctrl+C 退出时，若 MySQL 是本脚本拉起的，会自动 `db:stop` 清理

> 在沙箱/受限 PowerShell 中，`pnpm` 脚本可能被执行策略拦截，可改用 `node scripts/dev.js` 直接启动。

### 5.2 单独控制数据库

```bash
pnpm db:start     # 后台启动 mysqld，轮询 3306 直到就绪，写 PID 文件
pnpm db:status    # 探测 3306 是否在监听
pnpm db:stop       # 按 PID 文件停止本脚本拉起的 mysqld
```

> `db:stop` 仅能停止由 `db:start` 启动的实例。若 MySQL 以 Windows 服务方式运行，请用 `net stop MySQL_Reader`。

### 5.3 单独启动某个应用

需先 `pnpm db:start` 拉起数据库，再单独启动应用：

```bash
pnpm turbo run dev --filter=backend   # 仅启动后端（NestJS watch 模式，:3000）
pnpm turbo run dev --filter=web       # 仅启动 Web（Next.js dev，:3001）
```

### 5.4 构建、检查、测试

```bash
pnpm build          # 构建所有应用
pnpm turbo run build --filter=web    # 只构建指定应用
pnpm lint           # 代码检查
pnpm test           # 测试
```

---

## 六、访问地址

本地开发启动后：

| 服务 | 地址 | 说明 |
|------|------|------|
| Web 前端 | http://localhost:3001 | Next.js（App Router） |
| Backend API | http://localhost:3000 | NestJS，全局前缀 `/api/v1` |
| Swagger 文档 | http://localhost:3000/api-docs | 由 `@nestjs/swagger` 挂载 |
| MySQL | localhost:3306 | root / password，库名 `reader` |

> H5 端（`apps/h5`）、App 端（`apps/app`）目前为规划中，目录为空占位（`.gitkeep`），暂无访问地址。后续实现后会另分配端口并在本表补充。

---

## 七、自定义配置

### 7.1 改数据库端口

1. 改 `db/my.ini` 中 `[mysqld]` / `[client]` 的 `port`（如 3307）
2. 同步改 `apps/backend/.env` 的 `DB_PORT=3307`
3. 重启 `pnpm dev`

### 7.2 改数据库密码

```bash
mysql -u root -ppassword -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '<新密码>'; FLUSH PRIVILEGES;"
```

然后同步改 `apps/backend/.env` 的 `DB_PASSWORD=<新密码>`。

### 7.3 改后端端口

后端端口硬编码在 [apps/backend/src/main.ts](../apps/backend/src/main.ts) 的 `app.listen(3000)`。修改后需同步改 `apps/web/.env.local` 的 `NEXT_PUBLIC_API_URL`。

---

## 八、常见问题

| 问题 | 解决方案 |
|------|----------|
| `pnpm` 命令被 PowerShell 执行策略拦截 | 用 `node scripts/dev.js` 启动，或 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| 缺少 `VCRUNTIME140.dll` | 安装 Visual C++ Redistributable（见 [MYSQL_SETUP.md](./MYSQL_SETUP.md) 常见问题） |
| 端口 3306 被占用 | 改 `db/my.ini` 的 `port` 和 `.env` 的 `DB_PORT`，或停掉占用进程 |
| 后端报 `ECONNREFUSED` 连不上数据库 | 先 `pnpm db:status` 确认 MySQL 在运行 |
| 后端报 `Access denied for user 'root'` | 确认 root 密码与 `apps/backend/.env` 的 `DB_PASSWORD` 一致 |
| `db/data/` 位置不对 | 初始化时必须加 `--defaults-file=db/my.ini`，见 [MYSQL_SETUP.md](./MYSQL_SETUP.md) 第三步 |
| 改了代码但没生效 | NestJS / Next.js 均为 watch 模式，保存即可热重载；若无效重启 `pnpm dev` |

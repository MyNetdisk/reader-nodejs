# 🗄️ 数据库设计与规范

本文档说明项目的数据库选型、连接配置、表结构设计、命名规范和建表方式。

> 数据库的安装、初始化、启动脚本见 [MYSQL_SETUP.md](./MYSQL_SETUP.md)；连接环境变量见 [SETUP.md](./SETUP.md) 第四节。

---

## 一、数据库选型

| 项 | 值 | 说明 |
|----|----|------|
| 数据库 | MySQL 8.0 | 本地用便携 ZIP 版，Docker 用官方 `mysql:8.0` 镜像 |
| 字符集 | `utf8mb4` | 支持 emoji 和完整 Unicode，**禁止用 utf8（即 utf8mb3）** |
| 排序规则 | `utf8mb4_unicode_ci` | 大小写不敏感，符合业务预期 |
| 存储引擎 | `InnoDB` | 支持事务、行锁、外键 |
| 最大连接数 | 200 | 见 `db/my.ini` 的 `max_connections` |
| 端口 | 3306 | 本地与 Docker 均用此端口 |

字符集和引擎配置在 [db/my.ini](../db/my.ini)（本地）和 [docker-compose.yml](../docker-compose.yml)（Docker）中。

---

## 二、连接配置

后端通过 TypeORM 连接 MySQL，连接参数来自 `apps/backend/.env` 的 `DB_*` 环境变量：

| 变量 | 本地开发 | Docker 部署 |
|------|----------|-------------|
| `DB_HOST` | `localhost` | `db`（服务名） |
| `DB_PORT` | `3306` | `3306` |
| `DB_USERNAME` | `root` | `root` |
| `DB_PASSWORD` | `password` | `rootpassword` |
| `DB_DATABASE` | `reader` | `reader` |

TypeORM 配置在 [apps/backend/src/app.module.ts](../apps/backend/src/app.module.ts)：

```ts
TypeOrmModule.forRoot({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'reader',
  entities: [Book],
  synchronize: true,   // 开发环境自动建表/同步表结构
})
```

> ⚠️ `synchronize: true` 仅用于开发环境，会根据 entity 自动修改表结构。**生产环境必须关闭**，改用迁移（migration）。

---

## 三、库与表

### 3.1 数据库 `reader`

业务库，库名 `reader`。

- 本地：`pnpm dev` 启动时由 [scripts/dev.js](../scripts/dev.js) 自动 `CREATE DATABASE IF NOT EXISTS reader CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
- Docker：由 `docker-compose.yml` 的 `MYSQL_DATABASE: reader` 在容器首次启动时自动创建

### 3.2 表结构

#### `books` —— 书籍表

对应 entity：[apps/backend/src/book/entities/book.entity.ts](../apps/backend/src/book/entities/book.entity.ts)

| 列名 | TS 属性 | 类型 | 约束 | 说明 |
|------|--------|------|------|------|
| `id` | `id` | INT | PK, AUTO_INCREMENT | 主键 |
| `title` | `title` | VARCHAR(255) | NOT NULL | 书名 |
| `author` | `author` | VARCHAR(255) | NOT NULL | 作者 |
| `description` | `description` | TEXT | NULL | 简介 |
| `cover_url` | `coverUrl` | VARCHAR(500) | NULL | 封面地址 |
| `created_at` | `createdAt` | DATETIME(6) | NOT NULL, DEFAULT `CURRENT_TIMESTAMP(6)` | 创建时间 |
| `updated_at` | `updatedAt` | DATETIME(6) | NOT NULL, `ON UPDATE CURRENT_TIMESTAMP(6)` | 更新时间 |

建表 DDL 见 [scripts/seed.sql](../scripts/seed.sql)，与 entity 完全对齐：

```sql
CREATE TABLE IF NOT EXISTS `books` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL COMMENT '书名',
  `author` VARCHAR(255) NOT NULL COMMENT '作者',
  `description` TEXT NULL COMMENT '简介',
  `cover_url` VARCHAR(500) NULL COMMENT '封面地址',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 四、命名规范

### 4.1 表与列

| 对象 | 规范 | 示例 |
|------|------|------|
| 表名 | 复数形式，全小写 snake_case，反引号包裹 | `` `books` `` |
| 列名 | 全小写 snake_case | `cover_url`、`created_at` |
| 主键 | 统一用 `id` | `id` |
| 创建时间 | `created_at`，类型 `DATETIME(6)` | |
| 更新时间 | `updated_at`，类型 `DATETIME(6)`，`ON UPDATE` | |
| 布尔列 | `is_` / `has_` 前缀 | `is_deleted`、`has_cover` |
| 外键列 | `<关联表单数>_id` | `user_id`、`book_id` |

### 4.2 TypeScript Entity

| 对象 | 规范 | 示例 |
|------|------|------|
| 类名 | 单数形式 PascalCase | `Book` |
| 属性 | camelCase | `coverUrl`、`createdAt` |
| 主键 | `@PrimaryGeneratedColumn()` | `id: number` |
| 创建时间 | `@CreateDateColumn({ name: 'created_at' })` | `createdAt: Date` |
| 更新时间 | `@UpdateDateColumn({ name: 'updated_at' })` | `updatedAt: Date` |

> TypeORM 默认把 camelCase 属性映射为同名列，因此**多词列必须显式指定 `name`**：`@Column({ name: 'cover_url' })`。

### 4.3 字符集

- 库、表、列统一 `utf8mb4` / `utf8mb4_unicode_ci`
- 不使用 `utf8`（MySQL 中 `utf8` 是 `utf8mb3`，不支持 4 字节字符）

---

## 五、建表与数据初始化

### 5.1 自动建表（开发环境）

TypeORM `synchronize: true` 会在后端启动时按 entity 自动创建/修改表结构，无需手动执行 DDL。适合开发期快速迭代。

> 局限：`synchronize` 只保证表结构匹配 entity，不会恢复业务数据；删列/改类型时可能丢数据。

### 5.2 种子数据

示例数据在 [scripts/seed.sql](../scripts/seed.sql)，包含建表 DDL 和 3 条示例书籍（三体/活着/百年孤独）。执行方式：

```powershell
# Windows PowerShell（通过 stdin 传给 mysql 客户端）
Get-Content scripts\seed.sql -Raw | & db\mysql\bin\mysql.exe -u root -ppassword
```

```bash
# Linux / Git Bash
mysql -u root -ppassword < scripts/seed.sql
```

`seed.sql` 用 `ON DUPLICATE KEY UPDATE` 实现幂等，可重复执行。

### 5.3 迁移（生产环境，规划中）

生产环境应关闭 `synchronize`，改用 TypeORM migration：

```bash
# 规划中的命令（尚未实现）
pnpm typeorm migration:generate -d apps/backend/src/database/data-source
pnpm typeorm migration:run -d apps/backend/src/database/data-source
```

---

## 六、数据访问层

### 6.1 分层

```
Controller (HTTP)  →  Service (业务)  →  Repository (TypeORM)  →  MySQL
```

- **Controller**：处理 HTTP 请求/响应，见 [apps/backend/src/book/book.controller.ts](../apps/backend/src/book/book.controller.ts)
- **Service**：业务逻辑，通过 `@InjectRepository(Book)` 注入 Repository，见 [apps/backend/src/book/book.service.ts](../apps/backend/src/book/book.service.ts)
- **Repository**：TypeORM 提供的 CRUD 能力，无需手写 SQL

### 6.2 REST 接口

后端全局前缀 `/api/v1`（见 [main.ts](../apps/backend/src/main.ts)），`books` 模块路由：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/books` | 获取所有书籍 |
| `GET` | `/api/v1/books/:id` | 根据 ID 获取书籍 |
| `POST` | `/api/v1/books` | 创建新书籍 |
| `PUT` | `/api/v1/books/:id` | 更新书籍信息 |
| `DELETE` | `/api/v1/books/:id` | 删除书籍 |

Swagger 文档在 http://localhost:3000/api-docs。

---

## 七、规范要点总结

1. **字符集**统一 `utf8mb4` / `utf8mb4_unicode_ci`，禁用 `utf8mb3`
2. **表名**复数 snake_case，**entity 类名**单数 PascalCase
3. **列名**snake_case，**TS 属性**camelCase，多词列在 `@Column({ name })` 显式指定
4. **主键**统一 `id` INT AUTO_INCREMENT
5. **时间列**用 `DATETIME(6)`，配 `@CreateDateColumn` / `@UpdateDateColumn`
6. **开发环境**用 `synchronize: true` 快速迭代；**生产环境**必须关闭并改用 migration
7. **DDL 与 entity 必须保持一致**：修改 entity 时同步更新 `scripts/seed.sql` 中的 DDL

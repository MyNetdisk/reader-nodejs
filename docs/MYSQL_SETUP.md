# 🗄️ 本地 MySQL 安装与配置（免安装 ZIP 版）

本文档说明如何在本地开发环境中安装并配置 MySQL 8.0（免安装 ZIP 版），以及如何通过项目脚本一键启动/停止数据库。

> 数据库表结构设计见 [DATABASE.md](./DATABASE.md)。

## 目录结构

项目将 MySQL 相关文件统一放在根目录 `db/` 下：

```text
reader-nodejs/
├── db/
│   ├── mysql/              ← MySQL 解压文件（需自行下载解压）
│   │   ├── bin/
│   │   ├── lib/
│   │   ├── share/
│   │   └── ...
│   ├── data/               ← 初始化后自动生成（与 mysql/ 同级）
│   ├── my.ini              ← 配置文件（与 mysql/ 同级）
│   └── .mysqld.pid         ← db:start 启动后生成的 PID 文件（自动管理）
└── ...
```

`db/mysql/` 与 `db/data/` 已加入 `.gitignore`，不会被提交。

## 方式一：使用项目脚本（推荐）

项目已封装好数据库启动/停止脚本，开箱即用：

```bash
# 后台启动 MySQL（自动读取 db/my.ini，等待端口就绪后返回）
pnpm db:start

# 查看运行状态
pnpm db:status

# 停止 MySQL（按 PID 文件结束进程）
pnpm db:stop
```

`pnpm db:start` 会：

1. 检测 3306 端口，若 MySQL 已在运行则跳过
2. 以 `db/my.ini` 为配置启动 `mysqld`
3. 轮询等待 3306 端口就绪后写入 PID 文件并返回

> ⚠️ `db:stop` 仅能停止由 `db:start` 启动的实例。若 MySQL 以 Windows 服务方式运行，请用 `net stop MySQL_Reader`。

### 配合后端开发

无需单独执行 `db:start`，直接运行：

```bash
pnpm dev
```

`pnpm dev`（`scripts/dev.js`）会按以下顺序自动编排：

```
启动 MySQL → 等待 3306 就绪 → 确保 reader 库存在 → 启动 backend + web
```

退出时（Ctrl+C）会自动停止本脚本拉起的 MySQL 进程。

***

## 方式二：手动安装与配置

如果需要完全手动控制 MySQL（例如注册为 Windows 服务），按以下步骤操作。

### 第一步：下载与解压

1. 前往 MySQL 官网下载页面，选择 **MySQL Community Server**
2. 操作系统选 **Microsoft Windows**
3. 下载 **ZIP Archive** 版本（如 `mysql-8.0.xx-winx64.zip`），**不要选 MSI Installer**
4. 将 ZIP 文件解压到项目的 `db/mysql/` 目录下

解压后目录结构如下：

```text
db/
└── mysql/
    ├── bin/          ← MySQL 可执行文件
    ├── lib/
    ├── share/
    ├── docs/
    └── ...
```

> ⚠️ 解压路径中**不要有中文、空格和特殊字符**，否则可能导致启动失败。

### 第二步：配置文件 `my.ini`

项目已提供 `db/my.ini`，核心配置如下：

```ini
[mysqld]
basedir=C:/Users/MyNetdisk/Documents/Project/ebook-platform/reader-nodejs/db/mysql
datadir=C:/Users/MyNetdisk/Documents/Project/ebook-platform/reader-nodejs/db/data
port=3306
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
default-storage-engine=INNODB
max_connections=200

[mysql]
default-character-set=utf8mb4

[client]
port=3306
default-character-set=utf8mb4
```

> ⚠️ 注意事项：
>
> * `basedir` 和 `datadir` 请替换为你本机的实际项目路径
>
> * 路径分隔符用**正斜杠** **`/`** 或**双反斜杠** **`\\`**，不要用单反斜杠 `\`
>
> * 文件编码保存为 **ANSI** 或 **UTF-8 无 BOM**

### 第三步：初始化数据库

以**管理员身份**打开 CMD，进入 `db/mysql/bin` 执行：

```bash
cd C:\Users\MyNetdisk\Documents\Project\ebook-platform\reader-nodejs\db\mysql\bin

mysqld --defaults-file="C:\Users\MyNetdisk\Documents\Project\ebook-platform\reader-nodejs\db\my.ini" --initialize-insecure --console
```

> ⚠️ **关键**：初始化时必须通过 `--defaults-file` 指定配置文件路径，否则 MySQL 会忽略 `my.ini` 中的 `datadir` 配置，将 `data` 目录默认创建在 `mysql/` 内部而非与 `mysql/` 同级。

执行成功后，`db/data/` 目录会自动生成。`--initialize-insecure` 表示 root 初始为空密码。

### 第四步：设置 root 密码

启动 MySQL 后（见第五步），登录并修改密码：

```bash
mysql -u root
```

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'password';
FLUSH PRIVILEGES;
EXIT;
```

> 后端 `.env` 中默认密码为 `password`，请保持一致。如需修改，请同步更新 `apps/backend/.env`。

### 第五步：启动 MySQL

**方式 A：前台运行（调试用）**

```bash
mysqld --defaults-file="C:\Users\MyNetdisk\Documents\Project\ebook-platform\reader-nodejs\db\my.ini" --console
```

窗口保持打开即可，另开 CMD 执行 `mysql -u root -p` 连接。

**方式 B：注册为 Windows 服务（推荐长期使用）**

```bash
# 注册服务
mysqld --install MySQL_Reader --defaults-file="C:\Users\MyNetdisk\Documents\Project\ebook-platform\reader-nodejs\db\my.ini"

# 启动服务
net start MySQL_Reader

# 停止服务
net stop MySQL_Reader
```

> ⚠️ 如果服务启动失败，常见原因是 Windows 服务以 `SYSTEM` 账户运行，可能没有权限访问 `C:\Users\...` 下的用户目录。此时可改用前台方式（方式 A）或 `pnpm db:start`。

### 第六步：验证安装

```bash
mysql --version
mysql -u root -p -e "SELECT 1;"
```

***

## 常用命令速查

| 操作       | 命令                                                         |
| :------- | :--------------------------------------------------------- |
| 脚本启动     | `pnpm db:start`                                            |
| 脚本停止     | `pnpm db:stop`                                             |
| 脚本状态     | `pnpm db:status`                                           |
| 服务启动     | `net start MySQL_Reader`                                   |
| 服务停止     | `net stop MySQL_Reader`                                    |
| 登录 MySQL | `mysql -u root -p`                                         |
| 卸载服务     | 先 `net stop MySQL_Reader`，再 `mysqld --remove MySQL_Reader` |

***

## 常见问题排查

| 问题                    | 解决方案                                                                                     |
| :-------------------- | :--------------------------------------------------------------------------------------- |
| 缺少 `VCRUNTIME140.dll` | 安装 Visual C++ Redistributable                                                            |
| 端口 3306 被占用           | 修改 `my.ini` 中的 `port` 为其他端口（如 3307），并同步更新 `apps/backend/.env` 的 `DATABASE_PORT`          |
| 服务启动失败                | 检查 `my.ini` 路径是否正确、是否以管理员身份运行                                                            |
| `data` 目录位置不对         | 初始化时必须加 `--defaults-file` 参数指定配置文件                                                       |
| 后端连不上数据库              | 确认 root 密码与 `apps/backend/.env` 中 `DATABASE_PASSWORD` 一致                                 |
| 忘记密码                  | 停止服务 → `my.ini` 的 `[mysqld]` 下添加 `skip-grant-tables` → 启动服务 → 免密登录 → 重置密码 → 删除该配置 → 重启服务 |


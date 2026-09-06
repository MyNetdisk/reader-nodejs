#!/usr/bin/env node
/**
 * 本地开发编排脚本
 *
 * 启动顺序：
 *   1. 启动本地 MySQL（db/mysqld，通过 scripts/db.js start）
 *   2. 等待 3306 端口就绪
 *   3. 用 root 账号确保 reader 库存在
 *   4. 启动 turbo run dev（backend + web 并行）
 *
 * 退出（Ctrl+C / turbo 退出）时，若 MySQL 是由本脚本拉起的，会自动停止。
 *
 * 环境变量（可选，默认与 db/my.ini + apps/backend/.env 对齐）：
 *   DB_HOST、DB_PORT、DB_USERNAME、DB_PASSWORD、DB_DATABASE
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DB_DIR = join(ROOT, 'db');
const MYSQL_BIN_DIR = join(DB_DIR, 'mysql', 'bin');
const PID_FILE = join(DB_DIR, '.mysqld.pid');
const DB_JS = join(__dirname, 'db.js');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USERNAME || 'root';
const DB_PASS = process.env.DB_PASSWORD ?? 'password';
const DB_NAME = process.env.DB_DATABASE || 'reader';

const isWin = process.platform === 'win32';
const mysqlExe = isWin ? join(MYSQL_BIN_DIR, 'mysql.exe') : 'mysql';

function log(msg) {
  console.log(`[dev] ${msg}`);
}

function run(cmd, args, opts = {}) {
  // 默认 shell:false，避免 cmd.exe 解析参数中的反引号等特殊字符
  return spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
}

function startMysql() {
  log('启动数据库...');
  const r = run(process.execPath, [DB_JS, 'start']);
  if (r.status !== 0) {
    log('数据库启动失败，终止。');
    process.exit(1);
  }
}

function ensureDatabase() {
  if (!existsSync(mysqlExe)) {
    log(`找不到 mysql 客户端: ${mysqlExe}`);
    log('请按 docs/MYSQL_SETUP.md 第一步把 MySQL ZIP 解压到 db/mysql/。');
    process.exit(1);
  }
  log(`确保数据库 ${DB_NAME} 存在...`);
  const args = ['-h', DB_HOST, '-P', DB_PORT, '-u', DB_USER, `-p${DB_PASS}`, '-e',
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`];
  const r = run(mysqlExe, args);
  if (r.status !== 0) {
    log(`创建数据库 ${DB_NAME} 失败。`);
    log('请检查 MySQL 是否已启动、root 密码是否与 apps/backend/.env 中 DB_PASSWORD 一致。');
    process.exit(1);
  }
}

function startTurbo() {
  log('启动应用（turbo run dev）...');
  // 直接 node 跑时 PATH 不含 node_modules/.bin，显式解析 turbo 路径
  const turboBin = join(ROOT, 'node_modules', '.bin', isWin ? 'turbo.cmd' : 'turbo');
  if (!existsSync(turboBin)) {
    log(`找不到 turbo: ${turboBin}`);
    log('请先执行 pnpm install。');
    process.exit(1);
  }
  const child = spawn(turboBin, ['run', 'dev'], {
    stdio: 'inherit',
    shell: isWin, // .cmd 需要 shell 执行
  });

  let stopping = false;
  function cleanup() {
    if (stopping) return;
    stopping = true;
    if (existsSync(PID_FILE)) {
      log('退出时停止本脚本拉起的 MySQL...');
      run(process.execPath, [DB_JS, 'stop']);
    }
  }

  // turbo 在共享终端中收到 Ctrl+C 会自行退出，这里只关心它何时结束
  child.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });

  // 兜底：若收到信号但 child 未退出，主动 kill
  process.on('SIGINT', () => {
    log('收到 Ctrl+C，正在退出...');
    try { child.kill('SIGINT'); } catch {}
    setTimeout(() => {
      cleanup();
      process.exit(0);
    }, 800);
  });
  process.on('SIGTERM', () => {
    try { child.kill('SIGTERM'); } catch {}
    setTimeout(() => {
      cleanup();
      process.exit(0);
    }, 800);
  });
}

startMysql();
ensureDatabase();
startTurbo();

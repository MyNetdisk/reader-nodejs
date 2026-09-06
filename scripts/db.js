#!/usr/bin/env node
/**
 * 本地便携 MySQL 管理（start / stop / status）
 *
 * - 仅依赖项目根目录 db/mysql 下的 mysqld 二进制
 * - 通过 db/my.ini 指定 basedir/datadir/port 等配置
 * - start: 后台拉起 mysqld，轮询 3306 端口直到就绪，写入 PID 文件
 * - stop:  读取 PID 文件，taskkill/kill 终止该进程
 * - status: 探测 3306 端口是否在监听
 *
 * 用法：
 *   node scripts/db.js start
 *   node scripts/db.js stop
 *   node scripts/db.js status
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DB_DIR = join(ROOT, 'db');
const MYSQL_BIN_DIR = join(DB_DIR, 'mysql', 'bin');
const MY_INI = join(DB_DIR, 'my.ini');
const PID_FILE = join(DB_DIR, '.mysqld.pid');

// 与 db/my.ini 中 port 保持一致
const PORT = Number(process.env.DB_PORT) || 3306;
const HOST = '127.0.0.1';

const isWin = process.platform === 'win32';
const mysqldExe = isWin ? join(MYSQL_BIN_DIR, 'mysqld.exe') : 'mysqld';

function log(msg) {
  console.log(`[db] ${msg}`);
}

function isPortListening(port, host = HOST) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port, host = HOST, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortListening(port, host)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function start() {
  if (!existsSync(MY_INI)) {
    log(`找不到配置文件: ${MY_INI}`);
    process.exit(1);
  }
  if (!existsSync(mysqldExe)) {
    log(`找不到 mysqld 可执行文件: ${mysqldExe}`);
    log(`请按 docs/MYSQL_SETUP.md 第一步把 MySQL ZIP 解压到 db/mysql/。`);
    process.exit(1);
  }
  if (await isPortListening(PORT)) {
    log(`端口 ${PORT} 已被占用，MySQL 可能已在运行，跳过启动。`);
    return;
  }
  log(`启动 mysqld（配置: ${MY_INI}）...`);
  const args = [`--defaults-file=${MY_INI}`, '--console'];
  const child = spawn(mysqldExe, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();

  const ready = await waitForPort(PORT, HOST, 30000);
  if (!ready) {
    log(`启动超时（30s 内端口 ${PORT} 未就绪）。`);
    log(`请检查 db/data 是否已初始化（见 docs/MYSQL_SETUP.md 第三步）。`);
    process.exit(1);
  }
  if (child.pid) writeFileSync(PID_FILE, String(child.pid));
  log(`MySQL 已就绪（pid=${child.pid}, port=${PORT}）`);
}

async function status() {
  const up = await isPortListening(PORT);
  if (up) {
    let pidInfo = '';
    if (existsSync(PID_FILE)) {
      pidInfo = `（本脚本记录 pid=${readFileSync(PID_FILE, 'utf8').trim()}）`;
    }
    log(`MySQL 运行中 ${pidInfo}`);
  } else {
    log('MySQL 未运行。');
  }
}

function stop() {
  if (!existsSync(PID_FILE)) {
    log('未找到 PID 文件，无法停止（仅能停止由 db:start 启动的实例）。');
    return;
  }
  const pid = readFileSync(PID_FILE, 'utf8').trim();
  log(`停止 MySQL（pid=${pid}）...`);
  try {
    if (isWin) {
      spawnSync('taskkill', ['/F', '/T', '/PID', pid], { stdio: 'inherit' });
    } else {
      process.kill(Number(pid), 'SIGTERM');
    }
    unlinkSync(PID_FILE);
    log('已停止。');
  } catch (e) {
    log(`停止失败: ${e.message}`);
    process.exit(1);
  }
}

const cmd = process.argv[2];
(async () => {
  switch (cmd) {
    case 'start':
      await start();
      break;
    case 'stop':
      stop();
      break;
    case 'status':
      await status();
      break;
    default:
      console.log('Usage: node scripts/db.js <start|stop|status>');
      process.exit(1);
  }
})();

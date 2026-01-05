/**
 * ============================================================
 * SQLite 数据库模块
 * ============================================================
 * 使用 sql.js 实现真正的 SQLite 持久化存储
 * 管理用户账户信息
 * 
 * sql.js 是一个纯 JavaScript 的 SQLite 实现，无需编译原生模块
 */

import initSqlJs, { Database } from 'sql.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ============================================================
// 数据库初始化
// ============================================================

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库文件路径
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'starjump.db');

/** 数据库实例 */
let db: Database | null = null;

/**
 * 用户数据接口
 */
export interface UserRow {
    id: string;
    username: string;
    password_hash: string;
    created_at: string;
}

/**
 * 初始化数据库
 * 创建必要的表结构
 */
export async function initDatabase(): Promise<void> {
    console.log('[数据库] 初始化 SQLite 数据库...');

    // 确保数据目录存在
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`[数据库] 创建数据目录: ${DATA_DIR}`);
    }

    // 初始化 sql.js
    const SQL = await initSqlJs();

    // 尝试加载现有数据库，如果不存在则创建新的
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log(`[数据库] 加载现有数据库: ${DB_PATH}`);
    } else {
        db = new SQL.Database();
        console.log(`[数据库] 创建新数据库: ${DB_PATH}`);
    }

    // 创建用户表（如果不存在）
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

    // 保存数据库到文件
    saveDatabase();

    console.log('[数据库] SQLite 数据库初始化完成');
}

/**
 * 保存数据库到文件
 */
function saveDatabase(): void {
    if (!db) return;

    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// ============================================================
// 用户操作
// ============================================================

/**
 * 创建新用户
 * @param username 用户名
 * @param password 明文密码
 * @returns 创建的用户对象
 */
export async function createUser(username: string, password: string): Promise<UserRow> {
    if (!db) throw new Error('数据库未初始化');

    // 对密码进行哈希
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 生成唯一ID
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    // 插入用户
    db.run(
        'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
        [id, username, passwordHash, createdAt]
    );

    // 保存到文件
    saveDatabase();

    console.log(`[数据库] 创建用户: ${username}`);

    return {
        id,
        username,
        password_hash: passwordHash,
        created_at: createdAt,
    };
}

/**
 * 根据用户名查找用户
 * @param username 用户名
 * @returns 用户对象，不存在则返回 undefined
 */
export function findUserByUsername(username: string): UserRow | undefined {
    if (!db) return undefined;

    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    stmt.bind([username]);

    if (stmt.step()) {
        const row = stmt.getAsObject() as UserRow;
        stmt.free();
        return row;
    }

    stmt.free();
    return undefined;
}

/**
 * 根据ID查找用户
 * @param id 用户ID
 * @returns 用户对象，不存在则返回 undefined
 */
export function findUserById(id: string): UserRow | undefined {
    if (!db) return undefined;

    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
        const row = stmt.getAsObject() as UserRow;
        stmt.free();
        return row;
    }

    stmt.free();
    return undefined;
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hash 密码哈希
 * @returns 是否匹配
 */
export async function validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * 获取所有用户（用于调试）
 */
export function getAllUsers(): UserRow[] {
    if (!db) return [];

    const results: UserRow[] = [];
    const stmt = db.prepare('SELECT id, username, created_at FROM users');

    while (stmt.step()) {
        results.push(stmt.getAsObject() as UserRow);
    }

    stmt.free();
    return results;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
    if (db) {
        // 保存最终状态
        saveDatabase();
        db.close();
        db = null;
        console.log('[数据库] SQLite 连接已关闭');
    }
}

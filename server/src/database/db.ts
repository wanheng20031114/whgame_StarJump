/**
 * ============================================================
 * 内存数据库模块
 * ============================================================
 * 使用内存存储替代 SQLite（避免原生模块编译问题）
 * 管理用户账户信息（数据在服务器重启后会丢失）
 */

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// 数据类型定义
// ============================================================

/**
 * 用户数据接口
 */
export interface UserRow {
    id: string;
    username: string;
    password_hash: string;
    created_at: string;
}

// ============================================================
// 内存存储
// ============================================================

/** 用户数据存储 */
const users: Map<string, UserRow> = new Map();

/** 用户名到ID的映射 */
const usernameIndex: Map<string, string> = new Map();

/**
 * 初始化数据库
 * （内存版本无需实际初始化，但保留接口兼容性）
 */
export function initDatabase(): void {
    console.log('[数据库] 使用内存存储模式（开发环境）');
    console.log('[数据库] 注意：数据将在服务器重启后丢失');
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
    // 对密码进行哈希
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 生成唯一ID
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    // 创建用户对象
    const user: UserRow = {
        id,
        username,
        password_hash: passwordHash,
        created_at: createdAt,
    };

    // 存储用户
    users.set(id, user);
    usernameIndex.set(username.toLowerCase(), id);

    console.log(`[数据库] 创建用户: ${username}`);

    return user;
}

/**
 * 根据用户名查找用户
 * @param username 用户名
 * @returns 用户对象，不存在则返回 undefined
 */
export function findUserByUsername(username: string): UserRow | undefined {
    const userId = usernameIndex.get(username.toLowerCase());
    if (!userId) return undefined;
    return users.get(userId);
}

/**
 * 根据ID查找用户
 * @param id 用户ID
 * @returns 用户对象，不存在则返回 undefined
 */
export function findUserById(id: string): UserRow | undefined {
    return users.get(id);
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
    return Array.from(users.values()).map(user => ({
        id: user.id,
        username: user.username,
        password_hash: '[HIDDEN]',
        created_at: user.created_at,
    }));
}

/**
 * 关闭数据库连接
 * （内存版本无需关闭，保留接口兼容性）
 */
export function closeDatabase(): void {
    console.log('[数据库] 内存存储已清理');
    users.clear();
    usernameIndex.clear();
}

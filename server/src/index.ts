/**
 * ============================================================
 * 后端服务器入口
 * ============================================================
 * Express + Socket.IO 服务器
 * 提供用户认证和游戏通信服务
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initDatabase, createUser, findUserByUsername, validatePassword } from './database/db.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// 服务器配置
// ============================================================

const PORT = 3000;
const app = express();
const httpServer = createServer(app);

// 配置 CORS
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://www.wszzwh.site', 'https://www.wszzwh.site', 'http://wszzwh.site', 'https://wszzwh.site'],
    credentials: true,
}));

// 解析 JSON 请求体
app.use(express.json());

// ============================================================
// Socket.IO 配置
// ============================================================

const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://www.wszzwh.site', 'https://www.wszzwh.site', 'http://wszzwh.site', 'https://wszzwh.site'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// ============================================================
// 内存中的会话存储（简化版，生产环境应使用 Redis 等）
// ============================================================

interface Session {
    userId: string;
    username: string;
    createdAt: Date;
}

const sessions = new Map<string, Session>();

// ============================================================
// 认证中间件
// ============================================================

/**
 * 验证令牌中间件
 */
function authMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: '未授权' });
        return;
    }

    const token = authHeader.substring(7);
    const session = sessions.get(token);

    if (!session) {
        res.status(401).json({ success: false, message: '会话已过期' });
        return;
    }

    // 将用户信息附加到请求对象
    (req as any).user = session;
    next();
}

// ============================================================
// API 路由
// ============================================================

/**
 * 用户注册
 * POST /api/register
 */
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 验证输入
        if (!username || !password) {
            res.status(400).json({ success: false, message: '用户名和密码不能为空' });
            return;
        }

        if (username.length < 3) {
            res.status(400).json({ success: false, message: '用户名至少3个字符' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ success: false, message: '密码至少6个字符' });
            return;
        }

        // 检查用户名是否已存在
        const existingUser = findUserByUsername(username);
        if (existingUser) {
            res.status(400).json({ success: false, message: '用户名已存在' });
            return;
        }

        // 创建用户
        const user = await createUser(username, password);
        console.log(`[服务器] 用户注册成功: ${username}`);

        res.json({
            success: true,
            message: '注册成功',
            user: {
                id: user.id,
                username: user.username,
                createdAt: user.created_at,
            },
        });
    } catch (error) {
        console.error('[服务器] 注册错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

/**
 * 用户登录
 * POST /api/login
 */
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 验证输入
        if (!username || !password) {
            res.status(400).json({ success: false, message: '用户名和密码不能为空' });
            return;
        }

        // 查找用户
        const user = findUserByUsername(username);
        if (!user) {
            res.status(401).json({ success: false, message: '用户名或密码错误' });
            return;
        }

        // 验证密码
        const isValid = await validatePassword(password, user.password_hash);
        if (!isValid) {
            res.status(401).json({ success: false, message: '用户名或密码错误' });
            return;
        }

        // 创建会话令牌
        const token = uuidv4();
        sessions.set(token, {
            userId: user.id,
            username: user.username,
            createdAt: new Date(),
        });

        console.log(`[服务器] 用户登录成功: ${username}`);

        res.json({
            success: true,
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                createdAt: user.created_at,
            },
        });
    } catch (error) {
        console.error('[服务器] 登录错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

/**
 * 获取当前用户信息
 * GET /api/user
 */
app.get('/api/user', authMiddleware, (req, res) => {
    const session = (req as any).user as Session;

    res.json({
        success: true,
        user: {
            id: session.userId,
            username: session.username,
            createdAt: session.createdAt.toISOString(),
        },
    });
});

/**
 * 用户登出
 * POST /api/logout
 */
app.post('/api/logout', authMiddleware, (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        sessions.delete(token);
    }

    res.json({ success: true, message: '登出成功' });
});

// ============================================================
// Socket.IO 事件处理
// ============================================================

io.on('connection', (socket) => {
    console.log(`[Socket] 客户端连接: ${socket.id}`);

    // 心跳
    socket.on('ping', () => {
        socket.emit('pong');
    });

    // 断开连接
    socket.on('disconnect', (reason) => {
        console.log(`[Socket] 客户端断开: ${socket.id}, 原因: ${reason}`);
    });
});

// ============================================================
// 启动服务器
// ============================================================

async function startServer(): Promise<void> {
    // 初始化数据库（异步）
    await initDatabase();

    // 启动 HTTP 服务器
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log('='.repeat(50));
        console.log('星跃塔防 - 后端服务器');
        console.log('='.repeat(50));
        console.log(`[服务器] 运行于 http://0.0.0.0:${PORT}`);
        console.log(`[服务器] 局域网访问地址: http://<你的IP>:${PORT}`);
        console.log('[服务器] 等待客户端连接...');
    });
}

startServer().catch(console.error);

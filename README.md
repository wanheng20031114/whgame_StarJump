# 星跃塔防 - StarJump Tower Defense

明日方舟风格的塔防游戏，使用 PixiJS + TypeScript + Socket.IO 构建。

## 功能特性

- 🎮 **登录系统**：用户注册/登录，使用 SQLite 存储数据
- 🏠 **个人主页**：显示账户信息，导航到各功能模块
- ⚔️ **单人模式**：在高台放置炮台，防御从红门出现的敌人进入蓝门
- 🗺️ **地图系统**：高台格子可放置炮台，地面格子供敌人行走

## 游戏机制

### 地图
- **高台**（蓝色）：可放置炮台，敌人无法通行
- **地面**（棕色）：敌人行走路径
- **红门**（红色）：敌人出生点
- **蓝门**（蓝色）：我方基地，敌人终点

### 炮台 - 原型炮台
- 生命值：100
- 防御力：20
- 法术抗性：10
- 攻击速度：每秒1次
- 攻击力：10
- 放置费用：50金币

### 敌人 - 僵尸
- 移动速度：每秒0.5格
- 自动寻路走地面到蓝门
- 击杀奖励：10金币

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端构建 | Vite |
| 游戏渲染 | PixiJS 8 |
| 类型系统 | TypeScript |
| 后端服务 | Express + Socket.IO |
| 数据库 | SQLite (better-sqlite3) |

## 快速开始

### 安装依赖

```bash
npm run install:all
```

### 启动项目

```bash
npm start
```

这将同时启动：
- 后端服务器：http://localhost:3000
- 前端开发服务器：http://localhost:5173

### 单独启动

```bash
# 仅启动后端
npm run server

# 仅启动前端
npm run client
```

## 项目结构

```
whgame_StarJump/
├── client/                # 前端代码
│   ├── src/
│   │   ├── core/          # 游戏核心（Game, GameMap, AssetManager）
│   │   ├── entities/      # 游戏实体（Tower, Enemy, Projectile）
│   │   ├── systems/       # 游戏系统（PathFinding, Combat, Wave）
│   │   ├── ui/            # UI 页面（Login, Home, Lobby）
│   │   ├── network/       # 网络通信（SocketManager）
│   │   ├── types/         # TypeScript 类型定义
│   │   └── main.ts        # 入口文件
│   └── index.html
├── server/                # 后端代码
│   └── src/
│       ├── database/      # SQLite 数据库
│       └── index.ts       # 服务器入口
└── package.json
```

## 开发笔记

- 所有代码包含详细的中文注释
- 使用模块化设计，便于扩展
- 伤害公式：`伤害 = 攻击力 × (100 / (100 + 防御力))`

## 后续计划

- [ ] 四人协作模式
- [ ] 更多炮台类型
- [ ] 更多敌人类型
- [ ] 升级系统
- [ ] 音效和动画

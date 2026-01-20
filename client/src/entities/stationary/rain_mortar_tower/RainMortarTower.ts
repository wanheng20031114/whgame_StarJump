/**
 * ============================================================
 * 雨迫击炮单位
 * ============================================================
 * 中范围AOE攻击单位，连续发射4发抛物线炮弹
 * 
 * 特性：
 * - 中范围环形攻击（9x9，中心3x3盲区）
 * - 连续4发炮弹，范围内随机目标
 * - 抛物线弹道，落地爆炸
 * - 16帧精灵动画（13帧预热 + 3帧开火）
 * 
 * 动画状态：
 * - Idle（待机）：帧 0，范围内无敌人
 * - Preheating（预热）：帧 1-12，检测到敌人后预热升温
 * - Firing（开火）：帧 13-15，连续发射炮弹
 * - Cooldown（冷却）：等待下次攻击
 */

import { Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { Position, TowerStats, TowerType } from '../../../types';
import { Tower } from '../Tower';
import { AssetManager } from '../../../core/AssetManager';
import { DamageLayer } from '../antiaircraft_tower/AntiaircraftTower';

/**
 * 雨迫击炮状态枚举
 */
enum RainMortarState {
    IDLE = 'idle',
    PREHEATING = 'preheating',
    FIRING = 'firing',
    COOLDOWN = 'cooldown',
}

/**
 * 雨迫击炮开火数据（用于回调通知 Game）
 */
export interface RainMortarFireData {
    /** 炮塔位置（发射起点） */
    startPos: Position;
    /** 目标位置（落点） */
    targetPos: Position;
    /** 基础伤害 */
    baseDamage: number;
    /** 分层伤害配置 */
    layers: DamageLayer[];
    /** 物理穿透 */
    physicalPen: number;
    /** 炮弹飞行时间（秒） */
    flightTime: number;
}

/**
 * 雨迫击炮默认分层伤害配置（1.8格半径 = 115像素）
 */
const MORTAR_EXPLOSION_LAYERS: DamageLayer[] = [
    { radius: 38, damagePercent: 1.0 },   // 中心0.6格：100%
    { radius: 77, damagePercent: 0.6 },   // 中层1.2格：60%
    { radius: 115, damagePercent: 0.2 },  // 外层1.8格：20%
];

/**
 * 雨迫击炮攻击范围模板（9x9 环形，中心 3x3 盲区）
 */
const RAIN_MORTAR_RANGE_PATTERN = [
    [0, 0, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 0, 0, 1, 1, 1],
    [1, 1, 1, 0, 0, 0, 1, 1, 1],
    [1, 1, 1, 0, 0, 0, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 1, 0, 0],
];

/**
 * 雨迫击炮默认属性
 */
const RAIN_MORTAR_STATS: TowerStats = {
    health: 1000,
    maxHealth: 1000,
    defense: 5,
    magicResist: 10,
    attack: 50,              // 单发核心伤害
    attackSpeed: 0.25,        // 4秒攻击周期
    physicalPen: 15,         // 物理穿透
    magicPen: 0,
    rangePattern: RAIN_MORTAR_RANGE_PATTERN,
};

/**
 * 雨迫击炮类
 */
export class RainMortarTower extends Tower {
    /** 当前动画状态 */
    private mortarState: RainMortarState = RainMortarState.IDLE;

    /** 当前动画帧索引 */
    private currentFrame: number = 0;

    /** 帧动画计时器（秒） */
    private frameTimer: number = 0;

    /** 预热阶段每帧持续时间（秒） */
    private readonly preheatFrameDuration: number;

    /** 冷却阶段持续时间（秒） */
    private readonly cooldownDuration: number = 0.5;

    /** 连发数量 */
    private readonly burstCount: number = 4;

    /** 已发射炮弹数 */
    private firedCount: number = 0;

    /** 连发间隔计时器 */
    private burstTimer: number = 0;

    /** 连发间隔（秒） */
    private readonly burstInterval: number = 0.1;

    /** 炮弹飞行时间（秒） */
    private readonly projectileFlightTime: number = 0.3;

    /** 精灵图 */
    private sprite: Sprite | null = null;

    /** 动画帧纹理数组 */
    private frameTextures: Texture[] = [];

    /** 开火回调 */
    private onFire: ((data: RainMortarFireData) => void) | null = null;

    /** 范围内的敌人列表（用于随机选择目标） */
    private enemiesInRange: { id: string; position: Position }[] = [];

    /** 回调是否已设置的标志 */
    public _rainMortarCallbackSet: boolean = false;

    /**
     * 构造函数
     * @param id 唯一ID
     * @param tilePos 格子位置
     */
    constructor(id: string, tilePos: Position) {
        const stats = { ...RAIN_MORTAR_STATS };
        super(id, TowerType.RAIN_MORTAR, tilePos, stats);

        // 计算预热帧时长：（攻击间隔 - 开火时长 - 冷却时长）分配给 13 帧
        const attackInterval = 1 / stats.attackSpeed; // 5 秒
        const firingDuration = this.burstCount * this.burstInterval;
        this.preheatFrameDuration = (attackInterval - firingDuration - this.cooldownDuration) / 13;

        // 初始化精灵图
        this.setupSprite();
    }

    /**
     * 设置精灵图
     * 从精灵表中切割 16 帧动画
     */
    private setupSprite(): void {
        const assetManager = AssetManager.getInstance();

        const spriteSheet = assetManager.getTexture('rain_mortar_sprite');
        if (!spriteSheet) {
            console.warn('[雨迫击炮] 未找到精灵表纹理 rain_mortar_sprite');
            return;
        }

        // 精灵表参数（16 帧水平排列）
        const frameCount = 16;
        const frameWidth = spriteSheet.width / frameCount;
        const frameHeight = spriteSheet.height;

        // 从精灵表中切割每一帧
        for (let i = 0; i < frameCount; i++) {
            const frame = new Texture({
                source: spriteSheet.source,
                frame: new Rectangle(i * frameWidth, 0, frameWidth, frameHeight),
            });
            this.frameTextures.push(frame);
        }

        // 使用第一帧创建精灵
        if (this.frameTextures.length > 0) {
            this.sprite = new Sprite(this.frameTextures[0]);
            this.sprite.anchor.set(0.5);
            this.sprite.width = this.tileSize;
            this.sprite.height = this.tileSize;
            this.container.addChildAt(this.sprite, 0);

            // 隐藏默认图形
            this.graphics.visible = false;
        }

        console.log(`[雨迫击炮] 从精灵表加载了 ${this.frameTextures.length} 帧动画`);
    }

    /**
     * 设置开火回调
     */
    public setOnFire(callback: (data: RainMortarFireData) => void): void {
        this.onFire = callback;
    }

    /**
     * 更新帧动画
     */
    private updateFrame(frameIndex: number): void {
        this.currentFrame = frameIndex;
        if (this.sprite && this.frameTextures[frameIndex]) {
            this.sprite.texture = this.frameTextures[frameIndex];
        }
    }

    /**
     * 重写更新方法
     */
    public update(deltaTime: number, enemies: { id: string; position: Position; isAlive: boolean }[]): {
        shouldFire: boolean;
        targetId: string | null;
    } {
        const result: { shouldFire: boolean; targetId: string | null } = { shouldFire: false, targetId: null };

        if (!this.alive) return result;

        // 收集范围内的敌人
        this.enemiesInRange = [];
        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;
            if (this.isInRange(enemy.position.x, enemy.position.y)) {
                this.enemiesInRange.push({ id: enemy.id, position: enemy.position });
            }
        }

        const hasEnemyInRange = this.enemiesInRange.length > 0;

        // 更新动画状态
        this.updateAnimationState(deltaTime, hasEnemyInRange, result);

        return result;
    }

    /**
     * 更新动画状态机
     */
    private updateAnimationState(
        deltaTime: number,
        hasEnemy: boolean,
        result: { shouldFire: boolean; targetId: string | null }
    ): void {
        this.frameTimer += deltaTime;

        switch (this.mortarState) {
            case RainMortarState.IDLE:
                if (hasEnemy) {
                    // 有敌人，开始预热
                    this.mortarState = RainMortarState.PREHEATING;
                    this.currentFrame = 1;
                    this.frameTimer = 0;
                    this.updateFrame(1);
                    console.log('[雨迫击炮] 检测到敌人，开始预热');
                }
                break;

            case RainMortarState.PREHEATING:
                if (!hasEnemy) {
                    // 敌人离开，回到待机状态
                    this.mortarState = RainMortarState.IDLE;
                    this.updateFrame(0);
                    this.frameTimer = 0;
                    console.log('[雨迫击炮] 敌人离开，回到待机状态');
                } else if (this.frameTimer >= this.preheatFrameDuration) {
                    this.frameTimer = 0;
                    if (this.currentFrame < 12) {
                        // 继续预热动画 (帧 1-12)
                        this.currentFrame++;
                        this.updateFrame(this.currentFrame);
                    } else {
                        // 预热完成，进入开火状态
                        this.mortarState = RainMortarState.FIRING;
                        this.currentFrame = 13;
                        this.updateFrame(13);
                        this.firedCount = 0;
                        this.burstTimer = 0;
                        console.log('[雨迫击炮] 预热完成，开始开火！');

                        // 发射第一发
                        this.fireOneMortar(result);
                    }
                }
                break;

            case RainMortarState.FIRING:
                // 如果敌人全死了，提前进入冷却
                if (!hasEnemy) {
                    this.mortarState = RainMortarState.COOLDOWN;
                    this.frameTimer = 0;
                    console.log('[雨迫击炮] 敌人已清空，提前进入冷却');
                    break;
                }

                this.burstTimer += deltaTime;

                if (this.firedCount < this.burstCount && this.burstTimer >= this.burstInterval) {
                    this.burstTimer = 0;
                    this.fireOneMortar(result);

                    // 更新帧（在13-15之间切换）
                    const firingFrame = 13 + (this.firedCount % 2);
                    this.updateFrame(Math.min(firingFrame, 15));
                }

                if (this.firedCount >= this.burstCount) {
                    // 4发射击完毕，进入冷却
                    this.mortarState = RainMortarState.COOLDOWN;
                    this.frameTimer = 0;
                    console.log('[雨迫击炮] 4发射击完毕，进入冷却');
                }
                break;

            case RainMortarState.COOLDOWN:
                if (this.frameTimer >= this.cooldownDuration) {
                    this.frameTimer = 0;
                    // 冷却完成，检查是否继续循环
                    if (hasEnemy) {
                        // 还有敌人，继续预热
                        this.mortarState = RainMortarState.PREHEATING;
                        this.currentFrame = 1;
                        this.updateFrame(1);
                        console.log('[雨迫击炮] 继续循环，开始预热');
                    } else {
                        // 无敌人，回到待机
                        this.mortarState = RainMortarState.IDLE;
                        this.updateFrame(0);
                        console.log('[雨迫击炮] 无敌人，回到待机状态');
                    }
                }
                break;
        }
    }

    /**
     * 发射一发炮弹
     */
    private fireOneMortar(result: { shouldFire: boolean; targetId: string | null }): void {
        if (this.enemiesInRange.length === 0) return;

        // 随机选择目标
        const targetIndex = Math.floor(Math.random() * this.enemiesInRange.length);
        const target = this.enemiesInRange[targetIndex];

        // 触发开火回调
        if (this.onFire) {
            this.onFire({
                startPos: { ...this.getPosition() },
                targetPos: { ...target.position },
                baseDamage: this.stats.attack,
                layers: MORTAR_EXPLOSION_LAYERS,
                physicalPen: this.stats.physicalPen ?? 0,
                flightTime: this.projectileFlightTime,
            });
        }

        this.firedCount++;
        result.shouldFire = true;
        result.targetId = target.id;

        console.log(`[雨迫击炮] 发射第 ${this.firedCount} 发炮弹`);
    }

    /**
     * 获取炮台名称
     */
    public getName(): string {
        return '雨迫击炮';
    }

    /**
     * 创建炮台图形（抽象方法实现）
     */
    protected createGraphics(): Graphics {
        const graphics = new Graphics();
        graphics.rect(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize);
        graphics.fill({ color: 0x5d4e37, alpha: 0.5 });
        return graphics;
    }
}

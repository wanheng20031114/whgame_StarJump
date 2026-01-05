/**
 * ============================================================
 * 炮台基类
 * ============================================================
 * 定义炮台的基本属性和行为
 * 炮台只能放置在高台格子上
 */

import { Container, Graphics } from 'pixi.js';
import { Position, TowerStats, TowerType } from '../types';

/**
 * 炮台基类
 */
export abstract class Tower {
    /** 炮台唯一ID */
    public readonly id: string;

    /** 炮台类型 */
    public readonly type: TowerType;

    /** 炮台属性 */
    protected stats: TowerStats;

    /** 格子位置 */
    protected tilePosition: Position;

    /** 像素位置 */
    protected pixelPosition: Position;

    /** 是否存活 */
    protected alive: boolean = true;

    /** 攻击冷却计时器（秒） */
    protected attackCooldown: number = 0;

    /** PixiJS 显示容器 */
    protected container: Container;

    /** 炮台图形 */
    protected graphics: Graphics;

    /** 生命条图形 */
    protected healthBar: Graphics;

    /** 格子大小 */
    protected readonly tileSize: number = 64;

    /**
     * 构造函数
     * @param id 唯一ID
     * @param type 炮台类型
     * @param tilePos 格子位置
     * @param stats 炮台属性
     */
    constructor(id: string, type: TowerType, tilePos: Position, stats: TowerStats) {
        this.id = id;
        this.type = type;
        this.tilePosition = tilePos;
        this.stats = stats;

        // 计算像素位置（格子中心）
        this.pixelPosition = {
            x: tilePos.x * this.tileSize + this.tileSize / 2,
            y: tilePos.y * this.tileSize + this.tileSize / 2,
        };

        // 创建显示容器
        this.container = new Container();
        this.container.x = this.pixelPosition.x;
        this.container.y = this.pixelPosition.y;

        // 创建图形
        this.graphics = this.createGraphics();
        this.container.addChild(this.graphics);

        // 创建生命条
        this.healthBar = this.createHealthBar();
        this.container.addChild(this.healthBar);

        console.log(`[炮台] 创建 ${type} 炮台，位置: (${tilePos.x}, ${tilePos.y})`);
    }

    /**
     * 创建炮台图形（由子类实现）
     */
    protected abstract createGraphics(): Graphics;

    /**
     * 创建生命条
     */
    protected createHealthBar(): Graphics {
        const bar = new Graphics();
        this.updateHealthBar(bar);
        return bar;
    }

    /**
     * 更新生命条显示
     */
    protected updateHealthBar(bar?: Graphics): void {
        const healthBar = bar || this.healthBar;
        healthBar.clear();

        const barWidth = 50;
        const barHeight = 6;
        const healthPercent = this.stats.health / this.stats.maxHealth;

        // 背景（黑色）
        healthBar.rect(-barWidth / 2, -this.tileSize / 2 - 10, barWidth, barHeight);
        healthBar.fill({ color: 0x000000 });

        // 生命值（绿色渐变到红色）
        const healthColor = healthPercent > 0.5 ? 0x27ae60 : healthPercent > 0.25 ? 0xf39c12 : 0xe74c3c;
        healthBar.rect(-barWidth / 2, -this.tileSize / 2 - 10, barWidth * healthPercent, barHeight);
        healthBar.fill({ color: healthColor });

        // 边框
        healthBar.rect(-barWidth / 2, -this.tileSize / 2 - 10, barWidth, barHeight);
        healthBar.stroke({ color: 0xffffff, width: 1 });
    }

    /**
     * 更新炮台
     * @param deltaTime 时间增量（秒）
     * @param enemies 敌人列表（用于寻找目标）
     * @returns 是否发射了子弹
     */
    public update(deltaTime: number, enemies: { id: string; position: Position; isAlive: boolean }[]): {
        shouldFire: boolean;
        targetId: string | null;
    } {
        if (!this.alive) {
            return { shouldFire: false, targetId: null };
        }

        // 更新攻击冷却
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // 检查是否可以攻击
        if (this.attackCooldown <= 0) {
            // 寻找范围内最近的敌人
            const target = this.findTarget(enemies);

            if (target) {
                // 重置冷却时间
                this.attackCooldown = 1 / this.stats.attackSpeed;

                // 返回发射信号
                return { shouldFire: true, targetId: target.id };
            }
        }

        return { shouldFire: false, targetId: null };
    }

    /**
     * 寻找攻击目标
     * @param enemies 敌人列表
     */
    protected findTarget(
        enemies: { id: string; position: Position; isAlive: boolean }[]
    ): { id: string; position: Position } | null {
        let nearest: { id: string; position: Position } | null = null;
        let nearestDistance = Infinity;

        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;

            const dx = enemy.position.x - this.pixelPosition.x;
            const dy = enemy.position.y - this.pixelPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 检查是否在范围内
            if (this.isInRange(enemy.position.x, enemy.position.y)) {
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearest = enemy;
                }
            }
        }

        return nearest;
    }

    /**
     * 检查目标像素位置是否在攻击范围内
     * @param targetX 目标像素 X
     * @param targetY 目标像素 Y
     */
    public isInRange(targetX: number, targetY: number): boolean {
        // 如果有攻击模板，使用模板检测（基于格子）
        if (this.stats.rangePattern) {
            const pattern = this.stats.rangePattern;
            const patternHeight = pattern.length;
            const patternWidth = pattern[0].length;

            // 计算中心点（模板数组的中心）
            const centerX = Math.floor(patternWidth / 2);
            const centerY = Math.floor(patternHeight / 2);

            // 计算目标相对于炮台的格子偏移
            const targetTileX = Math.floor(targetX / this.tileSize);
            const targetTileY = Math.floor(targetY / this.tileSize);
            const offsetX = targetTileX - this.tilePosition.x;
            const offsetY = targetTileY - this.tilePosition.y;

            // 转换偏移到模板索引
            const patternX = centerX + offsetX;
            const patternY = centerY + offsetY;

            // 检查是否在模板范围内且该位置为 1
            if (patternY >= 0 && patternY < patternHeight && patternX >= 0 && patternX < patternWidth) {
                return pattern[patternY][patternX] === 1;
            }
            return false;
        }

        // 默认使用传统的圆形范围（像素半径）
        const dx = targetX - this.pixelPosition.x;
        const dy = targetY - this.pixelPosition.y;
        const rangePixels = this.stats.range * this.tileSize;
        return Math.sqrt(dx * dx + dy * dy) <= rangePixels;
    }

    /**
     * 获取攻击范围内的所有格子坐标
     */
    public getRangeTiles(): Position[] {
        const tiles: Position[] = [];

        if (this.stats.rangePattern) {
            const pattern = this.stats.rangePattern;
            const patternHeight = pattern.length;
            const patternWidth = pattern[0].length;
            const centerX = Math.floor(patternWidth / 2);
            const centerY = Math.floor(patternHeight / 2);

            for (let r = 0; r < patternHeight; r++) {
                for (let c = 0; c < patternWidth; c++) {
                    if (pattern[r][c] === 1) {
                        tiles.push({
                            x: this.tilePosition.x + (c - centerX),
                            y: this.tilePosition.y + (r - centerY)
                        });
                    }
                }
            }
        } else {
            // 圆形范围估算
            const range = Math.ceil(this.stats.range);
            for (let y = -range; y <= range; y++) {
                for (let x = -range; x <= range; x++) {
                    if (Math.sqrt(x * x + y * y) <= this.stats.range) {
                        tiles.push({
                            x: this.tilePosition.x + x,
                            y: this.tilePosition.y + y
                        });
                    }
                }
            }
        }

        return tiles;
    }

    /**
     * 受到伤害
     * @param damage 伤害值
     */
    public takeDamage(damage: number): void {
        this.stats.health -= damage;
        this.updateHealthBar();

        if (this.stats.health <= 0) {
            this.stats.health = 0;
            this.alive = false;
            console.log(`[炮台] ${this.type} 炮台被摧毁`);
        }
    }

    /**
     * 获取显示容器
     */
    public getContainer(): Container {
        return this.container;
    }

    /**
     * 获取像素位置
     */
    public getPosition(): Position {
        return { ...this.pixelPosition };
    }

    /**
     * 获取格子位置
     */
    public getTilePosition(): Position {
        return { ...this.tilePosition };
    }

    /**
     * 获取攻击力
     */
    public getAttack(): number {
        return this.stats.attack;
    }

    /**
     * 获取攻击范围（像素）
     */
    public getRange(): number {
        return this.stats.range * this.tileSize;
    }

    /**
     * 检查是否存活
     */
    public isAlive(): boolean {
        return this.alive;
    }

    /**
     * 获取属性数据
     */
    public getStats(): TowerStats {
        return { ...this.stats };
    }

    /**
     * 获取显示名称（由子类覆盖）
     */
    public abstract getName(): string;

    /**
     * 销毁炮台
     */
    public destroy(): void {
        this.container.destroy({ children: true });
    }
}

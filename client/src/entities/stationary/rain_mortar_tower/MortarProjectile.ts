/**
 * ============================================================
 * 迫击炮弹
 * ============================================================
 * 抛物线弹道的炮弹，落地后触发爆炸
 * 
 * 特性：
 * - 抛物线飞行轨迹
 * - 可配置飞行时间
 * - 落地回调通知
 */

import { Container, Graphics } from 'pixi.js';
import { Position } from '../../../types';
import { DamageLayer } from '../antiaircraft_tower/AntiaircraftTower';

/**
 * 迫击炮弹类
 */
export class MortarProjectile {
    /** 显示容器 */
    private container: Container;

    /** 炮弹图形 */
    private graphics: Graphics;

    /** 阴影图形 */
    private shadow: Graphics;

    /** 起始位置 */
    private startPos: Position;

    /** 目标位置 */
    private targetPos: Position;

    /** 飞行时间（秒） */
    private flightTime: number;

    /** 已飞行时间 */
    private elapsedTime: number = 0;

    /** 是否存活 */
    private alive: boolean = true;

    /** 是否已命中 */
    private hasHit: boolean = false;

    /** 抛物线最高点（像素） */
    private readonly maxHeight: number = 100;

    /** 基础伤害 */
    private baseDamage: number;

    /** 分层伤害配置 */
    private layers: DamageLayer[];

    /** 物理穿透 */
    private physicalPen: number;

    /**
     * 构造函数
     */
    constructor(
        startPos: Position,
        targetPos: Position,
        baseDamage: number,
        layers: DamageLayer[],
        physicalPen: number,
        flightTime: number = 0.3
    ) {
        this.startPos = { ...startPos };
        this.targetPos = { ...targetPos };
        this.baseDamage = baseDamage;
        this.layers = layers;
        this.physicalPen = physicalPen;
        this.flightTime = flightTime;

        // 创建容器
        this.container = new Container();
        // 允许点击事件穿透炮弹，避免阻挡单位选中
        this.container.eventMode = 'none';
        this.container.x = startPos.x;
        this.container.y = startPos.y;

        // 创建阴影（在地面上）
        this.shadow = new Graphics();
        this.shadow.ellipse(0, 0, 8, 4);
        this.shadow.fill({ color: 0x000000, alpha: 0.3 });
        this.container.addChild(this.shadow);

        // 创建炮弹图形
        this.graphics = new Graphics();
        this.graphics.circle(0, 0, 6);
        this.graphics.fill({ color: 0x4a4a4a });
        this.graphics.stroke({ color: 0x2a2a2a, width: 2 });
        this.container.addChild(this.graphics);
    }

    /**
     * 更新炮弹位置
     * @param deltaTime 时间增量（秒）
     * @returns 是否落地
     */
    public update(deltaTime: number): boolean {
        if (!this.alive || this.hasHit) return false;

        this.elapsedTime += deltaTime;

        // 计算飞行进度 (0 到 1)
        const t = Math.min(1, this.elapsedTime / this.flightTime);

        // 水平位置（线性插值）
        const x = this.startPos.x + (this.targetPos.x - this.startPos.x) * t;
        const groundY = this.startPos.y + (this.targetPos.y - this.startPos.y) * t;

        // 垂直位置（抛物线）
        // 公式：height = 4 * maxHeight * t * (1 - t)
        // 在 t=0.5 时达到最高点
        const height = 4 * this.maxHeight * t * (1 - t);

        // 更新容器位置（容器在地面位置）
        this.container.x = x;
        this.container.y = groundY;

        // 更新炮弹图形位置（相对于容器，向上偏移高度）
        this.graphics.y = -height;

        // 根据高度缩放炮弹（模拟透视）
        const scale = 1 + height / 200;
        this.graphics.scale.set(scale);

        // 阴影位置保持在地面，大小随高度变化
        const shadowScale = 1 - height / 300;
        this.shadow.scale.set(Math.max(0.5, shadowScale));
        this.shadow.alpha = 0.3 * Math.max(0.3, shadowScale);

        // 检查是否落地
        if (t >= 1) {
            this.hasHit = true;
            return true;
        }

        return false;
    }

    /**
     * 获取容器
     */
    public getContainer(): Container {
        return this.container;
    }

    /**
     * 获取目标位置（落点）
     */
    public getTargetPosition(): Position {
        return { ...this.targetPos };
    }

    /**
     * 获取基础伤害
     */
    public getBaseDamage(): number {
        return this.baseDamage;
    }

    /**
     * 获取分层伤害配置
     */
    public getLayers(): DamageLayer[] {
        return this.layers;
    }

    /**
     * 获取物理穿透
     */
    public getPhysicalPen(): number {
        return this.physicalPen;
    }

    /**
     * 检查是否存活
     */
    public isAlive(): boolean {
        return this.alive && !this.hasHit;
    }

    /**
     * 标记为命中
     */
    public hit(): void {
        this.hasHit = true;
        this.alive = false;
    }

    /**
     * 销毁
     */
    public destroy(): void {
        this.alive = false;
        this.container.destroy({ children: true });
    }
}

/**
 * ============================================================
 * 波次系统
 * ============================================================
 * 管理敌人波次的生成和调度
 */

import { EnemyType } from '../types';

/**
 * 单个敌人生成配置
 */
export interface EnemySpawnConfig {
    /** 敌人类型 */
    type: EnemyType;
    /** 生成延迟（毫秒，相对于波次开始） */
    delay: number;
    /** 生成位置（红门索引，-1表示随机） */
    gateIndex: number;
}

/**
 * 波次配置
 */
export interface WaveConfig {
    /** 波次编号 */
    waveNumber: number;
    /** 敌人生成配置列表 */
    enemies: EnemySpawnConfig[];
    /** 波次开始前的准备时间（毫秒） */
    prepareTime: number;
}

/**
 * 波次系统类
 */
export class WaveSystem {
    /** 所有波次配置 */
    private waves: WaveConfig[];

    /** 当前波次索引 */
    private currentWaveIndex: number = -1;

    /** 当前波次已生成的敌人数 */
    private spawnedCount: number = 0;

    /** 波次开始时间 */
    private waveStartTime: number = 0;

    /** 波次是否进行中 */
    private waveInProgress: boolean = false;

    /** 当前波次所有敌人是否已生成完毕 */
    private allEnemiesSpawned: boolean = false;

    /** 敌人生成回调 */
    private onSpawnEnemy: ((type: EnemyType, gateIndex: number) => void) | null = null;

    /** 波次开始回调 */
    private onWaveStart: ((waveNumber: number) => void) | null = null;

    /** 波次结束回调 */
    private onWaveEnd: ((waveNumber: number) => void) | null = null;

    /** 所有波次完成回调 */
    private onAllWavesComplete: (() => void) | null = null;

    /**
     * 构造函数
     */
    constructor() {
        // 初始化默认波次配置
        this.waves = this.createDefaultWaves();
    }

    // ============================================================
    // 敌人批量生成工具类
    // ============================================================

    /**
     * 批量生成同类型敌人
     * @param type 敌人类型
     * @param count 数量
     * @param interval 生成间隔（毫秒）
     * @param startDelay 起始延迟（毫秒）
     * @param gateIndex 红门索引，-1表示随机
     */
    private batchSpawn(
        type: EnemyType,
        count: number,
        interval: number,
        startDelay: number = 0,
        gateIndex: number = -1
    ): EnemySpawnConfig[] {
        return Array(count).fill(0).map((_, i) => ({
            type,
            delay: startDelay + i * interval,
            gateIndex,
        }));
    }

    /**
     * 混合批量生成多种敌人
     * @param configs 配置数组 [{ type, count, interval, gateIndex? }]
     * @param startDelay 起始延迟
     */
    private mixedSpawn(
        configs: Array<{
            type: EnemyType;
            count: number;
            interval: number;
            gateIndex?: number;
        }>,
        startDelay: number = 0
    ): EnemySpawnConfig[] {
        const result: EnemySpawnConfig[] = [];
        for (const cfg of configs) {
            result.push(...this.batchSpawn(
                cfg.type,
                cfg.count,
                cfg.interval,
                startDelay,
                cfg.gateIndex ?? -1
            ));
        }
        // 按延迟排序
        return result.sort((a, b) => a.delay - b.delay);
    }

    /**
     * 创建高密度压力测试波次（5波超高强度，支持4红门）
     */
    private createStressTestWaves(): WaveConfig[] {
        return [
            // ============================================================
            // 第1波：四方齐动（200敌人，4红门均匀出兵）
            // ============================================================
            {
                waveNumber: 1,
                prepareTime: 3000,
                enemies: [
                    ...this.batchSpawn(EnemyType.ZOMBIE, 25, 300, 0, 0),
                    ...this.batchSpawn(EnemyType.CAPOO_SWORDSMAN, 25, 300, 0, 1),
                    ...this.batchSpawn(EnemyType.ZOMBIE, 25, 300, 0, 2),
                    ...this.batchSpawn(EnemyType.CAPOO_SWORDSMAN, 25, 300, 0, 3),
                    ...this.batchSpawn(EnemyType.CAPOO_AK47, 50, 400, 5000, -1), // 随机红门加入后续增援
                    ...this.batchSpawn(EnemyType.CAPOO_BUBBLETEA, 50, 400, 5000, -1),
                ].sort((a, b) => a.delay - b.delay),
            },
            // ============================================================
            // 第2波：集群突击（400敌人，高频穿插）
            // ============================================================
            {
                waveNumber: 2,
                prepareTime: 5000,
                enemies: [
                    // 左右侧强攻
                    ...this.batchSpawn(EnemyType.ZOMBIE, 100, 150, 0, 0),
                    ...this.batchSpawn(EnemyType.CAPOO_SWORDSMAN, 50, 200, 0, 1),
                    ...this.batchSpawn(EnemyType.ZOMBIE, 100, 150, 0, 2),
                    ...this.batchSpawn(EnemyType.CAPOO_SWORDSMAN, 50, 200, 0, 3),
                    // 精英混合增援
                    ...this.mixedSpawn([
                        { type: EnemyType.CAPOO_AK47, count: 50, interval: 200 },
                        { type: EnemyType.CAPOO_BUBBLETEA, count: 50, interval: 200 },
                    ], 8000),
                ].sort((a, b) => a.delay - b.delay),
            },
            // ============================================================
            // 第3波：炮点掩护（600敌人，重火力混合）
            // ============================================================
            {
                waveNumber: 3,
                prepareTime: 5000,
                enemies: [
                    // 四门僵尸海（作为肉盾）
                    ...this.batchSpawn(EnemyType.ZOMBIE, 100, 100, 0, 0),
                    ...this.batchSpawn(EnemyType.ZOMBIE, 100, 100, 0, 1),
                    ...this.batchSpawn(EnemyType.ZOMBIE, 100, 100, 0, 2),
                    ...this.batchSpawn(EnemyType.ZOMBIE, 100, 100, 0, 3),
                    // 中后期大量 AK47 和 奶茶
                    ...this.batchSpawn(EnemyType.CAPOO_AK47, 100, 150, 3000, 0),
                    ...this.batchSpawn(EnemyType.CAPOO_BUBBLETEA, 100, 150, 3000, 1),
                ].sort((a, b) => a.delay - b.delay),
            },
            // ============================================================
            // 第4波：饱和打击（1000敌人，极高频生成）
            // ============================================================
            {
                waveNumber: 4,
                prepareTime: 5000,
                enemies: [
                    ...this.batchSpawn(EnemyType.ZOMBIE, 300, 50, 0, 2),
                    ...this.batchSpawn(EnemyType.CAPOO_SWORDSMAN, 200, 80, 0, 3),
                    ...this.batchSpawn(EnemyType.CAPOO_AK47, 250, 100, 0, 0),
                    ...this.batchSpawn(EnemyType.CAPOO_BUBBLETEA, 250, 100, 0, 1),
                ].sort((a, b) => a.delay - b.delay),
            },
            // ============================================================
            // 第5波：终极混沌（2000敌人，疯狂测试）
            // ============================================================
            {
                waveNumber: 5,
                prepareTime: 10000,
                enemies: [
                    // 全红门爆发式生成
                    ...this.batchSpawn(EnemyType.ZOMBIE, 500, 30, 0, 0),
                    ...this.batchSpawn(EnemyType.CAPOO_SWORDSMAN, 500, 30, 0, 1),
                    ...this.batchSpawn(EnemyType.CAPOO_AK47, 500, 40, 0, 2),
                    ...this.batchSpawn(EnemyType.CAPOO_BUBBLETEA, 500, 40, 0, 3),
                    // 最后 10 秒 混合冲击
                    ...this.mixedSpawn([
                        { type: EnemyType.CAPOO_SWORDSMAN, count: 100, interval: 20 },
                        { type: EnemyType.CAPOO_AK47, count: 100, interval: 20 },
                    ], 15000),
                ].sort((a, b) => a.delay - b.delay),
            },
        ];
    }

    /**
     * 创建默认波次配置
     */
    private createDefaultWaves(): WaveConfig[] {
        return this.createStressTestWaves();
    }

    /**
     * 设置敌人生成回调
     */
    public setOnSpawnEnemy(callback: (type: EnemyType, gateIndex: number) => void): void {
        this.onSpawnEnemy = callback;
    }

    /**
     * 设置波次开始回调
     */
    public setOnWaveStart(callback: (waveNumber: number) => void): void {
        this.onWaveStart = callback;
    }

    /**
     * 设置波次结束回调
     */
    public setOnWaveEnd(callback: (waveNumber: number) => void): void {
        this.onWaveEnd = callback;
    }

    /**
     * 设置所有波次完成回调
     */
    public setOnAllWavesComplete(callback: () => void): void {
        this.onAllWavesComplete = callback;
    }

    /**
     * 开始下一波
     */
    public startNextWave(): boolean {
        if (this.waveInProgress) {
            console.warn('[波次系统] 当前波次尚未结束');
            return false;
        }

        this.currentWaveIndex++;

        if (this.currentWaveIndex >= this.waves.length) {
            console.log('[波次系统] 所有波次已完成！');
            this.onAllWavesComplete?.();
            return false;
        }

        const wave = this.waves[this.currentWaveIndex];
        console.log(`[波次系统] 开始第 ${wave.waveNumber} 波，敌人数量: ${wave.enemies.length}`);

        this.waveInProgress = true;
        this.spawnedCount = 0;
        this.waveStartTime = Date.now();
        this.allEnemiesSpawned = false; // 重置敌人生成完毕标志

        this.onWaveStart?.(wave.waveNumber);

        return true;
    }

    /**
     * 更新波次系统
     * 在游戏循环中调用
     */
    public update(): void {
        if (!this.waveInProgress) return;

        const wave = this.waves[this.currentWaveIndex];
        if (!wave) return;

        const elapsed = Date.now() - this.waveStartTime;

        // 检查是否有敌人需要生成
        for (let i = this.spawnedCount; i < wave.enemies.length; i++) {
            const enemyConfig = wave.enemies[i];

            if (elapsed >= wave.prepareTime + enemyConfig.delay) {
                // 生成敌人
                this.onSpawnEnemy?.(enemyConfig.type, enemyConfig.gateIndex);
                this.spawnedCount++;
                console.log(`[波次系统] 生成敌人 ${enemyConfig.type}，已生成: ${this.spawnedCount}/${wave.enemies.length}`);
            } else {
                // 后面的敌人还没到时间，跳出循环
                break;
            }
        }

        // 检查波次是否完成（所有敌人都已生成）
        if (this.spawnedCount >= wave.enemies.length && !this.allEnemiesSpawned) {
            // 标记敌人生成完毕
            this.allEnemiesSpawned = true;
            console.log(`[波次系统] 第 ${wave.waveNumber} 波敌人生成完毕，等待击溃所有敌人...`);
        }
    }

    /**
     * 检查当前波次所有敌人是否已生成完毕
     * @returns 是否所有敌人已生成
     */
    public isAllEnemiesSpawned(): boolean {
        return this.allEnemiesSpawned;
    }

    /**
     * 标记波次结束
     * 当所有敌人被消灭时调用
     */
    public markWaveComplete(): void {
        if (!this.waveInProgress) return;

        const wave = this.waves[this.currentWaveIndex];
        console.log(`[波次系统] 第 ${wave.waveNumber} 波结束`);

        this.waveInProgress = false;
        this.onWaveEnd?.(wave.waveNumber);
    }

    /**
     * 获取当前波次编号
     */
    public getCurrentWaveNumber(): number {
        if (this.currentWaveIndex < 0) return 0;
        return this.waves[this.currentWaveIndex]?.waveNumber || 0;
    }

    /**
     * 获取总波次数
     */
    public getTotalWaves(): number {
        return this.waves.length;
    }

    /**
     * 获取当前波次敌人数量
     */
    public getCurrentWaveEnemyCount(): number {
        if (this.currentWaveIndex < 0) return 0;
        return this.waves[this.currentWaveIndex]?.enemies.length || 0;
    }

    /**
     * 检查波次是否进行中
     */
    public isWaveInProgress(): boolean {
        return this.waveInProgress;
    }

    /**
     * 检查是否所有波次都已完成
     */
    public isAllWavesComplete(): boolean {
        return this.currentWaveIndex >= this.waves.length - 1 && !this.waveInProgress;
    }

    /**
     * 重置波次系统
     */
    public reset(): void {
        this.currentWaveIndex = -1;
        this.spawnedCount = 0;
        this.waveStartTime = 0;
        this.waveInProgress = false;
        this.allEnemiesSpawned = false;
    }
}

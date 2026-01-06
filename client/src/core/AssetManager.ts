/**
 * ============================================================
 * 资源管理器
 * ============================================================
 * 负责加载和管理游戏中的所有资源（图片、音频等）
 * 使用 PixiJS 的资源加载系统
 */

import { Assets, Texture } from 'pixi.js';

// @ts-ignore
import clickSoundUrl from '../sound/Click.m4a';
// @ts-ignore
import flameThrowerFireUrl from '../sound/FlameThrower_fire.m4a';
// @ts-ignore
import prototypeTowerFireUrl from '../sound/PrototypeTower_fire.m4a';
// @ts-ignore
import plantingSoundUrl from '../sound/planting.m4a';

// 导入高清图片素材
// @ts-ignore
import prototypeTowerImg from '../assets/towers/PrototypeTower.png';
// @ts-ignore
import flameThrowerImg from '../assets/towers/FlameThrower.png';
// @ts-ignore
import capooSwordsmanImg from '../assets/capoos/capoo_swordsman.png';

/**
 * 资源管理器类
 * 单例模式，全局统一管理游戏资源
 */
export class AssetManager {
    /** 单例实例 */
    private static instance: AssetManager;

    /** 是否已加载完成 */
    private loaded: boolean = false;

    /** 纹理缓存 */
    private textures: Map<string, Texture> = new Map();

    /** 喷火器音效上次播放时间（用于冷却控制） */
    private lastFlameThrowerSoundTime: number = 0;

    /**
     * 私有构造函数（单例模式）
     */
    private constructor() { }

    /**
     * 获取单例实例
     */
    public static getInstance(): AssetManager {
        if (!AssetManager.instance) {
            AssetManager.instance = new AssetManager();
        }
        return AssetManager.instance;
    }

    /**
     * 加载所有游戏资源
     * @returns Promise<void>
     */
    public async loadAssets(): Promise<void> {
        if (this.loaded) {
            console.log('[资源管理器] 资源已加载，跳过重复加载');
            return;
        }

        console.log('[资源管理器] 开始加载游戏资源...');

        try {
            // 定义需要加载的资源列表
            // 目前使用占位符颜色，后续可替换为实际图片路径
            // 1. 注册并加载高清图片资源
            Assets.add({ alias: 'tower_prototype', src: prototypeTowerImg });
            Assets.add({ alias: 'tower_flamethrower', src: flameThrowerImg });
            Assets.add({ alias: 'enemy_capoo', src: capooSwordsmanImg });

            const textures = await Assets.load(['tower_prototype', 'tower_flamethrower', 'enemy_capoo']);

            // 2. 存入本地纹理缓存
            this.textures.set('tower_prototype', textures.tower_prototype);
            this.textures.set('tower_flamethrower', textures.tower_flamethrower);
            this.textures.set('enemy_capoo', textures.enemy_capoo);

            // 3. 创建其他占位符纹理
            this.createPlaceholderTextures();

            this.loaded = true;
            console.log('[资源管理器] 资源加载完成！（包含高清素材）');
        } catch (error) {
            console.error('[资源管理器] 资源加载失败:', error);
            throw error;
        }
    }

    /**
     * 创建占位符纹理
     * 在没有实际图片资源时使用
     */
    private createPlaceholderTextures(): void {
        // 这些纹理会在运行时通过 Graphics 绘制
        // 此处仅作为示例，实际纹理在 Game.ts 中创建
        console.log('[资源管理器] 使用占位符纹理');
    }

    /**
     * 获取纹理
     * @param name 纹理名称
     * @returns Texture 对象
     */
    public getTexture(name: string): Texture | undefined {
        return this.textures.get(name);
    }

    /**
     * 设置纹理
     * @param name 纹理名称
     * @param texture 纹理对象
     */
    public setTexture(name: string, texture: Texture): void {
        this.textures.set(name, texture);
    }

    /**
     * 检查资源是否已加载
     */
    public isLoaded(): boolean {
        return this.loaded;
    }

    /**
     * 播放点击音效
     * 使用原生 Audio API，确保非阻塞播放
     */
    public playClickSound(): void {
        this.playSound(clickSoundUrl, 0.5);
    }

    /**
     * 播放喷火器开火音效
     * 每 3 秒至多播放一次，避免频繁播放导致噪音
     */
    public playFlameThrowerFireSound(): void {
        const now = Date.now();
        const cooldown = 3000; // 3 秒冷却时间
        if (now - this.lastFlameThrowerSoundTime >= cooldown) {
            this.lastFlameThrowerSoundTime = now;
            this.playSound(flameThrowerFireUrl, 0.2);
        }
    }

    /**
     * 播放原型炮台开火音效
     */
    public playPrototypeTowerFireSound(): void {
        this.playSound(prototypeTowerFireUrl, 0.06);
    }

    /**
     * 播放炮台放置成功音效
     */
    public playPlantingSound(): void {
        this.playSound(plantingSoundUrl, 0.4);
    }

    /**
     * 通用音效播放方法
     * @param url 音效文件 URL
     * @param volume 音量 (0-1)
     */
    private playSound(url: string, volume: number = 0.5): void {
        try {
            const audio = new Audio(url);
            audio.volume = volume;
            audio.play().catch(error => {
                console.warn('[资源管理器] 音效播放受限:', error);
            });
        } catch (error) {
            console.error('[资源管理器] 播放音效失败:', error);
        }
    }
}

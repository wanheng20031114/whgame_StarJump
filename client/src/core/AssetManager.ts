/**
 * ============================================================
 * 资源管理器
 * ============================================================
 * 负责加载和管理游戏中的所有资源（图片、音频等）
 * 使用 PixiJS 的资源加载系统
 */

import { Assets, Texture } from 'pixi.js';

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
            const assetManifest = {
                bundles: [
                    {
                        name: 'game',
                        assets: [
                            // 暂时不加载外部图片，使用代码生成的占位符纹理
                            // { alias: 'tower_prototype', src: '/assets/towers/prototype.png' },
                            // { alias: 'enemy_zombie', src: '/assets/enemies/zombie.png' },
                        ],
                    },
                ],
            };

            // 初始化资源加载器
            await Assets.init({ manifest: assetManifest });

            // 加载游戏资源包
            // await Assets.loadBundle('game');

            // 创建占位符纹理
            this.createPlaceholderTextures();

            this.loaded = true;
            console.log('[资源管理器] 资源加载完成！');
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
}

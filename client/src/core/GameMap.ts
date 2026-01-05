/**
 * ============================================================
 * 地图系统
 * ============================================================
 * 管理游戏地图的格子数据，包括：
 * - 高台格子（PLATFORM）：可放置炮台，敌人不可通行
 * - 地面格子（GROUND）：敌人可通行，不可放置炮台
 * - 红门（RED_GATE）：敌人出生点
 * - 蓝门（BLUE_GATE）：我方基地，敌人终点
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { TileType, MapConfig, Position, Tile } from '../types';

/**
 * 地图系统类
 * 负责地图数据管理和渲染
 */
export class GameMap {
    /** 地图配置 */
    private config: MapConfig;

    /** 地图格子数据 */
    private tiles: Tile[][];

    /** PixiJS 容器 */
    private container: Container;

    /** 格子图形对象缓存 */
    private tileGraphics: Graphics[][] = [];

    /** 格子大小（像素） */
    public readonly tileSize: number = 64;

    /**
     * 构造函数
     * @param container 父级 PixiJS 容器
     */
    constructor(container: Container) {
        this.container = container;

        // 初始化默认地图配置
        this.config = this.createDefaultMapConfig();

        // 初始化格子数据
        this.tiles = this.initializeTiles();

        // 渲染地图
        this.render();
    }

    /**
     * 创建默认地图配置
     * 10x8 格子的标准地图
     */
    private createDefaultMapConfig(): MapConfig {
        // 地图布局说明：
        // G = 地面(GROUND), P = 高台(PLATFORM)
        // R = 红门(RED_GATE), B = 蓝门(BLUE_GATE)
        const layout: TileType[][] = [
            // 第0行
            [TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND],
            // 第1行：红门在左边，蓝门在右边
            [TileType.RED_GATE, TileType.GROUND, TileType.GROUND, TileType.PLATFORM, TileType.PLATFORM, TileType.PLATFORM, TileType.PLATFORM, TileType.GROUND, TileType.GROUND, TileType.BLUE_GATE],
            // 第2行
            [TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND],
            // 第3行：两侧高台
            [TileType.GROUND, TileType.PLATFORM, TileType.PLATFORM, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.PLATFORM, TileType.PLATFORM, TileType.GROUND],
            // 第4行
            [TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND],
            // 第5行：两侧高台
            [TileType.GROUND, TileType.PLATFORM, TileType.PLATFORM, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.PLATFORM, TileType.PLATFORM, TileType.GROUND],
            // 第6行
            [TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND],
            // 第7行
            [TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND, TileType.GROUND],
        ];

        // 找出红门和蓝门位置
        const redGates: Position[] = [];
        const blueGates: Position[] = [];

        for (let y = 0; y < layout.length; y++) {
            for (let x = 0; x < layout[y].length; x++) {
                if (layout[y][x] === TileType.RED_GATE) {
                    redGates.push({ x, y });
                } else if (layout[y][x] === TileType.BLUE_GATE) {
                    blueGates.push({ x, y });
                }
            }
        }

        return {
            width: 10,
            height: 8,
            tileSize: this.tileSize,
            tiles: layout,
            redGates,
            blueGates,
        };
    }

    /**
     * 初始化格子数据
     */
    private initializeTiles(): Tile[][] {
        const tiles: Tile[][] = [];

        for (let y = 0; y < this.config.height; y++) {
            tiles[y] = [];
            for (let x = 0; x < this.config.width; x++) {
                tiles[y][x] = {
                    x,
                    y,
                    type: this.config.tiles[y][x],
                    hasTower: false,
                };
            }
        }

        return tiles;
    }

    /**
     * 渲染地图
     */
    private render(): void {
        // 清空之前的渲染
        this.container.removeChildren();
        this.tileGraphics = [];

        // 遍历每个格子进行渲染
        for (let y = 0; y < this.config.height; y++) {
            this.tileGraphics[y] = [];
            for (let x = 0; x < this.config.width; x++) {
                const tile = this.tiles[y][x];
                const graphics = this.createTileGraphics(tile);

                // 设置位置
                graphics.x = x * this.tileSize;
                graphics.y = y * this.tileSize;

                // 添加到容器
                this.container.addChild(graphics);
                this.tileGraphics[y][x] = graphics;
            }
        }

        console.log(`[地图系统] 地图渲染完成，尺寸: ${this.config.width}x${this.config.height}`);
    }

    /**
     * 创建单个格子的图形
     * @param tile 格子数据
     */
    private createTileGraphics(tile: Tile): Graphics {
        const graphics = new Graphics();

        // 根据格子类型设置颜色
        let color: number;
        let borderColor: number = 0x333333;

        switch (tile.type) {
            case TileType.GROUND:
                // 地面：深棕色
                color = 0x4a3728;
                break;
            case TileType.PLATFORM:
                // 高台：深灰蓝色
                color = 0x2c3e50;
                borderColor = 0x3498db;
                break;
            case TileType.RED_GATE:
                // 红门：红色
                color = 0xe74c3c;
                borderColor = 0xc0392b;
                break;
            case TileType.BLUE_GATE:
                // 蓝门：蓝色
                color = 0x3498db;
                borderColor = 0x2980b9;
                break;
            default:
                color = 0x333333;
        }

        // 绘制格子背景
        graphics.rect(0, 0, this.tileSize, this.tileSize);
        graphics.fill({ color });

        // 绘制边框
        graphics.rect(0, 0, this.tileSize, this.tileSize);
        graphics.stroke({ color: borderColor, width: 1 });

        // 为高台添加特殊标记
        if (tile.type === TileType.PLATFORM) {
            // 绘制小方块表示高台
            const padding = 8;
            graphics.rect(padding, padding, this.tileSize - padding * 2, this.tileSize - padding * 2);
            graphics.stroke({ color: 0x3498db, width: 2 });
        }

        // 为红门添加箭头标记（指向右边）
        if (tile.type === TileType.RED_GATE) {
            const centerX = this.tileSize / 2;
            const centerY = this.tileSize / 2;
            graphics.moveTo(centerX - 10, centerY - 10);
            graphics.lineTo(centerX + 10, centerY);
            graphics.lineTo(centerX - 10, centerY + 10);
            graphics.stroke({ color: 0xffffff, width: 3 });
        }

        // 为蓝门添加圆形标记
        if (tile.type === TileType.BLUE_GATE) {
            graphics.circle(this.tileSize / 2, this.tileSize / 2, 15);
            graphics.stroke({ color: 0xffffff, width: 3 });
        }

        // 设置交互属性
        graphics.eventMode = 'static';
        graphics.cursor = tile.type === TileType.PLATFORM ? 'pointer' : 'default';

        return graphics;
    }

    /**
     * 获取格子数据
     * @param x 格子X坐标
     * @param y 格子Y坐标
     */
    public getTile(x: number, y: number): Tile | null {
        if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height) {
            return null;
        }
        return this.tiles[y][x];
    }

    /**
     * 设置格子是否有炮台
     * @param x 格子X坐标
     * @param y 格子Y坐标
     * @param hasTower 是否有炮台
     */
    public setTowerOnTile(x: number, y: number, hasTower: boolean): boolean {
        const tile = this.getTile(x, y);
        if (!tile) return false;

        // 只有高台才能放置炮台
        if (tile.type !== TileType.PLATFORM) {
            console.warn(`[地图系统] 无法在非高台格子 (${x}, ${y}) 放置炮台`);
            return false;
        }

        tile.hasTower = hasTower;

        // 更新格子视觉
        if (hasTower) {
            // 标记已放置炮台的格子
            const graphics = this.tileGraphics[y][x];
            graphics.rect(4, 4, this.tileSize - 8, this.tileSize - 8);
            graphics.fill({ color: 0x27ae60, alpha: 0.5 });
        }

        return true;
    }

    /**
     * 检查格子是否可通行（用于寻路）
     * @param x 格子X坐标
     * @param y 格子Y坐标
     */
    public isWalkable(x: number, y: number): boolean {
        const tile = this.getTile(x, y);
        if (!tile) return false;

        // 只有地面格子可通行，红门和蓝门也可通行
        return tile.type === TileType.GROUND ||
            tile.type === TileType.RED_GATE ||
            tile.type === TileType.BLUE_GATE;
    }

    /**
     * 检查格子是否可放置炮台
     * @param x 格子X坐标
     * @param y 格子Y坐标
     */
    public canPlaceTower(x: number, y: number): boolean {
        const tile = this.getTile(x, y);
        if (!tile) return false;

        // 只有高台且没有炮台才能放置
        return tile.type === TileType.PLATFORM && !tile.hasTower;
    }

    /**
     * 获取地图配置
     */
    public getConfig(): MapConfig {
        return this.config;
    }

    /**
     * 获取红门位置列表
     */
    public getRedGates(): Position[] {
        return this.config.redGates;
    }

    /**
     * 获取蓝门位置列表
     */
    public getBlueGates(): Position[] {
        return this.config.blueGates;
    }

    /**
     * 像素坐标转格子坐标
     * @param pixelX 像素X坐标
     * @param pixelY 像素Y坐标
     */
    public pixelToTile(pixelX: number, pixelY: number): Position {
        return {
            x: Math.floor(pixelX / this.tileSize),
            y: Math.floor(pixelY / this.tileSize),
        };
    }

    /**
     * 格子坐标转像素坐标（返回格子中心）
     * @param tileX 格子X坐标
     * @param tileY 格子Y坐标
     */
    public tileToPixel(tileX: number, tileY: number): Position {
        return {
            x: tileX * this.tileSize + this.tileSize / 2,
            y: tileY * this.tileSize + this.tileSize / 2,
        };
    }

    /**
     * 获取地图宽度（像素）
     */
    public getPixelWidth(): number {
        return this.config.width * this.tileSize;
    }

    /**
     * 获取地图高度（像素）
     */
    public getPixelHeight(): number {
        return this.config.height * this.tileSize;
    }

    /**
     * 获取格子图形对象
     * @param x 格子X坐标
     * @param y 格子Y坐标
     */
    public getTileGraphics(x: number, y: number): Graphics | null {
        if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height) {
            return null;
        }
        return this.tileGraphics[y][x];
    }
}

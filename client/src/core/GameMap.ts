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

import { Container, Graphics } from 'pixi.js';
import { TileType, MapConfig, Position, Tile, MAP_CHAR_TO_TYPE } from '../types';
import { DEFAULT_MAP_DATA, MapDataConfig } from '../data/MapData';

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

        // 初始化默认地图数据
        this.config = this.parseMapData(DEFAULT_MAP_DATA);

        // 初始化格子数据
        this.tiles = this.initializeTiles();

        // 渲染地图
        this.render();
    }

    /**
     * 解析地图数据配置
     * @param data 地图数据
     */
    private parseMapData(data: MapDataConfig): MapConfig {
        const layout: TileType[][] = [];
        const redGates: Position[] = [];
        const blueGates: Position[] = [];

        for (let y = 0; y < data.height; y++) {
            layout[y] = [];
            for (let x = 0; x < data.width; x++) {
                const char = data.layout[y][x];
                const type = MAP_CHAR_TO_TYPE[char] || TileType.GROUND;
                layout[y][x] = type;

                if (type === TileType.RED_GATE) {
                    redGates.push({ x, y });
                } else if (type === TileType.BLUE_GATE) {
                    blueGates.push({ x, y });
                }
            }
        }

        return {
            width: data.width,
            height: data.height,
            tileSize: this.tileSize,
            tiles: layout,
            redGates,
            blueGates,
        };
    }

    /**
     * 加载新地图数据
     * @param data 地图数据
     */
    public loadFromData(data: MapDataConfig): void {
        this.config = this.parseMapData(data);
        this.tiles = this.initializeTiles();
        this.render();
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
            case TileType.OBSTACLE:
                // 障碍物：深黑色
                color = 0x1a1a1a;
                borderColor = 0x000000;
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
        const graphics = this.tileGraphics[y][x];
        if (hasTower) {
            // 标记已放置炮台的格子（绿色半透明覆盖）
            graphics.rect(4, 4, this.tileSize - 8, this.tileSize - 8);
            graphics.fill({ color: 0x27ae60, alpha: 0.5 });
        } else {
            // 移除炮台时，重绘格子以清除绿色标记
            this.redrawTile(x, y);
        }

        return true;
    }

    /**
     * 重绘单个格子
     * 用于清除炮台放置标记
     */
    private redrawTile(x: number, y: number): void {
        const tile = this.getTile(x, y);
        if (!tile) return;

        const oldGraphics = this.tileGraphics[y][x];
        const parent = oldGraphics.parent;
        const index = parent?.getChildIndex(oldGraphics) ?? -1;

        // 移除旧图形
        if (parent) {
            parent.removeChild(oldGraphics);
        }
        oldGraphics.destroy();

        // 创建新图形
        const newGraphics = this.createTileGraphics(tile);
        newGraphics.x = x * this.tileSize;
        newGraphics.y = y * this.tileSize;

        // 插入到原位置
        if (parent && index >= 0) {
            parent.addChildAt(newGraphics, index);
        } else {
            this.container.addChild(newGraphics);
        }

        // 更新引用
        this.tileGraphics[y][x] = newGraphics;
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

/**
 * ============================================================
 * 部署栏UI组件
 * ============================================================
 * 显示可部署的单位，支持拖拽部署
 * 
 * 功能：
 * - 可拖动的浮动窗口
 * - 显示可部署单位图标和费用（放大版）
 * - 支持左键按住拖拽单位到地图
 * - 支持最小化/展开切换
 */

import { Container, Graphics, Text, TextStyle, Sprite } from 'pixi.js';
import { TowerType } from '../types';
import { AssetManager } from '../core/AssetManager';

/**
 * 可部署单位配置接口
 */
export interface DeployableUnit {
    /** 单位类型 */
    type: TowerType;
    /** 显示名称 */
    name: string;
    /** 部署费用 */
    cost: number;
    /** 单位颜色（用于图标） */
    color: number;
    /** 描述 */
    description: string;
}

/**
 * 部署栏事件回调接口
 */
export interface DeploymentBarCallbacks {
    /** 开始拖拽回调 */
    onDragStart?: (unitType: TowerType, cost: number) => void;
    /** 拖拽移动回调 */
    onDragMove?: (x: number, y: number) => void;
    /** 拖拽结束回调 */
    onDragEnd?: (x: number, y: number) => boolean;
    /** 拖拽取消回调 */
    onDragCancel?: () => void;
}

/**
 * 部署栏类
 */
export class DeploymentBar {
    /** PixiJS 容器 */
    private container: Container;

    /** 展开状态的内容容器 */
    private expandedContent: Container;

    /** 最小化状态的内容容器 */
    private minimizedContent: Container;

    /** 部署栏背景 */
    private background: Graphics;

    /** 可部署单位列表 */
    private deployableUnits: DeployableUnit[];

    /** 单位图标容器列表 */
    private unitContainers: Container[] = [];

    /** 回调函数 */
    private callbacks: DeploymentBarCallbacks = {};

    /** 当前是否在拖拽单位 */
    private isDragging: boolean = false;

    /** 当前拖拽的单位类型 */
    private draggingUnitType: TowerType | null = null;

    /** 当前拖拽的单位费用 */
    private draggingUnitCost: number = 0;

    /** 拖拽预览图形 */
    private dragPreview: Container | null = null;

    /** 是否正在拖动整个窗口 */
    private isDraggingBar: boolean = false;

    /** 窗口拖动开始时的鼠标位置 */
    private barDragStartMouse: { x: number; y: number } = { x: 0, y: 0 };

    /** 窗口拖动开始时的窗口位置 */
    private barDragStartPos: { x: number; y: number } = { x: 0, y: 0 };

    /** 是否最小化 */
    private isMinimized: boolean = false;

    /** 单位图标大小（调整后） */
    private readonly unitIconSize: number = 75;

    /** 图标间距 */
    private readonly iconSpacing: number = 15;

    /** 内边距 */
    private readonly padding: number = 20;

    /** 最小化按钮宽度 */
    private readonly minimizeBtnWidth: number = 40;

    /** 当前金币（用于判断是否可购买） */
    private currentGold: number = 100;

    /** 计算的部署栏宽度 */
    private barWidth: number = 0;

    /** 部署栏高度 */
    private readonly barHeight: number = 120;

    /** 最小化时的大小 */
    private readonly minimizedSize: number = 80;

    /**
     * 构造函数
     */
    constructor() {
        this.container = new Container();
        this.expandedContent = new Container();
        this.minimizedContent = new Container();
        this.background = new Graphics();

        // 初始化可部署单位列表
        this.deployableUnits = this.createDeployableUnits();

        // 计算宽度
        this.barWidth = this.padding * 2 +
            this.deployableUnits.length * this.unitIconSize +
            (this.deployableUnits.length - 1) * this.iconSpacing +
            this.minimizeBtnWidth;

        // 创建展开状态内容
        this.createExpandedContent();

        // 创建最小化状态内容
        this.createMinimizedContent();

        // 默认显示展开状态
        this.container.addChild(this.expandedContent);
    }

    /**
     * 创建可部署单位配置列表
     */
    private createDeployableUnits(): DeployableUnit[] {
        return [
            {
                type: TowerType.PROTOTYPE,
                name: '原型炮台',
                cost: 50,
                color: 0x346edb,
                description: '远程单体攻击，攻击范围3格',
            },
            {
                type: TowerType.FLAMETHROWER,
                name: '喷火器',
                cost: 80,
                color: 0x346edb,
                description: '近战范围攻击，攻击周围8格',
            },
            {
                type: TowerType.LASER,
                name: '激光塔',
                cost: 120,
                color: 0x346edb,
                description: '高伤害激光，每6秒攻击一次',
            },
            {
                type: TowerType.ANTIAIRCRAFT,
                name: '防空塔',
                cost: 150,
                color: 0x346edb,
                description: '远程 AOE 攻击，近处有盲区',
            },
            {
                type: TowerType.GATLING,
                name: '加特林塔',
                cost: 180,
                color: 0x346edb,
                description: '高速连续射击，每秒10发',
            },
            {
                type: TowerType.GUARD,
                name: '近卫塔',
                cost: 200,
                color: 0x346edb,
                description: '为周围4格+10防御，内置治疗',
            },
        ];
    }

    /**
     * 创建展开状态的内容
     */
    private createExpandedContent(): void {
        // 背景
        this.background = new Graphics();
        this.background.roundRect(0, 0, this.barWidth, this.barHeight, 12);
        this.background.fill({ color: 0x1a1a2e, alpha: 0.95 });
        this.background.stroke({ color: 0x4a4a6a, width: 2 });

        // 背景可交互（用于拖动窗口）
        this.background.eventMode = 'static';
        this.background.cursor = 'move';
        this.background.on('pointerdown', (event) => {
            this.startBarDrag(event.global.x, event.global.y);
        });

        this.expandedContent.addChild(this.background);

        // 创建单位图标
        this.createUnitIcons();

        // 创建最小化按钮
        this.createMinimizeButton();
    }

    /**
     * 创建单位图标
     */
    private createUnitIcons(): void {
        let xOffset = this.padding;

        for (const unit of this.deployableUnits) {
            const iconContainer = this.createUnitIcon(unit);
            iconContainer.x = xOffset;
            iconContainer.y = (this.barHeight - this.unitIconSize - 20) / 2;

            this.expandedContent.addChild(iconContainer);
            this.unitContainers.push(iconContainer);

            xOffset += this.unitIconSize + this.iconSpacing;
        }
    }

    /**
     * 创建单个单位图标
     * @param unit 单位配置
     */
    private createUnitIcon(unit: DeployableUnit): Container {
        const iconContainer = new Container();

        // 图标背景
        const iconBg = new Graphics();
        iconBg.roundRect(0, 0, this.unitIconSize, this.unitIconSize, 10);
        iconBg.fill({ color: 0x2c3e50 });
        iconBg.stroke({ color: unit.color, width: 3 });
        iconContainer.addChild(iconBg);

        // 获取对应纹理名称
        let textureName = '';
        if (unit.type === TowerType.PROTOTYPE) textureName = 'tower_prototype';
        else if (unit.type === TowerType.FLAMETHROWER) textureName = 'tower_flamethrower';
        else if (unit.type === TowerType.LASER) textureName = 'tower_laser';
        else if (unit.type === TowerType.ANTIAIRCRAFT) textureName = 'tower_antiaircraft';
        else if (unit.type === TowerType.GATLING) textureName = 'tower_gatling';
        else if (unit.type === TowerType.GUARD) textureName = 'tower_guard';

        const texture = AssetManager.getInstance().getTexture(textureName);

        if (texture) {
            // 如果有高清纹理，则使用图片
            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.x = this.unitIconSize / 2;
            sprite.y = this.unitIconSize / 2;
            sprite.width = this.unitIconSize - 16;
            sprite.height = this.unitIconSize - 16;
            iconContainer.addChild(sprite);
        } else {
            // 高清纹理不存在时，使用占位几何图形
            const unitIcon = new Graphics();
            unitIcon.circle(this.unitIconSize / 2, this.unitIconSize / 2, 30);
            unitIcon.fill({ color: unit.color });
            iconContainer.addChild(unitIcon);
        }

        // 费用文本
        const costStyle = new TextStyle({
            fontFamily: 'Microsoft YaHei, Arial',
            fontSize: 16,
            fill: '#ffd700',
            fontWeight: 'bold',
        });
        const costText = new Text({
            text: `${unit.cost}金`,
            style: costStyle,
        });
        costText.x = (this.unitIconSize - costText.width) / 2;
        costText.y = this.unitIconSize + 4;
        iconContainer.addChild(costText);

        // 设置交互
        iconContainer.eventMode = 'static';
        iconContainer.cursor = 'grab';

        // 鼠标按下事件（拖出部署）
        iconContainer.on('pointerdown', (event) => {
            event.stopPropagation(); // 阻止事件冒泡到背景
            this.startDrag(unit, event.global.x, event.global.y);
        });

        // 存储单位类型到容器
        (iconContainer as any).unitType = unit.type;
        (iconContainer as any).unitCost = unit.cost;
        (iconContainer as any).unitColor = unit.color;

        return iconContainer;
    }

    /**
     * 创建最小化按钮
     */
    private createMinimizeButton(): void {
        const btn = new Container();
        btn.x = this.barWidth - this.minimizeBtnWidth - 10;
        btn.y = (this.barHeight - this.minimizeBtnWidth) / 2;

        const btnBg = new Graphics();
        btnBg.roundRect(0, 0, this.minimizeBtnWidth, this.minimizeBtnWidth, 8);
        btnBg.fill({ color: 0x34495e });
        btnBg.stroke({ color: 0x5a6a7a, width: 2 });
        btn.addChild(btnBg);

        // 最小化图标（横线）
        const icon = new Graphics();
        icon.moveTo(10, this.minimizeBtnWidth / 2);
        icon.lineTo(this.minimizeBtnWidth - 10, this.minimizeBtnWidth / 2);
        icon.stroke({ color: 0xffffff, width: 3 });
        btn.addChild(icon);

        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        btn.on('pointerdown', (event) => {
            event.stopPropagation();
            this.toggleMinimize();
        });

        this.expandedContent.addChild(btn);
    }

    /**
     * 创建最小化状态的内容
     */
    private createMinimizedContent(): void {
        // 背景（可拖动移动窗口）
        const bg = new Graphics();
        bg.roundRect(0, 0, this.minimizedSize, this.minimizedSize, 10);
        bg.fill({ color: 0x1a1a2e, alpha: 0.95 });
        bg.stroke({ color: 0x4a4a6a, width: 2 });
        bg.eventMode = 'static';
        bg.cursor = 'move';
        bg.on('pointerdown', (event) => {
            this.startBarDrag(event.global.x, event.global.y);
        });
        this.minimizedContent.addChild(bg);

        // 展开图标（点击展开）
        const iconContainer = new Container();
        const iconSize = 50; // 图标区域大小
        iconContainer.x = (this.minimizedSize - iconSize) / 2;
        iconContainer.y = (this.minimizedSize - iconSize) / 2;

        // 图标背景（可点击区域）
        const iconBg = new Graphics();
        iconBg.roundRect(0, 0, iconSize, iconSize, 8);
        iconBg.fill({ color: 0x34495e });
        iconContainer.addChild(iconBg);

        // 箱子图标
        const iconStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 28,
            fill: '#ffffff',
        });
        const icon = new Text({
            text: '📦',
            style: iconStyle,
        });
        icon.x = (iconSize - icon.width) / 2;
        icon.y = (iconSize - icon.height) / 2;
        iconContainer.addChild(icon);

        // 图标交互（点击展开）
        iconContainer.eventMode = 'static';
        iconContainer.cursor = 'pointer';
        iconContainer.on('pointerdown', (event) => {
            event.stopPropagation(); // 阻止冒泡到背景
            this.toggleMinimize();
        });

        this.minimizedContent.addChild(iconContainer);
    }

    /**
     * 切换最小化状态
     */
    private toggleMinimize(): void {
        this.isMinimized = !this.isMinimized;

        // 移除当前内容
        this.container.removeChildren();

        if (this.isMinimized) {
            // 保存展开时的位置，最小化后保持在同一位置
            this.minimizedContent.x = 0;
            this.minimizedContent.y = 0;
            this.container.addChild(this.minimizedContent);
        } else {
            this.expandedContent.x = 0;
            this.expandedContent.y = 0;
            this.container.addChild(this.expandedContent);
        }

        console.log(`[部署栏] ${this.isMinimized ? '已最小化' : '已展开'}`);
    }

    /**
     * 开始拖动窗口
     */
    private startBarDrag(mouseX: number, mouseY: number): void {
        this.isDraggingBar = true;
        this.barDragStartMouse = { x: mouseX, y: mouseY };
        this.barDragStartPos = { x: this.container.x, y: this.container.y };
        console.log('[部署栏] 开始拖动窗口');
    }

    /**
     * 更新窗口拖动位置
     */
    public updateBarDrag(mouseX: number, mouseY: number): void {
        if (!this.isDraggingBar) return;

        const deltaX = mouseX - this.barDragStartMouse.x;
        const deltaY = mouseY - this.barDragStartMouse.y;

        this.container.x = this.barDragStartPos.x + deltaX;
        this.container.y = this.barDragStartPos.y + deltaY;
    }

    /**
     * 结束窗口拖动
     */
    public endBarDrag(): void {
        if (this.isDraggingBar) {
            this.isDraggingBar = false;
            console.log('[部署栏] 结束拖动窗口');
        }
    }

    /**
     * 检查是否正在拖动窗口
     */
    public getIsDraggingBar(): boolean {
        return this.isDraggingBar;
    }

    /**
     * 开始拖拽单位
     */
    private startDrag(unit: DeployableUnit, startX: number, startY: number): void {
        // 检查金币是否足够
        if (this.currentGold < unit.cost) {
            console.log('[部署栏] 金币不足，无法部署');
            return;
        }

        this.isDragging = true;
        this.draggingUnitType = unit.type;
        this.draggingUnitCost = unit.cost;

        // 创建拖拽预览
        this.createDragPreview(unit.type, unit.color);
        if (this.dragPreview) {
            this.dragPreview.x = startX;
            this.dragPreview.y = startY;
        }

        // 触发回调
        this.callbacks.onDragStart?.(unit.type, unit.cost);

        console.log(`[部署栏] 开始拖拽: ${unit.name}`);
    }

    /**
     * 创建拖拽预览图形
     */
    private createDragPreview(unitType: TowerType, color: number): void {
        if (this.dragPreview) {
            this.dragPreview.destroy({ children: true });
        }

        this.dragPreview = new Container();

        // 尝试获取对应纹理
        let textureName = '';
        if (unitType === TowerType.PROTOTYPE) textureName = 'tower_prototype';
        else if (unitType === TowerType.FLAMETHROWER) textureName = 'tower_flamethrower';
        else if (unitType === TowerType.LASER) textureName = 'tower_laser';
        else if (unitType === TowerType.ANTIAIRCRAFT) textureName = 'tower_antiaircraft';
        else if (unitType === TowerType.GATLING) textureName = 'tower_gatling';
        else if (unitType === TowerType.GUARD) textureName = 'tower_guard';

        const texture = AssetManager.getInstance().getTexture(textureName);

        if (texture) {
            // 使用图片预览
            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.width = 64;
            sprite.height = 64;
            sprite.alpha = 0.7;
            this.dragPreview.addChild(sprite);
        } else {
            // 使用几何预览
            const previewCircle = new Graphics();
            previewCircle.circle(0, 0, 25);
            previewCircle.fill({ color, alpha: 0.7 });
            previewCircle.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
            this.dragPreview.addChild(previewCircle);
        }

        // 添加到舞台
        if (this.container.parent) {
            this.container.parent.addChild(this.dragPreview);
        }
    }

    /**
     * 更新拖拽位置
     */
    public updateDragPosition(x: number, y: number): void {
        if (!this.isDragging || !this.dragPreview) return;

        this.dragPreview.x = x;
        this.dragPreview.y = y;

        this.callbacks.onDragMove?.(x, y);
    }

    /**
     * 结束拖拽
     */
    public endDrag(x: number, y: number): boolean {
        if (!this.isDragging) return false;

        const success = this.callbacks.onDragEnd?.(x, y) ?? false;

        this.cleanupDrag();

        return success;
    }

    /**
     * 取消拖拽
     */
    public cancelDrag(): void {
        if (!this.isDragging) return;

        this.callbacks.onDragCancel?.();
        this.cleanupDrag();

        console.log('[部署栏] 拖拽取消');
    }

    /**
     * 清理拖拽状态
     */
    private cleanupDrag(): void {
        this.isDragging = false;
        this.draggingUnitType = null;
        this.draggingUnitCost = 0;

        if (this.dragPreview) {
            this.dragPreview.destroy({ children: true });
            this.dragPreview = null;
        }
    }

    /**
     * 设置回调函数
     */
    public setCallbacks(callbacks: DeploymentBarCallbacks): void {
        this.callbacks = callbacks;
    }

    /**
     * 更新当前金币
     */
    public updateGold(gold: number): void {
        this.currentGold = gold;

        // 更新图标可用状态
        for (let i = 0; i < this.unitContainers.length; i++) {
            const container = this.unitContainers[i];
            const unitCost = (container as any).unitCost;

            if (gold >= unitCost) {
                container.alpha = 1;
                container.cursor = 'grab';
            } else {
                container.alpha = 0.5;
                container.cursor = 'not-allowed';
            }
        }
    }

    /**
     * 检查是否正在拖拽单位
     */
    public getIsDragging(): boolean {
        return this.isDragging;
    }

    /**
     * 获取当前拖拽的单位类型
     */
    public getDraggingUnitType(): TowerType | null {
        return this.draggingUnitType;
    }

    /**
     * 获取当前拖拽的单位费用
     */
    public getDraggingUnitCost(): number {
        return this.draggingUnitCost;
    }

    /**
     * 获取容器
     */
    public getContainer(): Container {
        return this.container;
    }

    /**
     * 设置位置
     */
    public setPosition(x: number, y: number): void {
        this.container.x = x;
        this.container.y = y;
    }

    /**
     * 居中放置在屏幕底部
     */
    public centerAtBottom(screenWidth: number, screenHeight: number): void {
        const x = (screenWidth - this.barWidth) / 2;
        const y = screenHeight - this.barHeight - 20;
        this.setPosition(x, y);
    }

    /**
     * 获取部署栏高度
     */
    public getBarHeight(): number {
        return this.barHeight;
    }

    /**
     * 销毁部署栏
     */
    public destroy(): void {
        this.cleanupDrag();
        this.container.destroy({ children: true });
    }
}

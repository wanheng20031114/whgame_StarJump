/**
 * ============================================================
 * 炮台信息面板
 * ============================================================
 * 显示选中炮台的名称、属性和状态
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Tower } from '../entities/Tower';

/**
 * 炮台信息面板类
 */
export class TowerInfoPanel {
    /** PixiJS 容器 */
    private container: Container;

    /** 背景图形 */
    private background: Graphics;

    /** 标题文本 */
    private titleText: Text;

    /** 属性文本列表 */
    private statsTexts: Record<string, Text> = {};

    /** 面板宽度 */
    private readonly width: number = 240;

    /** 面板高度 */
    private readonly height: number = 200;

    /**
     * 构造函数
     */
    constructor() {
        this.container = new Container();
        this.background = new Graphics();
        this.container.addChild(this.background);

        // 创建标题
        const titleStyle = new TextStyle({
            fontFamily: 'Microsoft YaHei, Arial',
            fontSize: 18,
            fill: '#ffffff',
            fontWeight: 'bold',
        });
        this.titleText = new Text({ text: '单位信息', style: titleStyle });
        this.titleText.x = 15;
        this.titleText.y = 15;
        this.container.addChild(this.titleText);

        // 初始化属性文本
        this.createStatsTexts();

        // 默认隐藏
        this.container.visible = false;
    }

    /**
     * 创建属性文本项
     */
    private createStatsTexts(): void {
        const statsKeys = [
            { key: 'health', label: '❤ 生命值' },
            { key: 'attack', label: '⚔ 攻击力' },
            { key: 'defense', label: '🛡 防御力' },
            { key: 'magicResist', label: '✨ 法术抗性' },
            { key: 'attackSpeed', label: '⚡ 攻击速度' },
        ];

        const textStyle = new TextStyle({
            fontFamily: 'Microsoft YaHei, Arial',
            fontSize: 14,
            fill: '#cccccc',
        });

        let yOffset = 50;
        for (const item of statsKeys) {
            const labelText = new Text({ text: `${item.label}:`, style: textStyle });
            labelText.x = 15;
            labelText.y = yOffset;
            this.container.addChild(labelText);

            const valueText = new Text({ text: '0', style: textStyle });
            valueText.x = 120;
            valueText.y = yOffset;
            this.container.addChild(valueText);

            this.statsTexts[item.key] = valueText;
            yOffset += 25;
        }
    }

    /**
     * 显示炮台信息
     * @param tower 选中的炮台
     */
    public show(tower: Tower): void {
        const stats = tower.getStats();
        this.titleText.text = tower.getName();

        // 更新文本内容
        this.statsTexts['health'].text = `${Math.ceil(stats.health)} / ${stats.maxHealth}`;
        this.statsTexts['attack'].text = stats.attack.toString();
        this.statsTexts['defense'].text = stats.defense.toString();
        this.statsTexts['magicResist'].text = stats.magicResist.toString();
        this.statsTexts['attackSpeed'].text = `${stats.attackSpeed} / 秒`;

        // 绘制背景
        this.drawBackground();

        this.container.visible = true;
    }

    /**
     * 绘制面板背景
     */
    private drawBackground(): void {
        this.background.clear();

        // 半透明深色框
        this.background.roundRect(0, 0, this.width, this.height, 10);
        this.background.fill({ color: 0x1a1a2e, alpha: 0.9 });
        this.background.stroke({ color: 0x4a4a6a, width: 2 });

        // 标题分割线
        this.background.moveTo(10, 40);
        this.background.lineTo(this.width - 10, 40);
        this.background.stroke({ color: 0x4a4a6a, width: 1 });
    }

    /**
     * 隐藏面板
     */
    public hide(): void {
        this.container.visible = false;
    }

    /**
     * 获取显示容器
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
}

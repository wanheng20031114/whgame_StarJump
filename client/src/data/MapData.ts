/**
 * ============================================================
 * 地图数据定义
 * ============================================================
 * 包含关卡的布局、尺寸和自定义配置
 */

import { TileChar } from '../types';

// ============================================================
// 地图主题系统
// ============================================================

/**
 * 地图主题配置接口
 * 用于定义一套完整的地形贴图风格
 */
export interface MapTheme {
    /** 主题ID */
    id: string;
    /** 主题名称（用于显示） */
    name: string;
    /** 各地块类型对应的资源别名 */
    tiles: {
        ground: string;      // 地面贴图资源别名
        platform: string;    // 高台贴图资源别名
        obstacle: string;    // 障碍物贴图资源别名
    };
}

/**
 * 预设主题：自然风格
 * 使用草地、木质高台、花朵作为障碍物
 */
export const THEME_NATURE: MapTheme = {
    id: 'nature',
    name: '自然风格',
    tiles: {
        ground: 'env_grass',
        platform: 'env_platform_nature',
        obstacle: 'env_flower',
    },
};

/**
 * 预设主题：科技风格
 * 使用金属地面、科幻平台、集装箱作为障碍物
 */
export const THEME_TECH: MapTheme = {
    id: 'tech',
    name: '科技风格',
    tiles: {
        ground: 'env_ground_tech',
        platform: 'env_platform_tech',
        obstacle: 'env_obstacle_tech',
    },
};

/** 所有可用主题列表 */
export const MAP_THEMES: MapTheme[] = [THEME_NATURE, THEME_TECH];

/**
 * 根据主题ID获取主题配置
 * @param themeId 主题ID
 * @returns 主题配置，未找到则返回默认自然风格
 */
export function getThemeById(themeId?: string): MapTheme {
    if (!themeId) return THEME_NATURE;
    return MAP_THEMES.find(t => t.id === themeId) || THEME_NATURE;
}

// ============================================================
// 地图数据配置
// ============================================================

/**
 * 地图配置接口
 */
export interface MapDataConfig {
    /** 关卡名称 */
    name: string;
    /** 宽度（格子数） */
    width: number;
    /** 高度（格子数） */
    height: number;
    /** 布局数据（二维字符数组） */
    layout: TileChar[][];
    /** 主题ID，引用预设主题（默认使用自然风格） */
    themeId?: string;
    /** 自定义贴图覆盖（可选，覆盖主题中的默认贴图） */
    tileOverrides?: Partial<MapTheme['tiles']>;
}

/**
 * 默认地图数据（28x14）
 * G: 地面, P: 高台, R: 红门, B: 蓝门, O: 障碍物, .: 空白
 */
export const DEFAULT_MAP_DATA: MapDataConfig = {
    name: "默认关卡",
    width: 28,
    height: 14,
    layout: [
        ['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],
        ['O', 'R', 'G', 'G', 'G', 'O', 'P', 'P', 'P', 'P', 'O', 'G', 'G', 'G', 'G', 'G', 'O', 'P', 'P', 'P', 'P', 'O', 'G', 'G', 'G', 'G', 'G', 'O'],
        ['O', 'G', 'O', 'O', 'G', 'O', 'P', 'P', 'P', 'P', 'O', 'G', 'O', 'O', 'O', 'G', 'O', 'P', 'P', 'P', 'P', 'O', 'G', 'O', 'O', 'O', 'G', 'O'],
        ['O', 'G', 'O', 'P', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'P', 'O', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'P', 'O', 'G', 'G', 'O'],
        ['O', 'G', 'O', 'P', 'P', 'P', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'P', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'P', 'P', 'P', 'O', 'G', 'O', 'O'],
        ['O', 'R', 'G', 'G', 'G', 'G', 'G', 'P', 'P', 'P', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'P', 'P', 'P', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O'],
        ['O', 'O', 'O', 'O', 'O', 'O', 'G', 'P', 'P', 'P', 'G', 'O', 'O', 'G', 'O', 'O', 'G', 'P', 'P', 'P', 'G', 'O', 'O', 'O', 'O', 'O', 'G', 'O'],
        ['O', 'O', 'O', 'O', 'O', 'O', 'G', 'P', 'P', 'P', 'G', 'O', 'O', 'G', 'O', 'O', 'G', 'P', 'P', 'P', 'G', 'O', 'B', 'B', 'O', 'O', 'G', 'O'],
        ['O', 'R', 'G', 'G', 'G', 'G', 'G', 'P', 'P', 'P', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'P', 'P', 'P', 'G', 'O', 'G', 'G', 'G', 'G', 'G', 'O'],
        ['O', 'G', 'O', 'P', 'P', 'P', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'P', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'P', 'P', 'P', 'O', 'G', 'O', 'O'],
        ['O', 'G', 'O', 'P', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'O', 'P', 'O', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'P', 'O', 'G', 'G', 'O'],
        ['O', 'G', 'O', 'O', 'G', 'O', 'P', 'P', 'P', 'P', 'O', 'G', 'O', 'O', 'O', 'G', 'O', 'P', 'P', 'P', 'P', 'O', 'G', 'O', 'O', 'O', 'G', 'O'],
        ['O', 'R', 'G', 'G', 'G', 'O', 'P', 'P', 'P', 'P', 'O', 'G', 'G', 'G', 'G', 'G', 'O', 'P', 'P', 'P', 'P', 'O', 'G', 'G', 'G', 'G', 'G', 'O'],
        ['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],
    ],
    // 使用科技风格主题（可切换为 'nature' 使用自然风格）
    themeId: 'tech',
};

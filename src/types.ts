// ===== 全局常量与类型定义 =====
export const W = 1280;
export const H = 720;
export const COLS = 9;
export const GRID_X = 250; // 草坪左边界
export const GRID_Y = 112; // 草坪上边界
export const CELL_W = 104;
export const GRID_H = 596;

export type SceneId = 'day' | 'night' | 'pool';

/** 外观描述：美术全部由代码按这个描述绘制，换贴图时只需改 art/ 目录 */
export type PlantShape =
  | 'shooter' | 'bud' | 'wall' | 'berry' | 'bell' | 'spike'
  | 'gourd' | 'hoop' | 'cap' | 'tuber' | 'pad';
export type Deco = 'double' | 'quad' | 'flame' | 'ice' | 'armor' | 'thorn' | 'sun' | 'fuse' | 'big' | 'moon';
export interface ArtSpec {
  shape: PlantShape;
  body: number;
  accent: number;
  deco?: Deco[];
}

export interface ShootSpec {
  interval: number;
  damage: number;
  count?: number;          // 每轮连发数
  kind: 'straight' | 'lob';
  range?: number;          // 射程（格），不填为整行
  slow?: number;           // 减速秒数
  fire?: boolean;          // 火焰弹：解除减速
  splash?: number;         // 溅射半径 px
  pierce?: boolean;        // 穿透
  color: number;
}

export interface PlantDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  cooldown: number;
  hp: number;
  tier: 0 | 1 | 2;         // 0 = 基础卡牌；1/2 = 融合产物
  art: ArtSpec;
  shoot?: ShootSpec;
  produce?: { interval: number; amount: number };
  bomb?: { fuse: number; radius: number; damage: number; freeze?: number; lane?: boolean };
  mine?: { arm: number; damage: number; radius: number; charges?: number };
  contact?: { dps: number; slow?: boolean };
  thorns?: number;         // 被啃食时反伤 dps
  deathBlast?: { radius: number; damage: number };
  igniter?: number;        // 穿过它的直线子弹伤害倍率
  platform?: boolean;      // 水面平台
  nocturnal?: boolean;     // 白天睡觉
  low?: boolean;           // 贴地，僵尸不会啃
}

export interface ZombieDef {
  id: string;
  name: string;
  desc: string;
  hp: number;
  armor?: number;          // 头盔
  shield?: number;         // 正面盾牌：只挡直线子弹
  speed: number;           // px/s
  dps: number;
  cost: number;            // 出怪预算
  scale?: number;
  smash?: boolean;         // 一击砸扁
  leap?: boolean;          // 跳过第一株植物
  summon?: { interval: number; id: string; count: number };
  look: 'walker' | 'pot' | 'knight' | 'runner' | 'shield' | 'leaper' | 'brute' | 'necro' | 'king';
}

export interface LevelDef {
  id: number;
  name: string;
  scene: SceneId;
  waves: number;
  pool: string[];          // 可出现的僵尸
  budget: number;          // 第一波预算
  growth: number;          // 每波增长
  sun: number;             // 初始阳光
  unlock?: string;         // 通关解锁的植物
  tip?: string;
}

import type { LevelDef, SceneId } from '../types';

// 每一关：场景、波数、可出现的僵尸、出怪预算。通关后解锁 unlock 指定的植物。
type Row = [name: string, scene: SceneId, waves: number, pool: string[], budget: number, growth: number, sun: number, unlock?: string, tip?: string];

const ROWS: Row[] = [
  // ---- 第一章：白天 ----
  ['初次交锋', 'day', 6, ['walker'], 1, 0.5, 150, 'stonemelon', '把同一种卡牌种到已有的植物上就能融合。试试把籽弹苗种在籽弹苗上。'],
  ['铁锅来了', 'day', 8, ['walker', 'pot'], 1.5, 0.6, 100, 'lurker', '光芽也可以融合：光芽 + 光芽 = 双生光芽。'],
  ['脚下有刺', 'day', 9, ['walker', 'pot'], 2, 0.7, 100, 'popberry'],
  ['快跑', 'day', 10, ['walker', 'pot', 'runner'], 2, 0.8, 100, 'frostbell', '疾行尸来得很快，前排要早点立起来。'],
  ['寒意', 'day', 10, ['walker', 'pot', 'runner'], 2.5, 0.9, 100, 'bramble'],
  ['铁罐头', 'day', 12, ['walker', 'pot', 'runner', 'knight'], 3, 1.0, 100, 'gourd'],
  ['盾墙', 'day', 12, ['walker', 'pot', 'knight', 'shield'], 3, 1.1, 100, 'embertrunk', '木盾挡直线子弹，投石葫芦可以越过去。'],
  ['白昼尽头', 'day', 14, ['walker', 'pot', 'runner', 'knight', 'shield', 'brute'], 4, 1.2, 150, 'glowcap', '巨尸一锤一个，用爆爆莓招呼它。'],
  // ---- 第二章：夜晚（没有天降阳光）----
  ['入夜', 'night', 8, ['walker', 'pot'], 2, 0.7, 175, 'mooncap', '夜里没有天降阳光，荧光菇不要钱。'],
  ['月下', 'night', 10, ['walker', 'pot', 'runner'], 2.5, 0.8, 125],
  ['跳跃者', 'night', 10, ['walker', 'pot', 'leaper'], 3, 0.9, 125, undefined, '跳跃尸会跳过第一株植物，前面放个便宜的垫一下。'],
  ['暗影', 'night', 12, ['walker', 'pot', 'runner', 'leaper', 'knight'], 3, 1.0, 125],
  ['招魂', 'night', 12, ['walker', 'pot', 'knight', 'necro'], 4, 1.1, 175, undefined, '招魂尸优先处理，否则越打越多。'],
  ['夜行军', 'night', 14, ['walker', 'pot', 'runner', 'shield', 'leaper', 'necro'], 4, 1.2, 175],
  ['黎明之前', 'night', 14, ['pot', 'runner', 'knight', 'shield', 'leaper', 'necro', 'brute'], 5, 1.3, 200],
  ['长夜尸王', 'night', 12, ['pot', 'knight', 'shield', 'leaper', 'necro', 'brute', 'king'], 6, 1.5, 275, 'lilypad', '尸王在最后一波登场。'],
  // ---- 第三章：池塘（中间两行是水）----
  ['下水', 'pool', 10, ['walker', 'pot', 'runner'], 3, 0.9, 250, undefined, '水面要先铺浮叶，再把植物种在浮叶上。'],
  ['两栖', 'pool', 12, ['walker', 'pot', 'runner', 'knight'], 3.5, 1.0, 225],
  ['水上盾阵', 'pool', 12, ['walker', 'pot', 'knight', 'shield', 'leaper'], 4, 1.1, 225],
  ['涨潮', 'pool', 14, ['pot', 'runner', 'knight', 'shield', 'leaper', 'necro'], 4.5, 1.2, 225],
  ['巨浪', 'pool', 14, ['pot', 'runner', 'knight', 'leaper', 'brute'], 5, 1.3, 250],
  ['亡者之潮', 'pool', 16, ['pot', 'runner', 'knight', 'shield', 'necro', 'brute'], 5.5, 1.4, 250],
  ['决堤', 'pool', 16, ['pot', 'runner', 'knight', 'shield', 'leaper', 'necro', 'brute'], 6.5, 1.5, 275],
  ['终局尸王', 'pool', 16, ['pot', 'knight', 'shield', 'leaper', 'necro', 'brute', 'wraith', 'king'], 7, 1.7, 350, undefined, '影魇会在中途现身并不断换行，别把火力都堆在一行；尸王在最后一波登场。'],
];

export const LEVELS: LevelDef[] = ROWS.map((r, i) => ({
  id: i + 1, name: r[0], scene: r[1], waves: r[2], pool: r[3], budget: r[4], growth: r[5], sun: r[6], unlock: r[7], tip: r[8],
}));

export const CHAPTERS = [
  { name: '第一章 · 白天', scene: 'day' as SceneId, from: 0 },
  { name: '第二章 · 夜晚', scene: 'night' as SceneId, from: 8 },
  { name: '第三章 · 池塘', scene: 'pool' as SceneId, from: 16 },
];

/** 无尽模式：三个场景各一张图 */
export function endlessLevel(scene: SceneId): LevelDef {
  return { id: -1, name: '无尽模式', scene, waves: Infinity, pool: ['walker', 'pot', 'runner', 'knight', 'shield', 'leaper', 'necro', 'brute', 'wraith', 'king'], budget: 2, growth: 1.0, sun: 250 };
}

export const sceneRows = (s: SceneId) => (s === 'pool' ? 6 : 5);
export const isWaterRow = (s: SceneId, row: number) => s === 'pool' && (row === 2 || row === 3);

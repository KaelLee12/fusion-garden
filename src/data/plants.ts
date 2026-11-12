import type { PlantDef } from '../types';

// 颜色
const G = 0x5cb85c, SUN = 0xffd23f, ICE = 0x7fd4ff, FIRE = 0xff7a2f, STONE = 0x9aa58a,
  RED = 0xe2475b, PURPLE = 0x9b6bd6, BROWN = 0xb07a45, STEEL = 0xb8c4cc, DARK = 0x4a4a55;

/** 基础植物（可作为卡牌带入关卡） */
const BASE: PlantDef[] = [
  { id: 'sunbud', name: '光芽', desc: '定期产出阳光，是一切的起点。', cost: 50, cooldown: 7.5, hp: 300, tier: 0,
    art: { shape: 'bud', body: SUN, accent: 0xfff3a8 }, produce: { interval: 22, amount: 25 } },
  { id: 'seedling', name: '籽弹苗', desc: '向前方发射种子的基础射手。', cost: 100, cooldown: 7.5, hp: 300, tier: 0,
    art: { shape: 'shooter', body: G, accent: 0xd8f26b }, shoot: { interval: 1.4, damage: 20, kind: 'straight', color: 0xb8e04a } },
  { id: 'stonemelon', name: '石皮瓜', desc: '皮糙肉厚，用来挡住僵尸。', cost: 50, cooldown: 25, hp: 4000, tier: 0,
    art: { shape: 'wall', body: STONE, accent: 0x6f7a62 } },
  { id: 'lurker', name: '伏地栗', desc: '埋好后需要时间准备，踩到就炸。', cost: 25, cooldown: 25, hp: 300, tier: 0,
    art: { shape: 'tuber', body: 0x8fae4a, accent: SUN }, mine: { arm: 13, damage: 1800, radius: 90 } },
  { id: 'popberry', name: '爆爆莓', desc: '种下后立刻爆炸，清掉周围一片。', cost: 150, cooldown: 40, hp: 9999, tier: 0,
    art: { shape: 'berry', body: 0x7a4fc0, accent: 0xd9c2ff, deco: ['fuse'] }, bomb: { fuse: 1.0, radius: 185, damage: 1800 } },
  { id: 'frostbell', name: '霜铃', desc: '发射冰晶，命中后让僵尸减速。', cost: 175, cooldown: 7.5, hp: 300, tier: 0,
    art: { shape: 'bell', body: ICE, accent: 0xe8f8ff, deco: ['ice'] }, shoot: { interval: 1.4, damage: 20, kind: 'straight', slow: 4, color: ICE } },
  { id: 'bramble', name: '刺藤', desc: '贴地生长，持续扎伤踩上来的僵尸，不会被啃。', cost: 100, cooldown: 7.5, hp: 300, tier: 0, low: true,
    art: { shape: 'spike', body: 0x4f9a4a, accent: 0xd9e8c8 }, contact: { dps: 22 } },
  { id: 'gourd', name: '投石葫芦', desc: '抛物线投石，能越过盾牌直接砸中僵尸。', cost: 100, cooldown: 7.5, hp: 300, tier: 0,
    art: { shape: 'gourd', body: 0xd9a441, accent: 0x8a7a6a }, shoot: { interval: 2.6, damage: 45, kind: 'lob', color: 0x9a8f80 } },
  { id: 'embertrunk', name: '焰环藤', desc: '直线子弹穿过火环后变成火焰弹，伤害翻倍。', cost: 175, cooldown: 7.5, hp: 600, tier: 0,
    art: { shape: 'hoop', body: 0x8a5a36, accent: FIRE, deco: ['flame'] }, igniter: 2 },
  { id: 'glowcap', name: '荧光菇', desc: '免费的短程射手，只在夜晚醒着。', cost: 0, cooldown: 7.5, hp: 200, tier: 0, nocturnal: true,
    art: { shape: 'cap', body: PURPLE, accent: 0xd6f7ff }, shoot: { interval: 1.4, damage: 20, kind: 'straight', range: 3.2, color: 0xc9a6ff } },
  { id: 'mooncap', name: '月光菇', desc: '夜晚便宜的阳光来源。', cost: 25, cooldown: 7.5, hp: 200, tier: 0, nocturnal: true,
    art: { shape: 'cap', body: 0x5f7fd6, accent: 0xfff3a8, deco: ['moon'] }, produce: { interval: 22, amount: 15 } },
  { id: 'lilypad', name: '浮叶', desc: '铺在水面上，其他植物才能种在水里。', cost: 25, cooldown: 7.5, hp: 300, tier: 0, platform: true,
    art: { shape: 'pad', body: 0x3f9d5a, accent: 0x7fd48f } },
];

/** 融合产物（只能在场上融合得到） */
const FUSED: PlantDef[] = [
  // ---- 射手系 ----
  { id: 'twinseed', name: '双籽苗', desc: '一次发射两颗种子。', cost: 200, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'shooter', body: G, accent: 0xd8f26b, deco: ['double'] }, shoot: { interval: 1.4, damage: 20, count: 2, kind: 'straight', color: 0xb8e04a } },
  { id: 'gatling', name: '连珠苗', desc: '一次发射四颗种子。', cost: 300, cooldown: 0, hp: 500, tier: 2,
    art: { shape: 'shooter', body: 0x3f9d5a, accent: 0xd8f26b, deco: ['quad'] }, shoot: { interval: 1.4, damage: 20, count: 4, kind: 'straight', color: 0xb8e04a } },
  { id: 'firegatling', name: '火神连珠', desc: '四连发火焰弹。', cost: 475, cooldown: 0, hp: 600, tier: 2,
    art: { shape: 'shooter', body: 0xc9502a, accent: FIRE, deco: ['quad', 'flame'] }, shoot: { interval: 1.4, damage: 40, count: 4, kind: 'straight', fire: true, color: FIRE } },
  { id: 'sunshooter', name: '光弹苗', desc: '一边射击一边产出阳光。', cost: 150, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'shooter', body: G, accent: SUN, deco: ['sun'] }, shoot: { interval: 1.4, damage: 20, kind: 'straight', color: SUN }, produce: { interval: 22, amount: 25 } },
  { id: 'armorshooter', name: '铁甲苗', desc: '披着石甲的射手，很耐啃。', cost: 150, cooldown: 0, hp: 2800, tier: 1,
    art: { shape: 'shooter', body: G, accent: 0xd8f26b, deco: ['armor'] }, shoot: { interval: 1.4, damage: 20, kind: 'straight', color: 0xb8e04a } },
  { id: 'frostseed', name: '霜雪连珠', desc: '两连发冰晶。', cost: 275, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'shooter', body: 0x4fb6d6, accent: ICE, deco: ['double', 'ice'] }, shoot: { interval: 1.4, damage: 20, count: 2, kind: 'straight', slow: 4, color: ICE } },
  { id: 'fireshooter', name: '火籽苗', desc: '直接发射火焰弹。', cost: 275, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'shooter', body: 0xd9642f, accent: FIRE, deco: ['flame'] }, shoot: { interval: 1.4, damage: 40, kind: 'straight', fire: true, color: FIRE } },
  { id: 'burstshooter', name: '爆弹苗', desc: '种子命中后小范围爆炸。', cost: 250, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'shooter', body: 0xa6394a, accent: RED, deco: ['fuse'] }, shoot: { interval: 1.6, damage: 30, kind: 'straight', splash: 80, color: RED } },
  // ---- 阳光系 ----
  { id: 'twinsun', name: '双生光芽', desc: '阳光产量翻倍。', cost: 100, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'bud', body: SUN, accent: 0xfff3a8, deco: ['double'] }, produce: { interval: 22, amount: 50 } },
  { id: 'triplesun', name: '三生光芽', desc: '阳光产量三倍。', cost: 150, cooldown: 0, hp: 500, tier: 2,
    art: { shape: 'bud', body: 0xffb62e, accent: 0xfff3a8, deco: ['double', 'big', 'sun'] }, produce: { interval: 22, amount: 75 } },
  { id: 'sunwall', name: '光壁瓜', desc: '挡路的同时产出阳光。', cost: 100, cooldown: 0, hp: 4000, tier: 1,
    art: { shape: 'wall', body: 0xd9c25a, accent: 0x9a8a3a, deco: ['sun'] }, produce: { interval: 22, amount: 25 } },
  { id: 'sunmoon', name: '日月菇', desc: '昼夜都醒着，产量更高。', cost: 75, cooldown: 0, hp: 300, tier: 1,
    art: { shape: 'cap', body: 0xffb62e, accent: 0xfff3a8, deco: ['moon', 'sun'] }, produce: { interval: 22, amount: 40 } },
  { id: 'twinmoon', name: '双月菇', desc: '夜晚产量翻倍。', cost: 50, cooldown: 0, hp: 300, tier: 1, nocturnal: true,
    art: { shape: 'cap', body: 0x5f7fd6, accent: 0xfff3a8, deco: ['moon', 'double'] }, produce: { interval: 22, amount: 30 } },
  // ---- 墙系 ----
  { id: 'boulder', name: '巨岩瓜', desc: '血量极高的超级墙。', cost: 100, cooldown: 0, hp: 10000, tier: 1,
    art: { shape: 'wall', body: 0x7f8a78, accent: 0x55604e, deco: ['big'] } },
  { id: 'thornwall', name: '荆棘瓜', desc: '啃它的僵尸会被扎伤。', cost: 150, cooldown: 0, hp: 4000, tier: 1,
    art: { shape: 'wall', body: 0x7a9a5a, accent: 0x4f6a3a, deco: ['thorn'] }, thorns: 45 },
  { id: 'blastwall', name: '火药瓜', desc: '被啃光时大爆炸。', cost: 200, cooldown: 0, hp: 4000, tier: 1,
    art: { shape: 'wall', body: 0xa85a4a, accent: 0x6a3a30, deco: ['fuse'] }, deathBlast: { radius: 185, damage: 1800 } },
  // ---- 冰火系 ----
  { id: 'blizzard', name: '寒潮铃', desc: '冰晶穿透一整行。', cost: 350, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'bell', body: 0x4fa6e8, accent: 0xe8f8ff, deco: ['ice', 'double'] }, shoot: { interval: 1.6, damage: 25, kind: 'straight', slow: 5, pierce: true, color: 0xbfeaff } },
  { id: 'steam', name: '蒸汽铃', desc: '喷出穿透的高温蒸汽。', cost: 350, cooldown: 0, hp: 500, tier: 1,
    art: { shape: 'bell', body: 0xd9d9e6, accent: FIRE, deco: ['flame'] }, shoot: { interval: 1.4, damage: 35, kind: 'straight', pierce: true, fire: true, color: 0xf2f2ff } },
  { id: 'inferno', name: '烈阳环', desc: '穿过的子弹伤害变为三倍。', cost: 350, cooldown: 0, hp: 900, tier: 1,
    art: { shape: 'hoop', body: 0x6a3a26, accent: 0x6fd0ff, deco: ['flame', 'big'] }, igniter: 3 },
  // ---- 爆炸系 ----
  { id: 'megaberry', name: '轰天莓', desc: '爆炸范围和威力都大得多。', cost: 300, cooldown: 0, hp: 9999, tier: 1,
    art: { shape: 'berry', body: 0x4a2f8a, accent: 0xd9c2ff, deco: ['fuse', 'big'] }, bomb: { fuse: 1.2, radius: 360, damage: 3200 } },
  { id: 'iceberry', name: '冰爆莓', desc: '冻住大范围内的僵尸。', cost: 325, cooldown: 0, hp: 9999, tier: 1,
    art: { shape: 'berry', body: 0x4fa6e8, accent: 0xe8f8ff, deco: ['fuse', 'ice'] }, bomb: { fuse: 1.0, radius: 420, damage: 300, freeze: 7 } },
  { id: 'laneburner', name: '烈焰莓', desc: '烧光一整行。', cost: 325, cooldown: 0, hp: 9999, tier: 1,
    art: { shape: 'berry', body: FIRE, accent: 0xffd23f, deco: ['fuse', 'flame'] }, bomb: { fuse: 1.0, radius: 0, damage: 2200, lane: true } },
  { id: 'megamine', name: '巨雷栗', desc: '准备更快，炸得更广。', cost: 175, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'tuber', body: 0x5f8a3a, accent: FIRE, deco: ['big'] }, mine: { arm: 8, damage: 2600, radius: 200 } },
  { id: 'chainmine', name: '连环栗', desc: '可以连续引爆三次。', cost: 50, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'tuber', body: 0xb0a23a, accent: 0xffffff, deco: ['double'] }, mine: { arm: 10, damage: 1800, radius: 90, charges: 3 } },
  // ---- 地刺系 ----
  { id: 'steelbramble', name: '钢刺藤', desc: '伤害更高的地刺。', cost: 200, cooldown: 0, hp: 500, tier: 1, low: true,
    art: { shape: 'spike', body: 0x6a7a8a, accent: STEEL, deco: ['big'] }, contact: { dps: 55 } },
  { id: 'lavabramble', name: '熔岩藤', desc: '灼烧踩上来的僵尸。', cost: 275, cooldown: 0, hp: 500, tier: 1, low: true,
    art: { shape: 'spike', body: 0x8a3a26, accent: FIRE, deco: ['flame'] }, contact: { dps: 75 } },
  { id: 'frostbramble', name: '冰刺藤', desc: '扎伤并减速。', cost: 275, cooldown: 0, hp: 500, tier: 1, low: true,
    art: { shape: 'spike', body: 0x4f8ab6, accent: ICE, deco: ['ice'] }, contact: { dps: 28, slow: true } },
  // ---- 投手系 ----
  { id: 'twingourd', name: '双投葫芦', desc: '一次投出两块石头。', cost: 200, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'gourd', body: 0xd9a441, accent: 0x8a7a6a, deco: ['double'] }, shoot: { interval: 2.6, damage: 45, count: 2, kind: 'lob', color: 0x9a8f80 } },
  { id: 'bombgourd', name: '火药葫芦', desc: '投出会爆炸的火药罐。', cost: 250, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'gourd', body: 0xa6394a, accent: DARK, deco: ['fuse'] }, shoot: { interval: 2.8, damage: 60, kind: 'lob', splash: 100, color: DARK } },
  { id: 'icegourd', name: '冰晶葫芦', desc: '投出范围减速的冰块。', cost: 275, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'gourd', body: 0x6fbfe6, accent: ICE, deco: ['ice'] }, shoot: { interval: 2.8, damage: 45, kind: 'lob', splash: 80, slow: 5, color: ICE } },
  { id: 'firegourd', name: '火球葫芦', desc: '投出高伤害火球。', cost: 275, cooldown: 0, hp: 400, tier: 1,
    art: { shape: 'gourd', body: 0xd9642f, accent: FIRE, deco: ['flame'] }, shoot: { interval: 2.6, damage: 100, kind: 'lob', fire: true, color: FIRE } },
  // ---- 蘑菇系 ----
  { id: 'spraycap', name: '喷雾菇', desc: '穿透的中程喷雾，夜晚醒着。', cost: 0, cooldown: 0, hp: 300, tier: 1, nocturnal: true,
    art: { shape: 'cap', body: 0x7a4fc0, accent: 0xd6f7ff, deco: ['double'] }, shoot: { interval: 1.4, damage: 25, kind: 'straight', range: 4.5, pierce: true, color: 0xc9a6ff } },
];

export const PLANTS: Record<string, PlantDef> = {};
for (const p of [...BASE, ...FUSED]) PLANTS[p.id] = p;
export const BASE_PLANTS = BASE.map((p) => p.id);
export const ALL_PLANTS = [...BASE, ...FUSED].map((p) => p.id);

/** 融合配方：[材料A, 材料B, 产物]。顺序无关。新增融合只需在这里加一行并在上面定义产物。 */
export const RECIPE_LIST: [string, string, string][] = [
  ['seedling', 'seedling', 'twinseed'],
  ['twinseed', 'seedling', 'gatling'],
  ['gatling', 'embertrunk', 'firegatling'],
  ['seedling', 'sunbud', 'sunshooter'],
  ['seedling', 'stonemelon', 'armorshooter'],
  ['seedling', 'frostbell', 'frostseed'],
  ['seedling', 'embertrunk', 'fireshooter'],
  ['seedling', 'popberry', 'burstshooter'],
  ['sunbud', 'sunbud', 'twinsun'],
  ['twinsun', 'sunbud', 'triplesun'],
  ['sunbud', 'stonemelon', 'sunwall'],
  ['sunbud', 'mooncap', 'sunmoon'],
  ['mooncap', 'mooncap', 'twinmoon'],
  ['stonemelon', 'stonemelon', 'boulder'],
  ['stonemelon', 'bramble', 'thornwall'],
  ['stonemelon', 'popberry', 'blastwall'],
  ['frostbell', 'frostbell', 'blizzard'],
  ['frostbell', 'embertrunk', 'steam'],
  ['embertrunk', 'embertrunk', 'inferno'],
  ['popberry', 'popberry', 'megaberry'],
  ['popberry', 'frostbell', 'iceberry'],
  ['popberry', 'embertrunk', 'laneburner'],
  ['lurker', 'popberry', 'megamine'],
  ['lurker', 'lurker', 'chainmine'],
  ['bramble', 'bramble', 'steelbramble'],
  ['bramble', 'embertrunk', 'lavabramble'],
  ['bramble', 'frostbell', 'frostbramble'],
  ['gourd', 'gourd', 'twingourd'],
  ['gourd', 'popberry', 'bombgourd'],
  ['gourd', 'frostbell', 'icegourd'],
  ['gourd', 'embertrunk', 'firegourd'],
  ['glowcap', 'glowcap', 'spraycap'],
];

const key = (a: string, b: string) => (a < b ? `${a}+${b}` : `${b}+${a}`);
const RECIPES = new Map<string, string>();
for (const [a, b, r] of RECIPE_LIST) RECIPES.set(key(a, b), r);

/** 查询两株植物能否融合，返回产物 id */
export function fuseResult(a: string, b: string): string | undefined {
  return RECIPES.get(key(a, b));
}

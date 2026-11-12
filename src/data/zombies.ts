import type { ZombieDef } from '../types';

const LIST: ZombieDef[] = [
  { id: 'walker', name: '行尸', desc: '最普通的僵尸。', hp: 200, speed: 21, dps: 100, cost: 1, look: 'walker' },
  { id: 'pot', name: '铁锅尸', desc: '头顶铁锅，多挨不少打。', hp: 200, armor: 370, speed: 21, dps: 100, cost: 2, look: 'pot' },
  { id: 'runner', name: '疾行尸', desc: '跑得很快，但很脆。', hp: 170, speed: 52, dps: 100, cost: 2, look: 'runner' },
  { id: 'knight', name: '重盔尸', desc: '全覆式头盔，非常耐打。', hp: 200, armor: 1100, speed: 21, dps: 100, cost: 4, look: 'knight' },
  { id: 'shield', name: '木盾尸', desc: '盾牌挡住直线子弹，投石、地刺和爆炸可以绕过。', hp: 200, shield: 1100, speed: 21, dps: 100, cost: 4, look: 'shield' },
  { id: 'leaper', name: '跳跃尸', desc: '会跳过遇到的第一株植物。', hp: 340, speed: 44, dps: 100, cost: 3, leap: true, look: 'leaper' },
  { id: 'necro', name: '招魂尸', desc: '隔一会儿就在身边召出行尸。', hp: 600, speed: 15, dps: 100, cost: 7, look: 'necro',
    summon: { interval: 9, id: 'walker', count: 2 } },
  { id: 'brute', name: '巨尸', desc: '血量极高，一锤砸扁植物。', hp: 3000, speed: 14, dps: 0, cost: 10, smash: true, scale: 1.5, look: 'brute' },
  { id: 'king', name: '尸王', desc: '关底首领：砸扁植物，并不断召唤铁锅尸。', hp: 14000, speed: 7, dps: 0, cost: 60, smash: true, scale: 1.9, look: 'king',
    summon: { interval: 11, id: 'pot', count: 3 } },
];

export const ZOMBIES: Record<string, ZombieDef> = {};
for (const z of LIST) ZOMBIES[z.id] = z;
export const ALL_ZOMBIES = LIST.map((z) => z.id);

import { LEVELS } from './data/levels';

// 存档：localStorage，读写都包了 try/catch，存不了也能照常玩
export interface SaveData {
  cleared: number;                 // 已通关的最大关卡 id
  unlocked: string[];              // 已解锁的基础植物
  seen: string[];                  // 已合成过的融合植物
  best: Record<string, number>;    // 无尽模式最高波数
  mute: boolean;
}
const KEY = 'fusion-garden-save-v1';
const fresh = (): SaveData => ({ cleared: 0, unlocked: ['sunbud', 'seedling'], seen: [], best: {}, mute: false });

export let save: SaveData = fresh();
export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) save = { ...fresh(), ...JSON.parse(raw) };
  } catch { /* 忽略 */ }
}
export function writeSave() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* 忽略 */ }
}
export function resetSave() { save = fresh(); writeSave(); }
export function unlockAll() {
  save.cleared = LEVELS.length;
  for (const l of LEVELS) if (l.unlock && !save.unlocked.includes(l.unlock)) save.unlocked.push(l.unlock);
  writeSave();
}
/** 卡槽数量随进度增加 */
export const cardSlots = () => (save.cleared >= 16 ? 10 : save.cleared >= 8 ? 8 : 6);

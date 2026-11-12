import { LEVELS } from './data/levels';

// 存档：localStorage，读写都包了 try/catch，存不了也能照常玩
export interface SaveData {
  done: number[];                  // 已通关的关卡 id
  opened: number[];                // 手动解锁的关卡 id
  unlocked: string[];              // 已解锁的基础植物
  seen: string[];                  // 已合成过的融合植物
  best: Record<string, number>;    // 无尽模式最高波数
  mute: boolean;
}
const KEY = 'fusion-garden-save-v1';
const fresh = (): SaveData => ({ done: [], opened: [], unlocked: ['sunbud', 'seedling'], seen: [], best: {}, mute: false });

export let save: SaveData = fresh();
export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    // 旧存档只有 cleared（已通关的最大关卡 id），迁移成逐关记录
    const { cleared, ...rest } = JSON.parse(raw) as Partial<SaveData> & { cleared?: number };
    save = { ...fresh(), ...rest };
    if (!rest.done && cleared) save.done = LEVELS.filter((l) => l.id <= cleared).map((l) => l.id);
  } catch { /* 忽略 */ }
}
export function writeSave() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* 忽略 */ }
}
export function resetSave() { save = fresh(); writeSave(); }

export const isDone = (id: number) => save.done.includes(id);
/** 可进入：第一关、已通关、前一关已通关，或被手动解锁 */
export const isOpen = (id: number) => id === 1 || isDone(id) || isDone(id - 1) || save.opened.includes(id);
function grant(plant?: string) { if (plant && !save.unlocked.includes(plant)) save.unlocked.push(plant); }
/** 通关：记录该关并发放它的奖励植物 */
export function markDone(id: number) {
  if (!isDone(id)) save.done.push(id);
  grant(LEVELS[id - 1]?.unlock);
  writeSave();
}
/** 手动解锁单独一关：不改动其他关卡的通关状态，但补发它之前关卡的奖励植物，保证能打 */
export function openLevel(id: number) {
  if (!save.opened.includes(id)) save.opened.push(id);
  for (const l of LEVELS) if (l.id < id) grant(l.unlock);
  writeSave();
}
export function unlockAll() {
  save.done = LEVELS.map((l) => l.id);
  for (const l of LEVELS) grant(l.unlock);
  writeSave();
}
/** 卡槽数量随进度增加（手动解锁的关卡按“打到它前一关”计算） */
export function cardSlots() {
  const reach = Math.max(0, ...save.done, ...save.opened.map((id) => id - 1));
  return reach >= 16 ? 10 : reach >= 8 ? 8 : 6;
}

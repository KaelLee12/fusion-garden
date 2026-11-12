import { Container, Graphics } from 'pixi.js';
import { H, W, type SceneId } from '../types';
import { ALL_PLANTS, BASE_PLANTS, PLANTS, RECIPE_LIST } from '../data/plants';
import { ALL_ZOMBIES, ZOMBIES } from '../data/zombies';
import { CHAPTERS, LEVELS } from '../data/levels';
import { PlantView, plantIcon } from '../art/plantArt';
import { ZombieView } from '../art/zombieArt';
import { makeScene } from '../art/scene';
import { button, label, panel, tappable } from './widgets';
import { cardSlots, resetSave, save, unlockAll, writeSave } from '../save';
import { sfx } from '../audio';

export interface Screen { view: Container; update?(dt: number): void; destroy?(): void }
export interface Nav {
  menu(): void; levels(): void; endless(): void; almanac(): void;
  pick(levelId: number, scene?: SceneId): void;
  play(levelId: number, cards: string[], scene?: SceneId): void;
}

function backdrop(scene: SceneId = 'day', dim = 0.45): Container {
  const c = new Container(); c.addChild(makeScene(scene).view);
  c.addChild(new Graphics().rect(0, 0, W, H).fill({ color: 0x0c140c, alpha: dim }));
  return c;
}
function header(c: Container, title: string, nav: Nav, back: () => void = () => nav.menu()) {
  const t = label(title, 40, 0xffd23f, { stroke: 0x1c2416 }); t.anchor.set(0.5, 0); t.position.set(W / 2, 22); c.addChild(t);
  const b = button('← 返回', 130, 50, back, 0x8a6f5a, 20); b.position.set(24, 22); c.addChild(b);
}

// ================= 主菜单 =================
export function menuScreen(nav: Nav): Screen {
  const view = backdrop('day', 0.3);
  const actors: { v: PlantView | ZombieView; z?: boolean }[] = [];
  const row = ['sunbud', 'twinseed', 'thornwall', 'firegatling', 'blizzard', 'firegourd'];
  row.forEach((id, i) => { const p = new PlantView(PLANTS[id].art); p.view.position.set(150 + i * 104, 640); p.view.scale.set(1.15); view.addChild(p.view); actors.push({ v: p }); });
  ['walker', 'knight', 'brute'].forEach((id, i) => { const z = new ZombieView(ZOMBIES[id]); z.view.position.set(930 + i * 110, 646); z.view.scale.set(1.15); view.addChild(z.view); actors.push({ v: z, z: true }); });

  const title = label('融合花园', 96, 0xffd23f, { stroke: 0x1c2416 }); title.anchor.set(0.5); title.position.set(W / 2, 130);
  const sub = label('种下 · 融合 · 守住花园', 26, 0xffffff, { stroke: 0x1c2416 }); sub.anchor.set(0.5); sub.position.set(W / 2, 205);
  view.addChild(title, sub);
  const mk = (text: string, y: number, fn: () => void, color?: number) => { const b = button(text, 300, 64, fn, color, 28); b.position.set(W / 2 - 150, y); view.addChild(b); return b; };
  mk('冒险模式', 260, () => nav.levels());
  mk('无尽模式', 340, () => nav.endless(), 0x4f7fb6);
  mk('图鉴与配方', 420, () => nav.almanac(), 0x9b6bd6);
  const prog = label(`进度 ${save.cleared}/${LEVELS.length} · 已发现融合 ${save.seen.length}/${ALL_PLANTS.length - BASE_PLANTS.length}`, 18, 0xffffff, { stroke: 0x1c2416 });
  prog.anchor.set(0.5); prog.position.set(W / 2, 510); view.addChild(prog);

  const mute = button(save.mute ? '音效：关' : '音效：开', 130, 44, () => { save.mute = !save.mute; writeSave(); mute.setText(save.mute ? '音效：关' : '音效：开'); }, 0x55604e, 18);
  mute.position.set(24, 24); view.addChild(mute);
  const all = button('全部解锁', 130, 44, () => { unlockAll(); nav.menu(); }, 0x55604e, 18); all.position.set(W - 154, 24); view.addChild(all);
  let armed = false;
  const reset = button('重置存档', 130, 44, () => { if (!armed) { armed = true; reset.setText('再点一次确认'); return; } resetSave(); nav.menu(); }, 0x8a4a4a, 18);
  reset.position.set(W - 154, 78); view.addChild(reset);

  let t = 0;
  return { view, update(dt) { t += dt; for (const a of actors) a.z ? (a.v as ZombieView).update(t, true, false, false) : (a.v as PlantView).update(t, dt); title.scale.set(1 + 0.015 * Math.sin(t * 2)); } };
}

// ================= 选关 =================
export function levelScreen(nav: Nav): Screen {
  const view = backdrop('day', 0.55);
  header(view, '冒险模式', nav);
  CHAPTERS.forEach((ch, ci) => {
    const y = 110 + ci * 200;
    const t = label(ch.name, 26, 0xffffff, { stroke: 0x1c2416 }); t.position.set(70, y); view.addChild(t);
    for (let i = 0; i < 8; i++) {
      const lv = LEVELS[ch.from + i], open = lv.id <= save.cleared + 1, done = lv.id <= save.cleared;
      const b = new Container(); b.position.set(70 + i * 144, y + 44);
      const g = new Graphics().roundRect(0, 0, 130, 120, 14).fill(open ? (done ? 0x4f9a4a : 0xd9a441) : 0x4a4f56).stroke({ width: 3, color: 0xffffff, alpha: 0.3 });
      const n = label(`${ci + 1}-${i + 1}`, 34, 0xffffff, { stroke: 0x1c2416 }); n.anchor.set(0.5); n.position.set(65, 40);
      const nm = label(open ? lv.name : '未解锁', 18, 0xffffff, { stroke: 0x1c2416 }); nm.anchor.set(0.5); nm.position.set(65, 84);
      b.addChild(g, n, nm);
      if (done) { const s = label('✓', 22, 0xfff3a8, { stroke: 0x1c2416 }); s.position.set(102, 4); b.addChild(s); }
      if (lv.unlock && !done && open) { const ic = plantIcon(PLANTS[lv.unlock].art, 0.3); ic.position.set(112, 116); b.addChild(ic); }
      b.alpha = open ? 1 : 0.6;
      tappable(b, 130, 120, () => { if (!open) { sfx('deny'); return; } sfx('click'); nav.pick(lv.id); });
      view.addChild(b);
    }
  });
  return { view };
}

// ================= 无尽模式 =================
export function endlessScreen(nav: Nav): Screen {
  const view = backdrop('night', 0.5);
  header(view, '无尽模式', nav);
  const info = label('僵尸一波比一波强，看你能撑到第几波。初始阳光 250。', 22, 0xffffff, { stroke: 0x1c2416 }); info.anchor.set(0.5); info.position.set(W / 2, 130); view.addChild(info);
  (['day', 'night', 'pool'] as SceneId[]).forEach((s, i) => {
    const names = { day: '白天', night: '夜晚', pool: '池塘' };
    const box = new Container(); box.position.set(150 + i * 340, 200);
    const thumb = makeScene(s).view; thumb.scale.set(0.23); thumb.position.set(3, 3);
    const frame = new Graphics().roundRect(0, 0, 300, 170, 10).stroke({ width: 5, color: 0xffd23f });
    const t = label(names[s], 30, 0xffffff, { stroke: 0x1c2416 }); t.anchor.set(0.5); t.position.set(150, 200);
    const best = label(`最高纪录：第 ${save.best[s] ?? 0} 波`, 20, 0xfff3a8, { stroke: 0x1c2416 }); best.anchor.set(0.5); best.position.set(150, 236);
    const b = button('开始', 160, 54, () => nav.pick(-1, s), 0x4f7fb6); b.position.set(70, 264);
    box.addChild(thumb, frame, t, best, b); view.addChild(box);
  });
  return { view };
}

// ================= 选卡 =================
export function pickScreen(nav: Nav, levelId: number, scene?: SceneId): Screen {
  const lv = levelId > 0 ? LEVELS[levelId - 1] : undefined;
  const sc = scene ?? lv!.scene;
  const view = backdrop(sc, 0.6);
  header(view, lv ? `第 ${lv.id} 关 · ${lv.name}` : '无尽模式 · 选择植物', nav, () => (lv ? nav.levels() : nav.endless()));
  const slots = cardSlots();
  const avail = BASE_PLANTS.filter((id) => save.unlocked.includes(id));
  const useful = (id: string) => !(PLANTS[id].platform && sc !== 'pool') && !(PLANTS[id].nocturnal && sc !== 'night');
  let chosen = avail.filter(useful).slice(0, slots);
  if (sc === 'pool' && avail.includes('lilypad') && !chosen.includes('lilypad')) chosen[chosen.length - 1] = 'lilypad';

  const count = label('', 22, 0xffffff, { stroke: 0x1c2416 }); count.position.set(70, 96); view.addChild(count);
  const detail = panel(1140, 150, 0x1c2416, 0.85, 14); detail.position.set(70, 470); view.addChild(detail);
  const dName = label('', 26, 0xffd23f); dName.position.set(20, 14);
  const dDesc = label('', 20, 0xffffff, { bold: false, wrap: 1100 }); dDesc.position.set(20, 52);
  const dFuse = label('', 18, 0xfff3a8, { bold: false, wrap: 1100 }); dFuse.position.set(20, 86);
  detail.addChild(dName, dDesc, dFuse);
  const start = button('开始战斗', 240, 64, () => nav.play(levelId, chosen, scene), 0x4f9a4a, 28); start.position.set(W / 2 - 120, 640); view.addChild(start);

  const cells: { id: string; frame: Graphics }[] = [];
  const show = (id: string) => {
    const d = PLANTS[id];
    dName.text = `${d.name}　阳光 ${d.cost}　冷却 ${d.cooldown}s`;
    dDesc.text = d.desc + (d.nocturnal && sc !== 'night' ? '（这一关是白天，它会睡觉）' : '');
    const fs = RECIPE_LIST.filter(([a, b]) => a === id || b === id).filter(([a, b]) => PLANTS[a].tier === 0 && PLANTS[b].tier === 0)
      .map(([a, b, r]) => `+ ${PLANTS[a === id ? b : a].name} = ${PLANTS[r].name}`);
    dFuse.text = fs.length ? '可融合：' + fs.join('　') : '';
  };
  const refresh = () => {
    count.text = `已选 ${chosen.length}/${slots}（点击卡片选择或取消）`;
    for (const c of cells) { const on = chosen.includes(c.id); c.frame.clear().roundRect(0, 0, 120, 150, 12).fill(on ? 0xe8dcc0 : 0x8a8478).stroke({ width: 5, color: on ? 0xffd23f : 0x4a4538 }); }
    start.setEnabled(chosen.length > 0);
  };
  avail.forEach((id, i) => {
    const b = new Container(); b.position.set(70 + (i % 9) * 128, 136 + Math.floor(i / 9) * 162);
    const frame = new Graphics(); const ic = plantIcon(PLANTS[id].art, 0.72); ic.position.set(60, 100);
    const nm = label(PLANTS[id].name, 18, 0x3a2f22); nm.anchor.set(0.5); nm.position.set(60, 122);
    const cost = label(String(PLANTS[id].cost), 16, 0x9a5a1a); cost.anchor.set(0.5); cost.position.set(60, 140);
    b.addChild(frame, ic, nm, cost); view.addChild(b); cells.push({ id, frame });
    tappable(b, 120, 150, () => {
      show(id);
      if (chosen.includes(id)) chosen = chosen.filter((x) => x !== id);
      else if (chosen.length < slots) chosen.push(id); else { sfx('deny'); return; }
      sfx('click'); refresh();
    });
  });
  if (lv?.tip) { dName.text = '提示'; dDesc.text = lv.tip; } else show(avail[0]);
  refresh();
  return { view };
}

// ================= 图鉴 =================
export function almanacScreen(nav: Nav): Screen {
  const view = backdrop('night', 0.7);
  header(view, '图鉴与配方', nav);
  const body = new Container(); view.addChild(body);
  const anim: PlantView[] = []; const zanim: ZombieView[] = [];
  const tabs = ['融合配方', '植物', '僵尸'];
  const tabBtns = tabs.map((name, i) => { const b = button(name, 150, 46, () => open(i), 0x55604e, 20); b.position.set(W - 500 + i * 160, 26); view.addChild(b); return b; });

  function open(i: number) {
    body.removeChildren().forEach((c) => c.destroy({ children: true })); anim.length = 0; zanim.length = 0;
    tabBtns.forEach((b, k) => (b.alpha = k === i ? 1 : 0.55));
    if (i === 0) {
      RECIPE_LIST.forEach(([a, b, r], k) => {
        const col = Math.floor(k / 11), row = k % 11, x = 50 + col * 400, y = 90 + row * 51;
        const bg = new Graphics().roundRect(x, y, 384, 46, 10).fill({ color: save.seen.includes(r) ? 0x2f4a2a : 0x1c2416, alpha: 0.85 });
        body.addChild(bg);
        const put = (id: string, px: number) => { const ic = plantIcon(PLANTS[id].art, 0.36); ic.position.set(x + px, y + 43); body.addChild(ic); };
        put(a, 30); put(b, 110); put(r, 196);
        const plus = label('+', 24, 0xffffff); plus.anchor.set(0.5); plus.position.set(x + 70, y + 23);
        const eq = label('=', 24, 0xffffff); eq.anchor.set(0.5); eq.position.set(x + 152, y + 23);
        const nm = label(PLANTS[r].name, 19, save.seen.includes(r) ? 0xffd23f : 0xffffff); nm.anchor.set(0, 0.5); nm.position.set(x + 232, y + 23);
        body.addChild(plus, eq, nm);
      });
      const tip = label('融合方法：把卡牌种在已有的植物上，或用手套把一株植物拖到另一株上。绿色底表示已经合成过。', 18, 0xffffff, { bold: false }); tip.position.set(50, 700); tip.anchor.set(0, 1); body.addChild(tip);
    } else if (i === 1) {
      const info = panel(1180, 96, 0x1c2416, 0.9, 14); info.position.set(50, 612); body.addChild(info);
      const nm = label('点击植物查看详情', 24, 0xffd23f); nm.position.set(18, 10);
      const ds = label('', 19, 0xffffff, { bold: false, wrap: 1140 }); ds.position.set(18, 46); info.addChild(nm, ds);
      ALL_PLANTS.forEach((id, k) => {
        const d = PLANTS[id], x = 50 + (k % 11) * 108, y = 92 + Math.floor(k / 11) * 128;
        const cell = new Container(); cell.position.set(x, y);
        const bg = new Graphics().roundRect(0, 0, 100, 120, 10).fill({ color: d.tier ? 0x3a2f4a : 0x2f4a2a, alpha: 0.9 });
        const pv = new PlantView(d.art); pv.view.scale.set(0.62); pv.view.position.set(50, 86); anim.push(pv);
        const t = label(d.name, 15, 0xffffff); t.anchor.set(0.5); t.position.set(50, 104);
        cell.addChild(bg, pv.view, t); body.addChild(cell);
        tappable(cell, 100, 120, () => {
          sfx('click'); nm.text = `${d.name}${d.tier ? '（融合）' : `　阳光 ${d.cost}　冷却 ${d.cooldown}s`}　生命 ${d.hp >= 9999 ? '—' : d.hp}`;
          const st: string[] = [d.desc];
          if (d.shoot) st.push(`伤害 ${d.shoot.damage}${d.shoot.count ? '×' + d.shoot.count : ''}，间隔 ${d.shoot.interval}s`);
          if (d.produce) st.push(`每 ${d.produce.interval}s 产 ${d.produce.amount} 阳光`);
          const rc = RECIPE_LIST.find((x) => x[2] === id); if (rc) st.push(`配方：${PLANTS[rc[0]].name} + ${PLANTS[rc[1]].name}`);
          ds.text = st.join('　');
        });
      });
    } else {
      const info = panel(1180, 96, 0x1c2416, 0.9, 14); info.position.set(50, 590); body.addChild(info);
      const nm = label('点击僵尸查看详情', 24, 0xffd23f); nm.position.set(18, 10);
      const ds = label('', 19, 0xffffff, { bold: false, wrap: 1140 }); ds.position.set(18, 46); info.addChild(nm, ds);
      ALL_ZOMBIES.forEach((id, k) => {
        const d = ZOMBIES[id], x = 50 + (k % 5) * 238, y = 100 + Math.floor(k / 5) * 240;
        const cell = new Container(); cell.position.set(x, y);
        const bg = new Graphics().roundRect(0, 0, 226, 228, 12).fill({ color: 0x3a2a2a, alpha: 0.9 });
        const zv = new ZombieView(d); zv.view.scale.set(0.95 / (d.scale ?? 1) ** 0.75); zv.view.position.set(113, 186); zanim.push(zv);
        const t = label(d.name, 20, 0xffffff); t.anchor.set(0.5); t.position.set(113, 208);
        cell.addChild(bg, zv.view, t); body.addChild(cell);
        tappable(cell, 226, 228, () => { sfx('click'); nm.text = `${d.name}　生命 ${d.hp}${d.armor ? ' + 头盔 ' + d.armor : ''}${d.shield ? ' + 盾 ' + d.shield : ''}　速度 ${d.speed}`; ds.text = d.desc; });
      });
    }
  }
  open(0);
  let t = 0;
  return { view, update(dt) { t += dt; for (const p of anim) p.update(t, dt); for (const z of zanim) z.update(t, true, false, false); } };
}

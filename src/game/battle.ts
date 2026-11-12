import { Container, Graphics, Rectangle, Text, type FederatedPointerEvent } from 'pixi.js';
import { CELL_W, COLS, GRID_H, GRID_X, GRID_Y, H, W, type LevelDef, type PlantDef, type ZombieDef } from '../types';
import { PLANTS, fuseResult } from '../data/plants';
import { ZOMBIES } from '../data/zombies';
import { isWaterRow, sceneRows } from '../data/levels';
import { PlantView, plantIcon } from '../art/plantArt';
import { ZombieView } from '../art/zombieArt';
import { makeScene, type SceneView } from '../art/scene';
import { button, label, panel, tappable } from '../ui/widgets';
import { sfx } from '../audio';
import { save, writeSave } from '../save';

export type BattleResult = 'win' | 'lose' | 'quit' | 'retry' | 'next';

class Plant {
  hp: number; art: PlantView;
  shootT: number; burst = 0; burstT = 0;
  prodT: number; fuseT: number; armT: number; armed = false; charges: number;
  flashT = 0; dead = false;
  constructor(public def: PlantDef, public row: number, public col: number) {
    this.hp = def.hp; this.art = new PlantView(def.art);
    this.shootT = 0.4 + Math.random() * 0.6;
    this.prodT = def.produce ? 5 + Math.random() * 6 : 0;
    this.fuseT = def.bomb?.fuse ?? 0;
    this.armT = def.mine?.arm ?? 0;
    this.charges = def.mine?.charges ?? 1;
    if (def.mine) this.art.setArmed(false);
  }
}
class Zombie {
  hp: number; armor: number; shield: number; art: ZombieView;
  slowT = 0; freezeT = 0; flashT = 0; atkT = 0.8; biteT = 0; summonT: number; blinkT: number;
  jumped = false; jumpT = 0; jumpFrom = 0; dead = false; deathT = 0; eating = false;
  constructor(public def: ZombieDef, public row: number, public x: number) {
    this.hp = def.hp; this.armor = def.armor ?? 0; this.shield = def.shield ?? 0;
    this.art = new ZombieView(def); this.summonT = def.summon ? def.summon.interval * 0.6 : 0; this.blinkT = def.blink ?? 0;
  }
}
interface Proj {
  kind: 'straight' | 'lob'; row: number; x: number; y: number; view: Graphics;
  dmg: number; slow: number; fire: boolean; splash: number; pierce: boolean; color: number;
  hit: Set<Zombie>; maxX: number; ignited: number;
  sx: number; sy: number; tx: number; ty: number; t: number; target?: Zombie;
}
interface Sun { x: number; y: number; ty: number; amount: number; life: number; view: Container; flying: boolean }
interface Fx { view: Container; life: number; max: number; step(k: number, dt: number): void }
interface Tile { plant?: Plant; pad: boolean; padView?: Container }
interface Guard { x: number; active: boolean; used: boolean; view: Graphics }
interface Card { def: PlantDef; cd: number; view: Container; mask: Graphics; frame: Graphics; cost: Text }
type Sel = { type: 'card'; card: Card } | { type: 'shovel' } | { type: 'glove'; from?: Plant } | null;

const PROJ_SPEED = 440;

export class Battle {
  view = new Container();
  private scene: SceneView;
  private tileLayer = new Container();
  private actors = new Container();
  private projLayer = new Container();
  private fxLayer = new Container();
  private hud = new Container();
  private overlay = new Container();

  private rows: number; private ch: number; private sc: number;
  private grid: Tile[][] = [];
  private plants: Plant[] = [];
  private zombies: Zombie[] = [];
  private projs: Proj[] = [];
  private suns: Sun[] = [];
  private fxs: Fx[] = [];
  private guards: Guard[] = [];
  private cards: Card[] = [];
  private pendingSpawns: { t: number; id: string; row: number }[] = [];

  private sun: number; private sunText!: Text; private waveText!: Text; private banner!: Text; private tipText?: Text;
  private sel: Sel = null;
  private hover: { r: number; c: number } | null = null;
  private hi = new Graphics(); private ghost = new Container(); private hint!: Text;
  private toolViews: Record<string, Container> = {};
  private time = 0; private skyT = 6; private waveIdx = 0; private waveT: number; private bannerT = 0;
  private speed = 1; private paused = false; private ended = false; private tipT = 0;
  private speedBtn!: ReturnType<typeof button>;
  kills = 0;

  constructor(private level: LevelDef, cardIds: string[], private onExit: (r: BattleResult, wave: number) => void) {
    this.rows = sceneRows(level.scene); this.ch = GRID_H / this.rows; this.sc = this.rows === 6 ? 0.86 : 1;
    this.sun = level.sun; this.waveT = level.id < 0 ? 18 : 25;
    this.scene = makeScene(level.scene);
    this.actors.sortableChildren = true;
    this.view.addChild(this.scene.view, this.tileLayer, this.hi, this.actors, this.ghost, this.projLayer, this.fxLayer, this.hud, this.overlay);
    for (let r = 0; r < this.rows; r++) {
      this.grid.push(Array.from({ length: COLS }, () => ({ pad: false })));
      const gv = new Graphics();
      gv.circle(0, -24, 24).fill(0x8a8f96).stroke({ width: 3, color: 0x4a4f56 });
      gv.circle(-8, -32, 6).fill({ color: 0xffffff, alpha: 0.25 }); gv.circle(8, -18, 4).fill(0x6a6f76); gv.circle(-6, -14, 3).fill(0x6a6f76);
      gv.scale.set(this.sc);
      const gd: Guard = { x: GRID_X - 62, active: false, used: false, view: gv };
      gv.position.set(gd.x, this.rowY(r)); gv.zIndex = r * 100 + 60; this.actors.addChild(gv); this.guards.push(gd);
    }
    this.buildHud(cardIds);
    this.ghost.alpha = 0.55; this.ghost.visible = false;
    // 草坪交互
    this.view.eventMode = 'static'; this.view.hitArea = new Rectangle(0, 0, W, H);
    this.view.on('pointermove', (e) => this.onMove(e));
    this.view.on('pointerdown', (e) => this.onMove(e));
    this.view.on('pointertap', (e) => this.onTap(e));
    if (level.tip) {
      this.tipText = label(level.tip, 22, 0xffffff, { stroke: 0x1c2416, wrap: 760, align: 'center' });
      this.tipText.anchor.set(0.5, 1); this.tipText.position.set(GRID_X + COLS * CELL_W / 2, H - 14); this.hud.addChild(this.tipText); this.tipT = 12;
    }
  }

  // ---------- 坐标 ----------
  private rowY(r: number) { return GRID_Y + (r + 1) * this.ch - 10; }
  private colX(c: number) { return GRID_X + c * CELL_W + CELL_W / 2; }
  private tileAt(x: number, y: number) {
    const c = Math.floor((x - GRID_X) / CELL_W), r = Math.floor((y - GRID_Y) / this.ch);
    return c >= 0 && c < COLS && r >= 0 && r < this.rows ? { r, c } : null;
  }
  private get asleepScene() { return this.level.scene !== 'night'; }

  // ---------- HUD ----------
  private buildHud(cardIds: string[]) {
    const sunBox = panel(118, 92, 0x3a2f22, 0.95, 12, 0xffd23f); sunBox.position.set(14, 6);
    const ico = new Graphics(); drawSun(ico, 22); ico.position.set(73, 36);
    this.sunText = label(String(this.sun), 26, 0xfff3a8, { stroke: 0x3a2f22 }); this.sunText.anchor.set(0.5); this.sunText.position.set(73, 78);
    this.hud.addChild(sunBox, ico, this.sunText);
    cardIds.forEach((id, i) => {
      const def = PLANTS[id];
      const v = new Container(); v.position.set(142 + i * 82, 6);
      const bg = new Graphics().roundRect(0, 0, 78, 92, 10).fill(0xe8dcc0).stroke({ width: 3, color: 0x6a5a3a });
      const icon = plantIcon(def.art, 0.52); icon.position.set(39, 64);
      const cost = label(String(def.cost), 18, 0x3a2f22); cost.anchor.set(0.5); cost.position.set(39, 80);
      const costBg = new Graphics().roundRect(14, 69, 50, 21, 8).fill({ color: 0xffffff, alpha: 0.8 });
      const mask = new Graphics(); const frame = new Graphics();
      v.addChild(bg, icon, costBg, cost, mask, frame);
      const card: Card = { def, cd: 0, view: v, mask, frame, cost };
      tappable(v, 78, 92, () => this.pickCard(card));
      this.cards.push(card); this.hud.addChild(v);
    });
    const tool = (key: string, x: number, draw: (g: Graphics) => void, fn: () => void) => {
      const box = new Container(); const g = new Graphics();
      g.roundRect(0, 0, 62, 92, 10).fill(0x55483a).stroke({ width: 3, color: 0x2a2218 }); draw(g);
      const t = label(key === 'shovel' ? '铲子' : '手套', 15, 0xffffff); t.anchor.set(0.5); t.position.set(31, 78);
      box.addChild(g, t); box.position.set(x, 6); tappable(box, 62, 92, fn); this.hud.addChild(box); this.toolViews[key] = box;
    };
    tool('shovel', 970, (g) => { g.rect(28, 14, 6, 34).fill(0xb07a45); g.poly([18, 44, 44, 44, 40, 64, 31, 70, 22, 64]).fill(0xb8c4cc).stroke({ width: 2, color: 0x555c66 }); },
      () => { sfx('click'); this.setSel(this.sel?.type === 'shovel' ? null : { type: 'shovel' }); });
    tool('glove', 1038, (g) => { g.roundRect(18, 30, 26, 32, 8).fill(0xffd23f).stroke({ width: 2, color: 0x9a7a1a }); for (const x of [19, 26, 33]) g.roundRect(x, 14, 7, 22, 3).fill(0xffd23f).stroke({ width: 2, color: 0x9a7a1a }); g.roundRect(42, 34, 10, 16, 4).fill(0xffd23f).stroke({ width: 2, color: 0x9a7a1a }); },
      () => { sfx('click'); this.setSel(this.sel?.type === 'glove' ? null : { type: 'glove' }); });
    this.speedBtn = button('1×', 74, 44, () => { this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1; this.speedBtn.setText(this.speed + '×'); }, 0x4f7fb6, 22);
    this.speedBtn.position.set(1112, 8);
    const pause = button('暂停', 74, 44, () => this.showPause(), 0x8a6f5a, 20); pause.position.set(1194, 8);
    this.waveText = label('', 18, 0xffffff, { stroke: 0x1c2416 }); this.waveText.anchor.set(0.5, 0); this.waveText.position.set(1190, 64);
    this.banner = label('', 64, 0xff5a4a, { stroke: 0x2a0f0f }); this.banner.anchor.set(0.5); this.banner.position.set(W / 2, H / 2 - 20); this.banner.visible = false;
    this.hint = label('', 20, 0xfff3a8, { stroke: 0x1c2416 }); this.hint.anchor.set(0.5, 1); this.hint.visible = false;
    this.hud.addChild(this.speedBtn, pause, this.waveText, this.banner, this.hint);
  }
  private setSun(v: number) { this.sun = v; this.sunText.text = String(v); }
  private setSel(s: Sel) {
    this.sel = s; this.ghost.removeChildren(); this.ghost.visible = false;
    for (const c of this.cards) c.frame.clear();
    for (const k in this.toolViews) this.toolViews[k].tint = 0xffffff;
    if (s?.type === 'card') { s.card.frame.roundRect(-2, -2, 82, 96, 12).stroke({ width: 5, color: 0xffd23f }); const ic = plantIcon(s.card.def.art, this.sc); this.ghost.addChild(ic); }
    if (s?.type === 'shovel') this.toolViews.shovel.tint = 0xffd23f;
    if (s?.type === 'glove') this.toolViews.glove.tint = 0xffd23f;
    this.refreshHover();
  }
  private pickCard(card: Card) {
    if (this.paused || this.ended) return;
    if (this.sel?.type === 'card' && this.sel.card === card) { this.setSel(null); return; }
    if (card.cd > 0 || this.sun < card.def.cost) { sfx('deny'); return; }
    sfx('click'); this.setSel({ type: 'card', card });
  }

  // ---------- 放置 / 融合 ----------
  private check(id: string, r: number, c: number): { kind: 'plant' | 'fuse' | 'pad' | 'no'; result?: string } {
    const def = PLANTS[id], tile = this.grid[r][c], water = isWaterRow(this.level.scene, r);
    if (def.platform) return water && !tile.pad && !tile.plant ? { kind: 'pad' } : { kind: 'no' };
    if (tile.plant) { const res = fuseResult(id, tile.plant.def.id); return res ? { kind: 'fuse', result: res } : { kind: 'no' }; }
    if (water && !tile.pad) return { kind: 'no' };
    return { kind: 'plant' };
  }
  private addPlant(id: string, r: number, c: number): Plant {
    const p = new Plant(PLANTS[id], r, c);
    p.art.view.position.set(this.colX(c), this.rowY(r)); p.art.view.scale.set(this.sc);
    p.art.view.zIndex = r * 100 + (p.def.low ? 5 : 10);
    if (p.def.nocturnal && this.asleepScene) p.art.setAsleep(true);
    this.actors.addChild(p.art.view); this.plants.push(p); this.grid[r][c].plant = p;
    return p;
  }
  private removePlant(p: Plant) {
    if (p.dead) return; p.dead = true;
    const t = this.grid[p.row][p.col]; if (t.plant === p) t.plant = undefined;
    p.art.view.destroy({ children: true });
  }
  private fuseAt(resultId: string, r: number, c: number) {
    const old = this.grid[r][c].plant; if (old) this.removePlant(old);
    const p = this.addPlant(resultId, r, c);
    sfx('fuse');
    this.ring(this.colX(c), this.rowY(r) - 40, 90, 0xffd23f, 0.5);
    this.popText('融合！' + p.def.name, this.colX(c), this.rowY(r) - 100, 0xffd23f);
    if (!save.seen.includes(resultId)) { save.seen.push(resultId); writeSave(); }
    return p;
  }
  private onMove(e: FederatedPointerEvent) {
    const p = this.view.toLocal(e.global);
    this.hover = this.tileAt(p.x, p.y);
    for (const s of this.suns) if (!s.flying && Math.hypot(s.x - p.x, s.y - p.y) < 44) this.collect(s);
    this.refreshHover();
  }
  private refreshHover() {
    const g = this.hi.clear(); this.hint.visible = false; this.ghost.visible = false;
    if (!this.hover || !this.sel || this.paused || this.ended) return;
    const { r, c } = this.hover, x = GRID_X + c * CELL_W, y = GRID_Y + r * this.ch;
    let color = 0xff4a4a, text = '';
    if (this.sel.type === 'card') {
      const res = this.check(this.sel.card.def.id, r, c);
      if (res.kind === 'plant' || res.kind === 'pad') { color = 0xffffff; this.ghost.visible = true; this.ghost.position.set(this.colX(c), this.rowY(r)); }
      else if (res.kind === 'fuse') { color = 0xffd23f; text = '融合 → ' + PLANTS[res.result!].name; }
    } else if (this.sel.type === 'shovel') {
      if (this.grid[r][c].plant || this.grid[r][c].pad) color = 0xffffff;
    } else if (this.sel.type === 'glove') {
      const from = this.sel.from, t = this.grid[r][c];
      if (!from) { if (t.plant) color = 0xffffff; }
      else if (t.plant && t.plant !== from) { const res = fuseResult(from.def.id, t.plant.def.id); if (res) { color = 0xffd23f; text = '融合 → ' + PLANTS[res].name; } }
      else if (!t.plant && this.check(from.def.id, r, c).kind === 'plant') color = 0xffffff;
    }
    g.roundRect(x + 4, y + 4, CELL_W - 8, this.ch - 8, 12).fill({ color, alpha: 0.22 }).stroke({ width: 4, color, alpha: 0.9 });
    if (this.sel.type === 'glove' && this.sel.from) {
      const f = this.sel.from; g.roundRect(GRID_X + f.col * CELL_W + 4, GRID_Y + f.row * this.ch + 4, CELL_W - 8, this.ch - 8, 12).stroke({ width: 4, color: 0x7fd4ff });
    }
    if (text) { this.hint.text = text; this.hint.visible = true; this.hint.position.set(this.colX(c), Math.max(GRID_Y + 26, y + 6)); }
  }
  private onTap(e: FederatedPointerEvent) {
    if (this.paused || this.ended) return;
    const p = this.view.toLocal(e.global);
    for (const s of this.suns) if (!s.flying && Math.hypot(s.x - p.x, s.y - p.y) < 48) { this.collect(s); return; }
    const t = this.tileAt(p.x, p.y);
    if (!t || !this.sel) return;
    const { r, c } = t, tile = this.grid[r][c];
    if (this.sel.type === 'card') {
      const card = this.sel.card, res = this.check(card.def.id, r, c);
      if (res.kind === 'no' || this.sun < card.def.cost) { sfx('deny'); return; }
      this.setSun(this.sun - card.def.cost); card.cd = card.def.cooldown;
      if (res.kind === 'pad') {
        tile.pad = true; tile.padView = plantIcon(card.def.art, this.sc); tile.padView.position.set(this.colX(c), this.rowY(r) + 4); this.tileLayer.addChild(tile.padView); sfx('plant');
      } else if (res.kind === 'fuse') this.fuseAt(res.result!, r, c);
      else { this.addPlant(card.def.id, r, c); sfx('plant'); }
      this.setSel(null);
    } else if (this.sel.type === 'shovel') {
      if (tile.plant) { this.removePlant(tile.plant); sfx('plant'); }
      else if (tile.pad) { tile.pad = false; tile.padView?.destroy({ children: true }); tile.padView = undefined; sfx('plant'); }
      else { sfx('deny'); return; }
      this.setSel(null);
    } else if (this.sel.type === 'glove') {
      const from = this.sel.from;
      if (!from || from.dead) { if (tile.plant) { this.sel = { type: 'glove', from: tile.plant }; sfx('click'); this.refreshHover(); } else sfx('deny'); return; }
      if (tile.plant === from) { this.setSel({ type: 'glove' }); return; }
      if (tile.plant) {
        const res = fuseResult(from.def.id, tile.plant.def.id);
        if (!res) { sfx('deny'); return; }
        this.removePlant(from); this.fuseAt(res, r, c);
      } else {
        if (this.check(from.def.id, r, c).kind !== 'plant') { sfx('deny'); return; }
        this.grid[from.row][from.col].plant = undefined; from.row = r; from.col = c; tile.plant = from;
        from.art.view.position.set(this.colX(c), this.rowY(r)); from.art.view.zIndex = r * 100 + (from.def.low ? 5 : 10); sfx('plant');
      }
      this.setSel(null);
    }
  }

  // ---------- 阳光 ----------
  private spawnSun(x: number, y: number, ty: number, amount: number) {
    const v = new Container(); const g = new Graphics(); drawSun(g, amount >= 50 ? 26 : amount >= 25 ? 21 : 16); v.addChild(g);
    v.position.set(x, y); this.fxLayer.addChild(v);
    this.suns.push({ x, y, ty, amount, life: 9, view: v, flying: false });
  }
  private collect(s: Sun) { if (s.flying) return; s.flying = true; sfx('sun'); this.setSun(this.sun + s.amount); }

  // ---------- 特效 ----------
  private ring(x: number, y: number, radius: number, color: number, dur = 0.45) {
    const g = new Graphics(); g.circle(0, 0, radius).fill({ color, alpha: 0.45 }).stroke({ width: 8, color: 0xffffff, alpha: 0.8 });
    g.position.set(x, y); g.scale.set(0.1); this.fxLayer.addChild(g);
    this.fxs.push({ view: g, life: dur, max: dur, step: (k) => { g.scale.set(0.2 + 0.8 * easeOut(k)); g.alpha = 1 - k * k; } });
  }
  private laneFlash(row: number, color: number) {
    const g = new Graphics(); g.rect(GRID_X, GRID_Y + row * this.ch + 8, W - GRID_X, this.ch - 16).fill({ color, alpha: 0.6 });
    this.fxLayer.addChild(g); this.fxs.push({ view: g, life: 0.6, max: 0.6, step: (k) => { g.alpha = 1 - k; } });
  }
  private popText(text: string, x: number, y: number, color: number) {
    const t = label(text, 24, color, { stroke: 0x1c2416 }); t.anchor.set(0.5); t.position.set(x, y); this.fxLayer.addChild(t);
    this.fxs.push({ view: t, life: 1.2, max: 1.2, step: (k) => { t.y = y - 40 * k; t.alpha = 1 - k * k; } });
  }
  private spark(x: number, y: number, color: number) {
    const g = new Graphics(); g.star(0, 0, 6, 12, 5).fill(color); g.position.set(x, y); this.fxLayer.addChild(g);
    this.fxs.push({ view: g, life: 0.18, max: 0.18, step: (k) => { g.scale.set(0.6 + k); g.alpha = 1 - k; } });
  }

  // ---------- 伤害 ----------
  private hurt(z: Zombie, dmg: number, o: { straight?: boolean; slow?: number; fire?: boolean } = {}) {
    if (z.dead) return;
    if (o.straight && z.shield > 0) {
      z.shield -= dmg; this.spark(z.x - 34 * this.sc, this.rowY(z.row) - 58 * this.sc, 0xd9c2a0);
      if (z.shield <= 0) z.art.setShield(false);
      return;
    }
    if (z.armor > 0) { z.armor -= dmg; if (z.armor <= 0) { z.hp += z.armor; z.armor = 0; z.art.setArmor(false); } }
    else z.hp -= dmg;
    if (o.fire) z.slowT = 0; else if (o.slow) z.slowT = Math.max(z.slowT, o.slow);
    z.flashT = 0.09;
    if (z.hp <= 0) { z.dead = true; z.deathT = 0.5; this.kills++; }
  }
  private blast(x: number, row: number, radius: number, dmg: number, o: { freeze?: number; slow?: number; color?: number } = {}) {
    const y = this.rowY(row) - 40;
    this.ring(x, y, radius, o.color ?? 0xff7a2f);
    for (const z of this.zombies) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - x, (z.row - row) * this.ch);
      if (d <= radius + 20) { this.hurt(z, dmg, { slow: o.slow }); if (o.freeze && !z.dead) { z.freezeT = o.freeze; z.slowT = o.freeze + 6; } }
    }
  }

  // ---------- 出怪 ----------
  private spawnZombie(id: string, row: number, x: number): Zombie {
    const z = new Zombie(ZOMBIES[id], row, x);
    z.art.view.scale.set(this.sc); z.art.view.zIndex = row * 100 + 50;
    if (isWaterRow(this.level.scene, row)) z.art.setSwim(true);
    this.actors.addChild(z.art.view); this.zombies.push(z);
    return z;
  }
  private spawnWave(i: number) {
    const lv = this.level, last = i === lv.waves - 1, big = (i + 1) % 5 === 0 || last;
    // 开局几波从 1 起步，逐渐爬到关卡设定的强度
    const base = 1 + (lv.budget - 1) * Math.min(1, i / 6) + lv.growth * i * 0.6;
    let budget = base; if (big) budget *= 1.7;
    const pool = lv.pool.filter((id) => !ZOMBIES[id].boss);
    const spread = big ? 6 : 3; let n = 0;
    // 首领：尸王压轴（无尽每 20 波），影魇在关卡中段现身（无尽第 10、30、50…波）
    let boss: string | undefined;
    if (lv.pool.includes('king') && (last || (lv.id < 0 && (i + 1) % 20 === 0))) boss = 'king';
    else if (lv.pool.includes('wraith') && (lv.id < 0 ? (i + 1) % 20 === 10 : i === Math.floor(lv.waves / 2) - 1)) boss = 'wraith';
    if (boss) { this.pendingSpawns.push({ t: 1, id: boss, row: Math.floor(this.rows / 2) }); budget *= 0.6; }
    while (budget >= 1 && n < 45) {
      // 贵的僵尸不会太早出现：4 点以上至少第 4 波，7 点以上至少第 7 波
      const ok = pool.filter((id) => { const c = ZOMBIES[id].cost; return c <= Math.max(1, budget) && c <= Math.max(1, base * 0.7) && (c < 4 || i >= 3) && (c < 7 || i >= 6); });
      const id = ok[Math.floor(Math.random() * ok.length)] ?? 'walker';
      budget -= ZOMBIES[id].cost; n++;
      this.pendingSpawns.push({ t: Math.random() * spread, id, row: Math.floor(Math.random() * this.rows) });
    }
    if (n === 0) this.pendingSpawns.push({ t: 0, id: 'walker', row: Math.floor(Math.random() * this.rows) });
    if (big) { this.banner.text = last ? '最后一波！' : '一大波僵尸来袭！'; this.banner.visible = true; this.bannerT = 2.6; sfx('wave'); }
    else if (boss) { this.banner.text = `${ZOMBIES[boss].name}现身！`; this.banner.visible = true; this.bannerT = 2.6; sfx('wave'); }
  }
  private get aliveCount() { return this.zombies.reduce((n, z) => n + (z.dead ? 0 : 1), 0) + this.pendingSpawns.length; }

  // ---------- 主循环 ----------
  update(rawDt: number) {
    this.scene.update(performance.now() / 1000);
    if (this.paused || this.ended) return;
    const dt = Math.min(rawDt, 0.05) * this.speed;
    this.time += dt; const t = this.time;

    // 波次
    if (this.waveIdx < this.level.waves) {
      this.waveT -= dt;
      if (this.waveIdx > 0 && this.aliveCount === 0 && this.waveT > 4) this.waveT = 4;
      if (this.waveT <= 0) { this.spawnWave(this.waveIdx++); this.waveT = 30; }
    } else if (this.aliveCount === 0) { this.finish(true); return; }
    this.waveText.text = this.level.id < 0 ? `第 ${this.waveIdx} 波` : `波次 ${this.waveIdx}/${this.level.waves}`;
    for (let i = this.pendingSpawns.length - 1; i >= 0; i--) {
      const s = this.pendingSpawns[i]; s.t -= dt;
      if (s.t <= 0) { this.spawnZombie(s.id, s.row, W + 40 + Math.random() * 30); this.pendingSpawns.splice(i, 1); }
    }
    if (this.bannerT > 0) { this.bannerT -= dt; this.banner.scale.set(1 + 0.05 * Math.sin(t * 10)); if (this.bannerT <= 0) this.banner.visible = false; }
    if (this.tipT > 0) { this.tipT -= dt; if (this.tipT <= 0 && this.tipText) this.tipText.visible = false; }

    // 天降阳光
    if (this.level.scene !== 'night') {
      this.skyT -= dt;
      if (this.skyT <= 0) { this.skyT = 8.5; this.spawnSun(GRID_X + 40 + Math.random() * (COLS * CELL_W - 80), GRID_Y - 20, GRID_Y + 60 + Math.random() * (GRID_H - 140), 25); }
    }
    // 卡牌冷却
    for (const c of this.cards) {
      if (c.cd > 0) c.cd = Math.max(0, c.cd - dt);
      const k = c.def.cooldown ? c.cd / c.def.cooldown : 0, poor = this.sun < c.def.cost;
      c.mask.clear();
      if (poor) c.mask.roundRect(0, 0, 78, 92, 10).fill({ color: 0x000000, alpha: 0.35 });
      if (k > 0) c.mask.roundRect(0, 0, 78, 92 * k, 10).fill({ color: 0x000000, alpha: 0.55 });
      c.cost.style.fill = poor ? 0xc0392b : 0x3a2f22;
    }

    this.updatePlants(dt, t);
    this.updateZombies(dt, t);
    this.updateProjs(dt);
    this.updateMisc(dt, t);

    // 清理
    this.plants = this.plants.filter((p) => !p.dead);
    this.zombies = this.zombies.filter((z) => { if (z.dead && z.deathT <= 0) { z.art.view.destroy({ children: true }); return false; } return true; });
  }

  private firstTarget(row: number, fromX: number, range?: number): Zombie | undefined {
    let best: Zombie | undefined;
    const maxX = range ? fromX + range * CELL_W : W + 10;
    for (const z of this.zombies) if (!z.dead && z.row === row && z.x > fromX - 30 && z.x < maxX && (!best || z.x < best.x)) best = z;
    return best;
  }

  private updatePlants(dt: number, t: number) {
    for (const p of this.plants) {
      if (p.dead) continue;
      const d = p.def, x = this.colX(p.col), y = this.rowY(p.row);
      p.art.update(t, dt);
      if (p.flashT > 0) { p.flashT -= dt; p.art.view.tint = p.flashT > 0 ? 0xff9a9a : 0xffffff; }
      if (d.hp >= 2000 && d.hp < 9999) p.art.setDamage(p.hp / d.hp);
      if (p.hp <= 0) {
        if (d.deathBlast) { sfx('boom'); this.blast(x, p.row, d.deathBlast.radius, d.deathBlast.damage); }
        this.removePlant(p); continue;
      }
      if (d.nocturnal && this.asleepScene) continue;
      if (d.produce) { p.prodT -= dt; if (p.prodT <= 0) { p.prodT = d.produce.interval; this.spawnSun(x + (Math.random() * 30 - 15), y - 70 * this.sc, y - 20, d.produce.amount); } }
      if (d.shoot) {
        const s = d.shoot;
        p.shootT -= dt;
        if (p.shootT <= 0) {
          if (this.firstTarget(p.row, x, s.range)) { p.burst = s.count ?? 1; p.burstT = 0; p.shootT = s.interval; } else p.shootT = 0.2;
        }
        if (p.burst > 0) { p.burstT -= dt; if (p.burstT <= 0) { p.burst--; p.burstT = 0.11; this.fire(p); } }
      }
      if (d.bomb) {
        p.fuseT -= dt; p.art.setPulse(1 - Math.max(0, p.fuseT) / d.bomb.fuse);
        if (p.fuseT <= 0) {
          sfx(d.bomb.freeze ? 'freeze' : 'boom');
          if (d.bomb.lane) { this.laneFlash(p.row, 0xff7a2f); for (const z of this.zombies) if (z.row === p.row && !z.dead) this.hurt(z, d.bomb.damage, { fire: true }); }
          else this.blast(x, p.row, d.bomb.radius, d.bomb.damage, { freeze: d.bomb.freeze, color: d.bomb.freeze ? 0x7fd4ff : 0xff7a2f });
          this.removePlant(p); continue;
        }
      }
      if (d.mine) {
        if (!p.armed) { p.armT -= dt; if (p.armT <= 0) { p.armed = true; p.art.setArmed(true); } }
        else for (const z of this.zombies) if (!z.dead && z.row === p.row && Math.abs(z.x - x) < 50) {
          sfx('boom'); this.blast(x, p.row, d.mine.radius, d.mine.damage);
          if (--p.charges > 0) { p.armed = false; p.armT = 5; p.art.setArmed(false); } else this.removePlant(p);
          break;
        }
      }
      if (d.contact) for (const z of this.zombies) if (!z.dead && z.row === p.row && Math.abs(z.x - x) < 58 && z.jumpT <= 0) {
        const keep = z.flashT; this.hurt(z, d.contact.dps * dt, { slow: d.contact.slow ? 1.5 : 0 }); z.flashT = keep;
      }
    }
  }

  private fire(p: Plant) {
    const s = p.def.shoot!, x = this.colX(p.col) + p.art.muzzle.x * this.sc, y = this.rowY(p.row) + p.art.muzzle.y * this.sc;
    p.art.kick(); sfx('shoot');
    const g = new Graphics();
    const pr: Proj = { kind: s.kind, row: p.row, x, y, view: g, dmg: s.damage, slow: s.slow ?? 0, fire: !!s.fire, splash: s.splash ?? 0, pierce: !!s.pierce, color: s.color,
      hit: new Set(), maxX: s.range ? this.colX(p.col) + s.range * CELL_W : W + 40, ignited: 1, sx: x, sy: y, tx: x, ty: y, t: 0 };
    if (s.kind === 'lob') {
      const tg = this.firstTarget(p.row, this.colX(p.col), s.range); if (!tg) return;
      pr.target = tg; pr.tx = tg.x; pr.ty = this.rowY(p.row) - 50 * this.sc;
    }
    drawProj(pr); g.position.set(x, y); this.projLayer.addChild(g); this.projs.push(pr);
  }

  private updateProjs(dt: number) {
    for (const pr of this.projs) {
      if (pr.kind === 'straight') {
        const px = pr.x; pr.x += PROJ_SPEED * dt;
        // 穿过火环
        for (const pl of this.plants) if (!pl.dead && pl.def.igniter && pl.row === pr.row && pl.def.igniter > pr.ignited) {
          const ix = this.colX(pl.col); if (px < ix && pr.x >= ix) { pr.ignited = pl.def.igniter; pr.fire = true; pr.slow = 0; pr.color = pl.def.igniter >= 3 ? 0x6fd0ff : 0xff7a2f; drawProj(pr); }
        }
        for (const z of this.zombies) {
          if (z.dead || z.row !== pr.row || pr.hit.has(z) || z.jumpT > 0) continue;
          if (pr.x >= z.x - 26 * this.sc && pr.x <= z.x + 34 * this.sc) {
            const dmg = pr.dmg * pr.ignited; sfx('hit');
            if (pr.splash) { this.blastSmall(z.x, pr.row, pr.splash, dmg, pr); }
            else this.hurt(z, dmg, { straight: true, slow: pr.slow, fire: pr.fire });
            this.spark(pr.x, pr.y, pr.color);
            if (pr.pierce) pr.hit.add(z); else { pr.t = 2; break; }
          }
        }
        if (pr.x > pr.maxX) pr.t = 2;
        pr.view.position.set(pr.x, pr.y);
      } else {
        pr.t += dt / 0.95;
        if (pr.target && !pr.target.dead) pr.tx = pr.target.x;
        const k = Math.min(1, pr.t);
        pr.x = pr.sx + (pr.tx - pr.sx) * k; pr.y = pr.sy + (pr.ty - pr.sy) * k - Math.sin(Math.PI * k) * 170;
        pr.view.position.set(pr.x, pr.y); pr.view.rotation += dt * 8;
        if (pr.t >= 1) {
          sfx('hit');
          if (pr.splash) this.blastSmall(pr.tx, pr.row, pr.splash, pr.dmg, pr);
          else { let best: Zombie | undefined; for (const z of this.zombies) if (!z.dead && z.row === pr.row && Math.abs(z.x - pr.tx) < 60 && (!best || Math.abs(z.x - pr.tx) < Math.abs(best.x - pr.tx))) best = z; if (best) this.hurt(best, pr.dmg, { slow: pr.slow, fire: pr.fire }); }
          this.spark(pr.x, pr.y, pr.color); pr.t = 2;
        }
      }
    }
    this.projs = this.projs.filter((pr) => { if (pr.t >= 2) { pr.view.destroy(); return false; } return true; });
  }
  private blastSmall(x: number, row: number, radius: number, dmg: number, pr: Proj) {
    this.ring(x, this.rowY(row) - 40, radius, pr.color, 0.3);
    for (const z of this.zombies) if (!z.dead && Math.hypot(z.x - x, (z.row - row) * this.ch) <= radius + 10) this.hurt(z, dmg, { slow: pr.slow, fire: pr.fire });
  }

  private blocker(z: Zombie): Plant | undefined {
    const c = Math.floor((z.x - GRID_X) / CELL_W); if (c < 0 || c >= COLS) return;
    const p = this.grid[z.row][c].plant; if (!p || p.def.low || p.dead) return;
    const cx = this.colX(c); return z.x <= cx + 40 && z.x >= cx - 44 ? p : undefined;
  }

  /** 除当前行外植物最少的一行（并列时随机） */
  private weakestRow(current: number): number {
    let best: number[] = [], min = Infinity;
    for (let r = 0; r < this.rows; r++) {
      if (r === current) continue;
      const n = this.grid[r].reduce((k, tile) => k + (tile.plant && !tile.plant.dead ? 1 : 0), 0);
      if (n < min) { min = n; best = [r]; } else if (n === min) best.push(r);
    }
    return best.length ? best[Math.floor(Math.random() * best.length)] : current;
  }

  private updateZombies(dt: number, t: number) {
    for (const z of this.zombies) {
      const v = z.art.view; let baseY = this.rowY(z.row);
      if (z.dead) { z.deathT -= dt; v.alpha = Math.max(0, z.deathT / 0.5); v.rotation = (1 - z.deathT / 0.5) * 0.9; v.position.set(z.x, baseY); continue; }
      if (z.flashT > 0) z.flashT -= dt;
      const rage = z.def.enrage && z.hp < z.def.hp / 2 ? z.def.enrage : 1;
      v.tint = z.flashT > 0 ? 0xff8a8a : z.freezeT > 0 ? 0x8fc8ff : z.slowT > 0 ? 0xa8d8ff : rage > 1 ? 0xffb4d8 : 0xffffff;
      z.art.setFrozen(z.freezeT > 0);
      if (z.def.hp >= 3000) z.art.drawHp(z.hp / z.def.hp);
      if (z.freezeT > 0) { z.freezeT -= dt; v.position.set(z.x, baseY); continue; }
      const sf = z.slowT > 0 ? 0.5 : 1; if (z.slowT > 0) z.slowT -= dt;
      let moving = false, yOff = 0;
      z.eating = false;
      if (z.def.blink && z.x < GRID_X + COLS * CELL_W) {
        z.blinkT -= dt * rage;
        if (z.blinkT <= 0) {
          z.blinkT = z.def.blink;
          const row = this.weakestRow(z.row);
          if (row !== z.row) {
            this.ring(z.x, baseY - 50, 80, 0x7ff0e0, 0.45);
            z.row = row; baseY = this.rowY(row);
            z.art.setSwim(isWaterRow(this.level.scene, row)); v.zIndex = row * 100 + 50;
            this.ring(z.x, baseY - 50, 80, 0x7ff0e0, 0.45); sfx('freeze');
          }
        }
      }
      if (z.jumpT > 0) {
        z.jumpT -= dt; const k = 1 - Math.max(0, z.jumpT) / 0.55;
        z.x = z.jumpFrom - 140 * k; yOff = -Math.sin(Math.PI * k) * 70;
      } else {
        const b = this.blocker(z);
        if (b && z.def.leap && !z.jumped) { z.jumped = true; z.jumpT = 0.55; z.jumpFrom = z.x; }
        else if (b) {
          z.eating = true;
          if (z.def.smash) { z.atkT -= dt * sf; if (z.atkT <= 0) { z.atkT = 1.5; b.hp = 0; sfx('boom'); this.ring(this.colX(b.col), baseY - 20, 60, 0xd9c2a0, 0.3); } }
          else { b.hp -= z.def.dps * dt * sf; b.flashT = 0.06; z.biteT -= dt; if (z.biteT <= 0) { z.biteT = 0.45; sfx('bite'); } }
          if (b.def.thorns) { const keep = z.flashT; this.hurt(z, b.def.thorns * dt); z.flashT = keep; }
        } else { z.x -= (z.def.leap && z.jumped ? 21 : z.def.speed) * rage * sf * dt; moving = true; }
      }
      if (z.def.summon && z.x < GRID_X + COLS * CELL_W) {
        z.summonT -= dt;
        if (z.summonT <= 0) {
          z.summonT = z.def.summon.interval;
          for (let i = 0; i < z.def.summon.count; i++) {
            const row = Math.max(0, Math.min(this.rows - 1, z.row + (i % 2 ? 1 : -1) * (1 + Math.floor(i / 2)) * (z.def.summon.count > 1 ? 1 : 0)));
            const nz = this.spawnZombie(z.def.summon.id, row, Math.min(W, z.x + 30 + Math.random() * 40));
            this.ring(nz.x, this.rowY(row) - 30, 46, 0x9bf06b, 0.4);
          }
        }
      }
      // 防线
      const gd = this.guards[z.row];
      if (z.x < GRID_X - 16 && !gd.used) { gd.used = true; gd.active = true; }
      if (z.x < GRID_X - 110) { this.finish(false); return; }
      v.position.set(z.x, baseY + yOff);
      z.art.update(t, moving, z.eating, false);
    }
  }

  private updateMisc(dt: number, t: number) {
    for (const gd of this.guards) if (gd.active) {
      gd.x += 620 * dt; gd.view.x = gd.x; gd.view.rotation += dt * 12;
      const row = this.guards.indexOf(gd);
      for (const z of this.zombies) if (!z.dead && z.row === row && Math.abs(z.x - gd.x) < 46) this.hurt(z, z.def.boss ? 60 : 99999);
      if (gd.x > W + 60) { gd.active = false; gd.view.visible = false; }
    }
    for (const s of this.suns) {
      if (s.flying) { s.x += (73 - s.x) * Math.min(1, dt * 9); s.y += (40 - s.y) * Math.min(1, dt * 9); s.view.alpha -= dt * 2.2; if (s.view.alpha <= 0.05) s.life = -1; }
      else { if (s.y < s.ty) s.y = Math.min(s.ty, s.y + 70 * dt); s.life -= dt; if (s.life <= 0) this.collect(s); }
      s.view.position.set(s.x, s.y); s.view.rotation = Math.sin(t * 2 + s.ty) * 0.15; s.view.scale.set(1 + 0.05 * Math.sin(t * 5 + s.ty));
    }
    this.suns = this.suns.filter((s) => { if (s.flying && s.life < 0) { s.view.destroy({ children: true }); return false; } return true; });
    for (const f of this.fxs) { f.life -= dt; f.step(1 - Math.max(0, f.life) / f.max, dt); }
    this.fxs = this.fxs.filter((f) => { if (f.life <= 0) { f.view.destroy({ children: true }); return false; } return true; });
  }

  // ---------- 结束 / 暂停 ----------
  private dialog(title: string, body: string, btns: [string, () => void, number?][]) {
    this.overlay.removeChildren();
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.55 }); dim.eventMode = 'static';
    const w = 560, h = 300 + (body.length > 40 ? 40 : 0);
    const box = panel(w, h, 0x2f3a2a, 0.98, 20, 0xffd23f); box.position.set((W - w) / 2, (H - h) / 2);
    const tt = label(title, 44, 0xffd23f, { stroke: 0x1c2416 }); tt.anchor.set(0.5, 0); tt.position.set(w / 2, 26);
    const bt = label(body, 22, 0xffffff, { wrap: w - 60, align: 'center', bold: false }); bt.anchor.set(0.5, 0); bt.position.set(w / 2, 100);
    box.addChild(tt, bt);
    const bw = 150, gap = 20, total = btns.length * bw + (btns.length - 1) * gap;
    btns.forEach(([text, fn, color], i) => { const b = button(text, bw, 56, fn, color ?? 0x4f9a4a, 22); b.position.set((w - total) / 2 + i * (bw + gap), h - 86); box.addChild(b); });
    this.overlay.addChild(dim, box);
  }
  private showPause() {
    if (this.ended) return; this.paused = true; this.setSel(null);
    this.dialog('已暂停', `${this.level.id < 0 ? '无尽模式' : '第 ' + this.level.id + ' 关 · ' + this.level.name}`, [
      ['继续', () => { this.paused = false; this.overlay.removeChildren(); }],
      ['重新开始', () => this.onExit('retry', this.waveIdx), 0x4f7fb6],
      ['退出', () => this.onExit('quit', this.waveIdx), 0x8a4a4a],
    ]);
  }
  private finish(win: boolean) {
    if (this.ended) return; this.ended = true; this.setSel(null); sfx(win ? 'win' : 'lose');
    const lv = this.level;
    if (win) {
      const un = lv.unlock && !save.unlocked.includes(lv.unlock) ? PLANTS[lv.unlock] : undefined;
      this.onExit('win', this.waveIdx); // 先写存档
      this.dialog('通关！', un ? `解锁新植物：${un.name}\n${un.desc}` : `击败了 ${this.kills} 只僵尸。`, [
        ['下一关', () => this.onExit('next', this.waveIdx)], ['返回', () => this.onExit('quit', this.waveIdx), 0x8a6f5a]]);
    } else {
      if (lv.id < 0) this.onExit('lose', this.waveIdx);
      this.dialog('僵尸闯进来了', lv.id < 0 ? `坚持到了第 ${this.waveIdx} 波，击败 ${this.kills} 只僵尸。` : '换一套阵型再试一次。', [
        ['重试', () => this.onExit('retry', this.waveIdx), 0x4f7fb6], ['返回', () => this.onExit('quit', this.waveIdx), 0x8a6f5a]]);
    }
  }
  destroy() { this.view.destroy({ children: true }); }
}

const easeOut = (k: number) => 1 - (1 - k) * (1 - k);

export function drawSun(g: Graphics, r: number) {
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.poly([Math.cos(a - 0.2) * r, Math.sin(a - 0.2) * r, Math.cos(a) * (r + 9), Math.sin(a) * (r + 9), Math.cos(a + 0.2) * r, Math.sin(a + 0.2) * r]).fill(0xffb62e); }
  g.circle(0, 0, r).fill(0xffd23f).stroke({ width: 2.5, color: 0xe89a1a });
  g.circle(-r * 0.3, -r * 0.3, r * 0.3).fill({ color: 0xffffff, alpha: 0.55 });
}

function drawProj(p: Proj) {
  const g = p.view.clear();
  if (p.kind === 'lob') {
    if (p.fire) { g.circle(0, 0, 13).fill(0xff7a2f); g.circle(0, 0, 7).fill(0xffd23f); }
    else if (p.slow) g.poly([0, -14, 11, 0, 0, 14, -11, 0]).fill(p.color).stroke({ width: 2, color: 0x4f8ab6 });
    else { g.circle(0, 0, 12).fill(p.color).stroke({ width: 2, color: 0x3a3530 }); g.circle(-4, -4, 3.5).fill({ color: 0xffffff, alpha: 0.35 }); }
    return;
  }
  if (p.fire) { g.ellipse(-8, 0, 16, 8).fill({ color: p.color, alpha: 0.55 }); g.circle(0, 0, 10).fill(p.color); g.circle(2, 0, 5).fill(0xfff3a8); }
  else if (p.pierce) { g.ellipse(0, 0, 18, 9).fill({ color: p.color, alpha: 0.85 }); g.ellipse(4, 0, 8, 4).fill(0xffffff); }
  else { g.circle(0, 0, 9).fill(p.color).stroke({ width: 2, color: 0x26301f, alpha: 0.5 }); g.circle(-3, -3, 3).fill({ color: 0xffffff, alpha: 0.6 }); }
}

import { Container, Graphics, Text } from 'pixi.js';
import type { ArtSpec } from '../types';
import { crystal, flame, fuseSpark, leaf, makeEyes, shade, sunRays, type Eyes } from './util';

/**
 * 植物外观。全部用 Graphics 现画，原点在格子底边中心，向上为负 y。
 * 想换成贴图：保留 PlantView 接口，把 build() 里的绘制换成 Sprite 即可。
 */
export class PlantView {
  view = new Container();
  body = new Container();     // 整体（呼吸动画）
  head = new Container();     // 开火时后坐的部分
  glow?: Graphics;            // 火焰/光晕等闪烁部件
  blink?: Graphics;           // 地雷指示灯
  cracks = new Graphics();
  eyes?: Eyes;
  zzz?: Text;
  muzzle = { x: 36, y: -70 };
  private kickT = 0;
  private phase = Math.random() * 6;
  private pulse = 0;

  constructor(public art: ArtSpec) {
    this.view.addChild(this.body);
    this.build();
    this.body.addChild(this.cracks);
  }

  kick() { this.kickT = 1; }
  setPulse(v: number) { this.pulse = v; }
  setAsleep(a: boolean) {
    if (this.eyes) { this.eyes.open.visible = !a; this.eyes.closed.visible = a; }
    if (a && !this.zzz) {
      this.zzz = new Text({ text: 'z', style: { fontSize: 22, fill: 0xffffff, fontWeight: '700', stroke: { color: 0x223344, width: 3 } } });
      this.zzz.position.set(22, -100); this.view.addChild(this.zzz);
    }
    if (this.zzz) this.zzz.visible = a;
    this.body.alpha = a ? 0.8 : 1;
  }
  setArmed(a: boolean) {
    if (this.art.shape !== 'tuber') return;
    this.body.scale.set(a ? 1 : 0.62); this.body.y = a ? 0 : 4;
    if (this.blink) this.blink.visible = a;
  }
  /** 0~1 的血量比例，画裂纹 */
  setDamage(frac: number) {
    const lvl = frac > 0.66 ? 0 : frac > 0.33 ? 1 : 2;
    if ((this.cracks as any)._lvl === lvl) return;
    (this.cracks as any)._lvl = lvl;
    const c = this.cracks.clear();
    if (lvl >= 1) c.moveTo(-14, -70).lineTo(-6, -56).lineTo(-16, -44).lineTo(-8, -30).stroke({ width: 2.5, color: 0x2a2a22, alpha: 0.75 });
    if (lvl >= 2) c.moveTo(16, -66).lineTo(8, -50).lineTo(18, -38).lineTo(10, -22).moveTo(-2, -20).lineTo(6, -8).stroke({ width: 2.5, color: 0x2a2a22, alpha: 0.75 });
  }
  update(t: number, dt: number) {
    const b = Math.sin(t * 2.6 + this.phase);
    this.body.scale.y = (this.art.shape === 'tuber' ? this.body.scale.x : 1) * (1 + b * 0.025 + this.pulse * 0.25 * Math.abs(Math.sin(t * 22)));
    if (this.pulse) this.body.scale.x = 1 + this.pulse * 0.2 * Math.abs(Math.sin(t * 22));
    this.body.skew.x = b * 0.02;
    if (this.kickT > 0) { this.kickT = Math.max(0, this.kickT - dt * 6); }
    this.head.x = -8 * this.kickT; this.head.scale.x = 1 - 0.12 * this.kickT;
    if (this.glow) { this.glow.alpha = 0.75 + 0.25 * Math.sin(t * 13 + this.phase); this.glow.scale.y = 1 + 0.08 * Math.sin(t * 17 + this.phase); }
    if (this.blink) this.blink.alpha = Math.sin(t * 9) > 0 ? 1 : 0.25;
    if (this.zzz?.visible) { this.zzz.y = -100 - ((t * 14 + this.phase * 9) % 22); this.zzz.alpha = 1 - (((t * 14 + this.phase * 9) % 22) / 22); }
  }

  private has(d: string) { return !!this.art.deco?.includes(d as any); }

  private build() {
    const { shape, body, accent } = this.art;
    const dark = shade(body, 0.62);
    const g = new Graphics();
    this.body.addChild(g);
    const big = this.has('big') ? 1.18 : 1;
    const GREEN = 0x4f9a4a;

    // 地面阴影
    if (shape !== 'pad') g.ellipse(0, -2, 34 * big, 8).fill({ color: 0x000000, alpha: 0.22 });

    switch (shape) {
      case 'shooter': {
        if (this.has('sun')) sunRays(g, 2, -30, 26, 40, 12);
        leaf(g, -22, -8, 20, 8, -0.35, GREEN); leaf(g, 22, -8, 20, 8, 0.35, GREEN);
        g.ellipse(0, -28, 25, 27).fill(body).stroke({ width: 2.5, color: dark });
        g.ellipse(-8, -38, 8, 10).fill({ color: 0xffffff, alpha: 0.22 });
        if (this.has('armor')) {
          g.roundRect(-27, -30, 54, 28, 8).fill(0x9aa58a).stroke({ width: 2.5, color: 0x55604e });
          for (const x of [-18, 0, 18]) g.circle(x, -16, 3).fill(0x6f7a62);
        }
        if (this.has('ice')) { crystal(g, -18, -18, 0.8); crystal(g, 18, -14, 0.7); }
        if (this.has('fuse')) { g.rect(-25, -22, 50, 6).fill({ color: 0x2a2228, alpha: 0.7 }); }
        this.eyes = makeEyes(this.body, 0, -34, 6.5, 15);
        this.body.addChild(this.head);
        const h = new Graphics(); this.head.addChild(h);
        h.moveTo(-4, -50).quadraticCurveTo(-10, -70, 6, -76).stroke({ width: 9, color: dark, cap: 'round' });
        const horn = (cx: number, cy: number, s: number) => {
          h.poly([cx - 8 * s, cy - 7 * s, cx + 28 * s, cy - 17 * s, cx + 28 * s, cy + 17 * s, cx - 8 * s, cy + 7 * s]).fill(accent).stroke({ width: 2, color: shade(accent, 0.6) });
          h.ellipse(cx + 28 * s, cy, 6 * s, 17 * s).fill(shade(accent, 0.75)).stroke({ width: 2, color: shade(accent, 0.5) });
          h.ellipse(cx + 28 * s, cy, 3 * s, 11 * s).fill(0x1c2416);
        };
        if (this.has('quad')) { horn(2, -92, 0.6); horn(2, -68, 0.6); horn(14, -80, 0.6); horn(-8, -80, 0.6); }
        else if (this.has('double')) { horn(4, -90, 0.78); horn(8, -64, 0.78); }
        else horn(6, -76, 1);
        if (this.has('fuse')) fuseSpark(h, 4, -90);
        if (this.has('flame')) { this.glow = new Graphics(); flame(this.glow, 0, 0, 0.9, accent === 0x6fd0ff ? 0x6fd0ff : 0xff7a2f); this.glow.position.set(0, -98); this.head.addChild(this.glow); }
        this.muzzle = { x: 40, y: -76 };
        break;
      }
      case 'bud': {
        g.moveTo(0, -4).quadraticCurveTo(-4, -22, 0, -38).stroke({ width: 7, color: GREEN, cap: 'round' });
        leaf(g, -20, -14, 20, 8, -0.5, GREEN); leaf(g, 20, -14, 20, 8, 0.5, GREEN);
        const bulb = (x: number, y: number, r: number) => {
          g.circle(x, y, r + 9).fill({ color: accent, alpha: 0.28 });
          if (this.has('sun')) sunRays(g, x, y, r, r + 13, 12, accent);
          g.circle(x, y, r).fill(body).stroke({ width: 2.5, color: shade(body, 0.7) });
          g.circle(x - r * 0.35, y - r * 0.35, r * 0.3).fill({ color: 0xffffff, alpha: 0.5 });
          g.moveTo(x, y - r).quadraticCurveTo(x + 6, y - r - 10, x + 2, y - r - 14).stroke({ width: 3, color: GREEN, cap: 'round' });
        };
        if (this.has('double')) { bulb(-17, -54 * big, 19 * big); bulb(17, -62 * big, 19 * big); this.eyes = makeEyes(this.body, -23, -54 * big, 4.5, 34, 1); }
        else { bulb(0, -60, 25); this.eyes = makeEyes(this.body, -8, -60, 6, 16); }
        this.muzzle = { x: 0, y: -60 };
        break;
      }
      case 'wall': {
        const s = big;
        if (this.has('sun')) { g.circle(0, -44 * s, 52 * s).fill({ color: 0xffd23f, alpha: 0.2 }); sunRays(g, 0, -86 * s, 6, 18, 7); }
        if (this.has('thorn')) for (let i = 0; i < 11; i++) {
          const a = Math.PI + (i / 10) * Math.PI, x = Math.cos(a) * 38 * s, y = -44 * s + Math.sin(a) * 42 * s;
          g.poly([x * 0.9, y * 0.9 - 4.4 * s, x * 1.32, y * 1.32 + 14 * s, x * 0.9 + 8, y * 0.9 + 2 - 4.4 * s]).fill(0xd9e8c8).stroke({ width: 1.2, color: 0x4f6a3a });
        }
        g.ellipse(0, -43 * s, 39 * s, 43 * s).fill(body).stroke({ width: 3, color: dark });
        for (const k of [-0.55, 0, 0.55]) g.ellipse(k * 30 * s, -43 * s, 9 * s, 41 * s).stroke({ width: 2.5, color: accent, alpha: 0.8 });
        g.ellipse(-14 * s, -66 * s, 10 * s, 7 * s).fill({ color: 0xffffff, alpha: 0.2 });
        if (this.has('big')) { g.circle(-22, -22, 5).fill(0x6a8a4a); g.circle(24, -30, 4).fill(0x6a8a4a); g.circle(14, -84, 5).fill(0x6a8a4a); }
        if (this.has('fuse')) { g.rect(-38 * s, -40, 76 * s, 7).fill({ color: 0x2a2228, alpha: 0.75 }); fuseSpark(g, 0, -86); }
        this.eyes = makeEyes(this.body, -10 * s, -50 * s, 6.5, 20 * s, -1);
        g.moveTo(-18 * s, -62 * s).lineTo(-4 * s, -58 * s).moveTo(18 * s, -62 * s).lineTo(4 * s, -58 * s).stroke({ width: 3, color: 0x26301f, cap: 'round' });
        g.moveTo(-8, -32 * s).lineTo(8, -32 * s).stroke({ width: 3, color: 0x26301f, cap: 'round' });
        break;
      }
      case 'berry': {
        const s = big;
        leaf(g, -18 * s, -70 * s, 14, 6, -0.8, GREEN); leaf(g, 16 * s, -72 * s, 14, 6, 0.8, GREEN);
        const ball = (x: number, y: number, r: number) => {
          g.circle(x, y, r).fill(body).stroke({ width: 2.5, color: dark });
          g.circle(x - r * 0.35, y - r * 0.4, r * 0.28).fill({ color: accent, alpha: 0.8 });
        };
        ball(-17 * s, -22 * s, 20 * s); ball(17 * s, -22 * s, 20 * s); ball(0, -50 * s, 23 * s);
        this.eyes = makeEyes(this.body, -9 * s, -52 * s, 6, 18 * s, 0);
        g.moveTo(-17 * s, -62 * s).lineTo(-3 * s, -57 * s).moveTo(17 * s, -62 * s).lineTo(3 * s, -57 * s).stroke({ width: 3, color: 0x26301f, cap: 'round' });
        if (this.has('ice')) { crystal(g, -26 * s, -40 * s, 0.9); crystal(g, 26 * s, -42 * s, 0.9); }
        fuseSpark(g, 0, -72 * s);
        if (this.has('flame')) { this.glow = new Graphics(); flame(this.glow, -24, 0, 0.8); flame(this.glow, 24, 0, 0.8); this.glow.position.set(0, -52 * s); this.body.addChildAt(this.glow, 1); }
        break;
      }
      case 'bell': {
        leaf(g, -24, -8, 18, 7, -0.3, GREEN); leaf(g, 6, -8, 18, 7, 0.4, GREEN);
        g.moveTo(-12, -2).quadraticCurveTo(-22, -84, 14, -90).stroke({ width: 8, color: GREEN, cap: 'round' });
        this.body.addChild(this.head);
        const h = new Graphics(); this.head.addChild(h);
        const bell = (x: number, y: number, s: number) => {
          h.moveTo(x - 20 * s, y).bezierCurveTo(x - 20 * s, y - 24 * s, x + 10 * s, y - 20 * s, x + 26 * s, y - 24 * s)
            .lineTo(x + 26 * s, y + 24 * s).bezierCurveTo(x + 10 * s, y + 20 * s, x - 20 * s, y + 24 * s, x - 20 * s, y).fill(body).stroke({ width: 2.5, color: dark });
          h.ellipse(x + 26 * s, y, 6 * s, 24 * s).fill(accent).stroke({ width: 2, color: dark });
          h.ellipse(x + 26 * s, y, 3 * s, 15 * s).fill(shade(body, 0.4));
          h.ellipse(x - 6 * s, y - 10 * s, 8 * s, 5 * s).fill({ color: 0xffffff, alpha: 0.35 });
        };
        if (this.has('double')) { bell(10, -78, 0.9); bell(4, -40, 0.7); } else bell(10, -70, 1);
        this.eyes = makeEyes(this.head, -2, this.has('double') ? -78 : -70, 5.5, 14);
        if (this.has('ice')) { crystal(h, -16, -96, 0.9); crystal(h, 2, -104, 0.7); }
        if (this.has('flame')) { this.glow = new Graphics(); flame(this.glow, 0, 0, 0.8); this.glow.position.set(-4, -98); this.head.addChild(this.glow); }
        this.muzzle = { x: 44, y: this.has('double') ? -78 : -70 };
        break;
      }
      case 'spike': {
        g.ellipse(0, -6, 45, 10).fill(body).stroke({ width: 2, color: dark });
        const n = this.has('big') ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const x = -36 + (72 / (n - 1)) * i, hgt = (i % 2 ? 26 : 34) * big;
          g.poly([x - 8, -8, x, -8 - hgt, x + 8, -8]).fill(accent).stroke({ width: 1.5, color: dark });
          g.poly([x - 8, -8, x, -8 - hgt, x - 2, -8]).fill({ color: 0xffffff, alpha: 0.25 });
        }
        this.eyes = makeEyes(this.body, -7, -9, 4, 14, 0);
        if (this.has('flame')) { this.glow = new Graphics(); for (const x of [-30, -6, 20]) flame(this.glow, x, 0, 0.55); this.glow.position.set(0, -34); this.body.addChild(this.glow); }
        if (this.has('ice')) { crystal(g, -40, -16, 0.6); crystal(g, 40, -16, 0.6); }
        break;
      }
      case 'gourd': {
        leaf(g, -24, -8, 18, 7, -0.3, GREEN);
        g.circle(0, -30, 30).fill(body).stroke({ width: 2.5, color: dark });
        g.circle(0, -68, 20).fill(body).stroke({ width: 2.5, color: dark });
        g.rect(-15, -54, 30, 8).fill(body);
        g.roundRect(-17, -54, 34, 7, 3).fill(shade(body, 0.55));
        g.ellipse(-10, -40, 8, 12).fill({ color: 0xffffff, alpha: 0.2 });
        g.moveTo(0, -88).quadraticCurveTo(-10, -100, -2, -106).stroke({ width: 4, color: GREEN, cap: 'round' });
        this.eyes = makeEyes(this.body, -7, -70, 5.5, 14);
        this.body.addChild(this.head);
        const h = new Graphics(); this.head.addChild(h);
        const sling = (x: number, y: number) => {
          h.moveTo(20, -44).quadraticCurveTo(x + 14, y + 30, x, y + 8).stroke({ width: 5, color: GREEN, cap: 'round' });
          h.ellipse(x, y + 8, 13, 5).fill(GREEN).stroke({ width: 1.5, color: shade(GREEN, 0.6) });
          if (this.has('ice')) crystal(h, x, y - 4, 1.1);
          else if (this.has('flame')) flame(h, x, y, 0.75);
          else { h.circle(x, y - 3, 10).fill(accent).stroke({ width: 2, color: shade(accent, 0.6) }); h.circle(x - 3, y - 6, 3).fill({ color: 0xffffff, alpha: 0.3 }); if (this.has('fuse')) fuseSpark(h, x, y - 12); }
        };
        sling(34, -86); if (this.has('double')) sling(40, -58);
        this.muzzle = { x: 34, y: -92 };
        break;
      }
      case 'hoop': {
        const s = big;
        g.ellipse(0, -6, 26 * s, 9).fill(body).stroke({ width: 2, color: dark });
        this.glow = new Graphics();
        const fc = accent === 0x6fd0ff ? 0x6fd0ff : 0xff7a2f, fc2 = accent === 0x6fd0ff ? 0xe8fbff : 0xffd23f;
        for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; flame(this.glow, Math.cos(a) * 19 * s, Math.sin(a) * 44 * s - 4, 0.62 * s, fc, fc2); }
        this.glow.position.set(0, -56 * s); this.body.addChild(this.glow);
        const ring = new Graphics();
        ring.ellipse(0, -56 * s, 17 * s, 44 * s).stroke({ width: 9, color: body });
        ring.ellipse(0, -56 * s, 17 * s, 44 * s).stroke({ width: 3, color: shade(body, 1.4), alpha: 0.6 });
        this.body.addChild(ring);
        const base = new Graphics(); base.ellipse(0, -10, 20 * s, 12).fill(shade(body, 1.15)).stroke({ width: 2, color: dark }); this.body.addChild(base);
        this.eyes = makeEyes(this.body, -7, -11, 4.5, 14);
        break;
      }
      case 'cap': {
        const capAt = (x: number, s: number) => {
          g.roundRect(x - 12 * s, -36 * s, 24 * s, 36 * s, 9 * s).fill(0xf2ead8).stroke({ width: 2.5, color: 0xa89f88 });
          if (this.has('sun')) sunRays(g, x, -44 * s, 30 * s, 46 * s, 11);
          g.moveTo(x - 37 * s, -34 * s).bezierCurveTo(x - 37 * s, -84 * s, x + 37 * s, -84 * s, x + 37 * s, -34 * s)
            .quadraticCurveTo(x, -24 * s, x - 37 * s, -34 * s).fill(body).stroke({ width: 2.5, color: dark });
          if (this.has('moon')) {
            g.circle(x, -54 * s, 11 * s).fill(accent); g.circle(x + 5 * s, -57 * s, 9 * s).fill(body);
          } else {
            g.circle(x - 16 * s, -48 * s, 6 * s).fill(accent); g.circle(x + 8 * s, -60 * s, 7 * s).fill(accent); g.circle(x + 22 * s, -42 * s, 4 * s).fill(accent);
          }
        };
        if (this.has('double')) { capAt(22, 0.6); capAt(-8, 1); this.eyes = makeEyes(this.body, -15, -18, 5, 14); }
        else { capAt(0, 1); this.eyes = makeEyes(this.body, -7, -18, 5, 14); }
        this.muzzle = { x: 30, y: -28 };
        break;
      }
      case 'tuber': {
        // 半埋在土里的刺球：准备好之前缩在土里，准备好后顶部的芯会闪
        g.ellipse(0, -5, 38, 11).fill(0x6a4a2e).stroke({ width: 2, color: 0x4a321e });
        const n = this.has('double') ? 13 : 9;
        for (let i = 0; i < n; i++) {
          const a = Math.PI + (i / (n - 1)) * Math.PI, rx = 30 * big, ry = 24 * big;
          const x = Math.cos(a) * rx, y = -20 + Math.sin(a) * ry;
          g.poly([x * 0.8 - 5, y * 0.8 - 4, x * 1.38, (y + 20) * 1.38 - 20, x * 0.8 + 5, y * 0.8 - 4]).fill(shade(body, 1.25)).stroke({ width: 1.5, color: dark });
        }
        g.ellipse(0, -20, 30 * big, 22 * big).fill(body).stroke({ width: 2.5, color: dark });
        g.ellipse(-10, -28, 8, 5).fill({ color: 0xffffff, alpha: 0.22 });
        this.eyes = makeEyes(this.body, -8, -20, 5, 16, 0);
        this.blink = new Graphics();
        this.blink.star(0, -40 * big, 5, 9, 4).fill(accent).stroke({ width: 1.5, color: 0x3a2f2a });
        if (this.has('double')) { this.blink.star(-17, -34, 5, 6, 3).fill(accent); this.blink.star(17, -34, 5, 6, 3).fill(accent); }
        this.body.addChild(this.blink);
        break;
      }
      case 'pad': {
        g.ellipse(0, -12, 46, 17).fill(body).stroke({ width: 2.5, color: shade(body, 0.6) });
        g.poly([0, -12, 46, -20, 46, -6]).fill(0x2f7fb6);
        for (const a of [-2.6, -2.0, -1.2, 2.2, 1.4]) g.moveTo(0, -12).lineTo(Math.cos(a) * 38, -12 + Math.sin(a) * 13).stroke({ width: 1.5, color: accent, alpha: 0.8 });
        g.ellipse(-16, -17, 12, 4).fill({ color: 0xffffff, alpha: 0.18 });
        break;
      }
    }
  }
}

/** 卡牌/图鉴里用的缩略图 */
export function plantIcon(art: ArtSpec, scale = 0.5): Container {
  const v = new PlantView(art);
  v.view.scale.set(scale);
  return v.view;
}

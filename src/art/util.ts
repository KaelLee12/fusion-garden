import { Container, Graphics } from 'pixi.js';

/** 颜色明暗调整：f<1 变暗，f>1 变亮 */
export function shade(c: number, f: number): number {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * f));
  const b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
}

export interface Eyes { open: Graphics; closed: Graphics }
/** 一对眼睛：open 为睁眼，closed 为睡觉时的闭眼 */
export function makeEyes(parent: Container, x: number, y: number, r = 6, gap = 15, look = 1.5): Eyes {
  const open = new Graphics();
  for (const dx of [0, gap]) {
    open.circle(x + dx, y, r).fill(0xffffff).stroke({ width: 1.5, color: 0x26301f });
    open.circle(x + dx + look, y + 0.5, r * 0.5).fill(0x1c2416);
    open.circle(x + dx + look + 1, y - 1.2, r * 0.18).fill(0xffffff);
  }
  const closed = new Graphics();
  for (const dx of [0, gap]) closed.moveTo(x + dx - r, y).quadraticCurveTo(x + dx, y + r * 0.8, x + dx + r, y).stroke({ width: 2.2, color: 0x26301f, cap: 'round' });
  closed.visible = false;
  parent.addChild(open, closed);
  return { open, closed };
}

export function flame(g: Graphics, x: number, y: number, s: number, c1 = 0xff7a2f, c2 = 0xffd23f) {
  g.moveTo(x, y - 22 * s).bezierCurveTo(x + 12 * s, y - 8 * s, x + 10 * s, y + 4 * s, x, y + 6 * s)
    .bezierCurveTo(x - 10 * s, y + 4 * s, x - 12 * s, y - 8 * s, x, y - 22 * s).fill(c1);
  g.moveTo(x, y - 11 * s).bezierCurveTo(x + 6 * s, y - 3 * s, x + 5 * s, y + 3 * s, x, y + 4 * s)
    .bezierCurveTo(x - 5 * s, y + 3 * s, x - 6 * s, y - 3 * s, x, y - 11 * s).fill(c2);
}

export function crystal(g: Graphics, x: number, y: number, s: number, c = 0xbfeaff) {
  g.poly([x, y - 10 * s, x + 6 * s, y, x, y + 10 * s, x - 6 * s, y]).fill(c).stroke({ width: 1, color: 0x4f8ab6 });
  g.poly([x, y - 10 * s, x + 2 * s, y, x, y + 10 * s]).fill({ color: 0xffffff, alpha: 0.55 });
}

export function leaf(g: Graphics, x: number, y: number, rx: number, ry: number, rot: number, c: number) {
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const p = (px: number, py: number): [number, number] => [x + px * cos - py * sin, y + px * sin + py * cos];
  const a = p(-rx, 0), b = p(0, -ry), cpt = p(rx, 0), d = p(0, ry);
  g.moveTo(a[0], a[1]).quadraticCurveTo(b[0], b[1], cpt[0], cpt[1]).quadraticCurveTo(d[0], d[1], a[0], a[1]).fill(c).stroke({ width: 1.5, color: shade(c, 0.6) });
}

export function fuseSpark(g: Graphics, x: number, y: number) {
  g.moveTo(x, y).quadraticCurveTo(x + 6, y - 10, x + 2, y - 18).stroke({ width: 2.5, color: 0x3a2f2a, cap: 'round' });
  g.star(x + 2, y - 20, 6, 6, 2.5).fill(0xffd23f);
}

export function sunRays(g: Graphics, x: number, y: number, r1: number, r2: number, n = 10, c = 0xffd23f) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, w = Math.PI / n * 0.7;
    g.poly([x + Math.cos(a - w) * r1, y + Math.sin(a - w) * r1, x + Math.cos(a) * r2, y + Math.sin(a) * r2, x + Math.cos(a + w) * r1, y + Math.sin(a + w) * r1]).fill(c);
  }
}

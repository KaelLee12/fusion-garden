import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { sfx } from '../audio';

export const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif';

export function label(text: string, size: number, color = 0xffffff, opt: { bold?: boolean; stroke?: number; wrap?: number; align?: 'left' | 'center' | 'right' } = {}): Text {
  return new Text({
    text,
    style: {
      fontFamily: FONT, fontSize: size, fill: color, fontWeight: opt.bold === false ? '400' : '700',
      stroke: opt.stroke !== undefined ? { color: opt.stroke, width: Math.max(3, size / 6), join: 'round' } : undefined,
      wordWrap: !!opt.wrap, wordWrapWidth: opt.wrap, breakWords: true, align: opt.align ?? 'left', lineHeight: Math.round(size * 1.35),
    },
  });
}

export function panel(w: number, h: number, color = 0x2a2f3a, alpha = 0.95, radius = 16, border = 0xffffff): Container {
  const c = new Container();
  c.addChild(new Graphics().roundRect(0, 0, w, h, radius).fill({ color, alpha }).stroke({ width: 3, color: border, alpha: 0.25 }));
  return c;
}

export function tappable(c: Container, w: number, h: number, onTap: () => void, x = 0, y = 0) {
  c.eventMode = 'static'; c.cursor = 'pointer'; c.hitArea = new Rectangle(x, y, w, h);
  c.on('pointertap', (e) => { e.stopPropagation(); onTap(); });
}

export interface Btn extends Container { setText(t: string): void; setEnabled(b: boolean): void }
export function button(text: string, w: number, h: number, onTap: () => void, color = 0x4f9a4a, size = 24): Btn {
  const c = new Container() as Btn;
  const g = new Graphics();
  g.roundRect(0, 4, w, h, 12).fill({ color: 0x000000, alpha: 0.35 }).roundRect(0, 0, w, h, 12).fill(color).stroke({ width: 3, color: 0xffffff, alpha: 0.35 });
  const t = label(text, size, 0xffffff, { stroke: 0x1c2416 });
  t.anchor.set(0.5); t.position.set(w / 2, h / 2);
  c.addChild(g, t);
  let enabled = true;
  tappable(c, w, h, () => { if (!enabled) { sfx('deny'); return; } sfx('click'); onTap(); });
  c.on('pointerdown', () => { if (enabled) g.alpha = 0.8; });
  const up = () => { g.alpha = 1; };
  c.on('pointerup', up); c.on('pointerupoutside', up); c.on('pointerout', up);
  c.setText = (s) => { t.text = s; };
  c.setEnabled = (b) => { enabled = b; c.alpha = b ? 1 : 0.45; };
  return c;
}

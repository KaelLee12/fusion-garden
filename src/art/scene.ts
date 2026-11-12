import { Container, Graphics } from 'pixi.js';
import { CELL_W, COLS, GRID_H, GRID_X, GRID_Y, H, W, type SceneId } from '../types';
import { isWaterRow, sceneRows } from '../data/levels';

const PAL = {
  day: { a: 0x7ec850, b: 0x6fb944, edge: 0x4f8a2e, side: 0xb89a6a, road: 0x8a7a66, sky: 0x8fd3f4 },
  night: { a: 0x2f5f66, b: 0x28545c, edge: 0x1a3a40, side: 0x4a4458, road: 0x35303f, sky: 0x151a33 },
  pool: { a: 0x7ec850, b: 0x6fb944, edge: 0x4f8a2e, side: 0xb89a6a, road: 0x8a7a66, sky: 0x8fd3f4 },
};

export interface SceneView { view: Container; update(t: number): void }

export function makeScene(scene: SceneId): SceneView {
  const p = PAL[scene];
  const rows = sceneRows(scene), ch = GRID_H / rows;
  const view = new Container();
  const g = new Graphics();
  view.addChild(g);
  g.rect(0, 0, W, H).fill(p.edge);
  // 左侧院子、右侧来路
  g.rect(0, 0, GRID_X - 6, H).fill(p.side);
  g.rect(GRID_X + COLS * CELL_W + 6, 0, W, H).fill(p.road);
  for (let i = 0; i < 9; i++) g.roundRect(GRID_X - 34, GRID_Y + 6 + i * (GRID_H / 9), 18, GRID_H / 9 - 10, 5).fill(shadeMix(p.side, 0.8));
  for (let i = 0; i < 14; i++) g.ellipse(GRID_X + COLS * CELL_W + 30 + (i * 37) % 70, GRID_Y + 20 + i * 43, 9, 5).fill({ color: 0x000000, alpha: 0.12 });
  // 草坪格子
  for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
    const x = GRID_X + c * CELL_W, y = GRID_Y + r * ch;
    if (isWaterRow(scene, r)) g.rect(x, y, CELL_W, ch).fill((r + c) % 2 ? 0x3f8fd0 : 0x4a9bdb);
    else g.rect(x, y, CELL_W, ch).fill((r + c) % 2 ? p.a : p.b);
  }
  // 草叶点缀
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) {
    const x = GRID_X + rnd() * COLS * CELL_W, y = GRID_Y + rnd() * GRID_H, r = Math.floor((y - GRID_Y) / ch);
    if (isWaterRow(scene, r)) continue;
    g.moveTo(x, y).lineTo(x - 3, y - 8).moveTo(x, y).lineTo(x + 3, y - 7).stroke({ width: 1.5, color: p.edge, alpha: 0.5 });
  }
  if (scene === 'pool') {
    const y0 = GRID_Y + 2 * ch;
    g.rect(GRID_X - 6, y0 - 5, COLS * CELL_W + 12, 5).fill(0xd9d2c0); g.rect(GRID_X - 6, y0 + 2 * ch, COLS * CELL_W + 12, 5).fill(0xd9d2c0);
  }
  // 水波
  const waves = new Graphics(); view.addChild(waves);
  // 夜色星星
  if (scene === 'night') for (let i = 0; i < 40; i++) g.circle(rnd() * W, rnd() * H, rnd() * 1.6 + 0.4).fill({ color: 0xffffff, alpha: 0.12 + rnd() * 0.2 });
  // 顶部栏底色
  g.rect(0, 0, W, GRID_Y - 8).fill(scene === 'night' ? 0x1c2238 : 0x5a4632);
  g.rect(0, GRID_Y - 8, W, 4).fill({ color: 0x000000, alpha: 0.3 });

  return {
    view,
    update(t: number) {
      if (scene !== 'pool') return;
      waves.clear();
      for (let r = 2; r < 4; r++) for (let k = 0; k < 3; k++) {
        const y = GRID_Y + r * ch + 20 + k * (ch / 3);
        for (let x = GRID_X + 10 + ((t * 14 + k * 50 + r * 30) % 80); x < GRID_X + COLS * CELL_W - 30; x += 80)
          waves.moveTo(x, y).quadraticCurveTo(x + 10, y - 4, x + 20, y).stroke({ width: 2, color: 0xffffff, alpha: 0.28 });
      }
    },
  };
}
function shadeMix(c: number, f: number) {
  return ((Math.round(((c >> 16) & 255) * f)) << 16) | ((Math.round(((c >> 8) & 255) * f)) << 8) | Math.round((c & 255) * f);
}

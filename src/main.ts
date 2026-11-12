import 'pixi.js/unsafe-eval'; // 兼容禁止 eval 的 CSP 环境
import { Application, Container } from 'pixi.js';
import { H, W, type SceneId } from './types';
import { LEVELS, endlessLevel } from './data/levels';
import { Battle } from './game/battle';
import { almanacScreen, endlessScreen, levelScreen, menuScreen, pickScreen, type Nav, type Screen } from './ui/screens';
import { loadSave, save, writeSave } from './save';
import { unlockAudio } from './audio';

async function boot() {
  loadSave();
  const app = new Application();
  await app.init({ width: W, height: H, background: 0x10140f, antialias: true, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1), preference: 'webgl' });
  const host = document.getElementById('app')!;
  host.appendChild(app.canvas);

  // 等比缩放铺满窗口
  const fit = () => {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    app.canvas.style.width = `${Math.floor(W * s)}px`; app.canvas.style.height = `${Math.floor(H * s)}px`;
  };
  fit(); window.addEventListener('resize', fit); window.addEventListener('orientationchange', fit);
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  const root = new Container(); app.stage.addChild(root);
  let current: Screen | null = null;
  const show = (s: Screen) => { if (current) { root.removeChild(current.view); current.destroy ? current.destroy() : current.view.destroy({ children: true }); } current = s; root.addChild(s.view); };

  const nav: Nav = {
    menu: () => show(menuScreen(nav)),
    levels: () => show(levelScreen(nav)),
    endless: () => show(endlessScreen(nav)),
    almanac: () => show(almanacScreen(nav)),
    pick: (id, scene) => show(pickScreen(nav, id, scene)),
    play: (id, cards, scene?: SceneId) => {
      const lv = id > 0 ? LEVELS[id - 1] : endlessLevel(scene!);
      const battle = new Battle(lv, cards, (r, wave) => {
        if (r === 'win') {
          if (lv.id > save.cleared) save.cleared = lv.id;
          if (lv.unlock && !save.unlocked.includes(lv.unlock)) save.unlocked.push(lv.unlock);
          writeSave();
        } else if (r === 'lose') {
          if (lv.id < 0 && wave > (save.best[lv.scene] ?? 0)) { save.best[lv.scene] = wave; writeSave(); }
        } else if (r === 'retry') nav.play(id, cards, scene);
        else if (r === 'next') (id > 0 && id < LEVELS.length ? nav.pick(id + 1) : nav.levels());
        else (id > 0 ? nav.levels() : nav.endless());
      });
      show({ view: battle.view, update: (dt) => battle.update(dt), destroy: () => battle.destroy() });
      (window as any).__battle = battle; // 调试用
    },
  };
  (window as any).__nav = nav;
  nav.menu();
  app.ticker.add((tk) => current?.update?.(tk.deltaMS / 1000));
}
void boot();

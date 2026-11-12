import { Container, Graphics } from 'pixi.js';
import type { ZombieDef } from '../types';
import { shade } from './util';

const SKIN = 0xa9c98a, SKIN_D = 0x6f8a58, PANTS = 0x3a4458;
const CLOTH: Record<string, number> = {
  walker: 0x6a7fa0, pot: 0x8a6f5a, runner: 0xc05656, knight: 0x707a88, shield: 0x7a6a4a,
  leaper: 0x4f9a8a, necro: 0x4a3a6a, brute: 0x5a6a4a, king: 0x7a2a3a,
};

/** 僵尸外观：原点在脚底中心，面朝左 */
export class ZombieView {
  view = new Container();
  private rig = new Container();
  private legL = new Graphics(); private legR = new Graphics();
  private armF = new Graphics(); private armB = new Graphics();
  private head = new Container();
  private gear = new Graphics();
  private shieldG = new Graphics();
  private raft = new Graphics();
  private ice = new Graphics();
  hpBar = new Graphics();
  private phase = Math.random() * 6;
  private swim = false;
  private shadow = new Graphics();

  constructor(public def: ZombieDef) {
    const s = def.scale ?? 1;
    this.rig.scale.set(s);
    this.view.addChild(this.rig);
    const look = def.look, cloth = CLOTH[look], cd = shade(cloth, 0.6);
    this.shadow.ellipse(0, -2, 26, 7).fill({ color: 0x000000, alpha: 0.25 });
    this.rig.addChild(this.shadow);

    // 腿
    for (const [leg, x] of [[this.legB(), 8], [this.legL, -8]] as [Graphics, number][]) {
      leg.roundRect(-6, 0, 12, 32, 5).fill(PANTS).stroke({ width: 2, color: 0x232a38 });
      leg.ellipse(-3, 33, 10, 5).fill(0x2a2228);
      if (look === 'leaper') leg.moveTo(-6, 34).lineTo(4, 37).lineTo(-6, 40).lineTo(4, 43).stroke({ width: 2, color: 0xd9d9e6 });
      leg.position.set(x, -40); this.rig.addChild(leg);
    }
    // 后臂
    this.armB.roundRect(-30, -5, 32, 10, 5).fill(shade(SKIN, 0.85)).stroke({ width: 2, color: SKIN_D });
    this.armB.position.set(6, -72); this.rig.addChild(this.armB);
    // 躯干
    const torso = new Graphics();
    const tw = look === 'brute' || look === 'king' ? 27 : 20, th = look === 'necro' ? 62 : 50;
    torso.roundRect(-tw, -88, tw * 2, th, 10).fill(cloth).stroke({ width: 2.5, color: cd });
    for (let i = 0; i < 4; i++) { const x = -tw + (tw * 2 / 4) * i; torso.poly([x, -88 + th - 2, x + tw / 4, -88 + th + 7, x + tw / 2, -88 + th - 2]).fill(cloth); }
    if (look === 'runner') torso.rect(-tw, -72, tw * 2, 6).fill(0xffffff);
    if (look === 'king') { torso.rect(-tw, -88, tw * 2, 6).fill(0xffd23f); torso.poly([tw - 4, -86, tw + 22, -30, tw - 4, -44]).fill(0x5a1a2a).stroke({ width: 2, color: 0x3a0f1a }); }
    if (look === 'walker' || look === 'pot') { torso.poly([-6, -70, 2, -62, -8, -56]).fill(cd); }
    this.rig.addChild(torso);
    // 头
    const hg = new Graphics();
    hg.roundRect(-9, -8, 16, 16, 4).fill(SKIN_D);
    hg.circle(-4, -22, 20).fill(SKIN).stroke({ width: 2.5, color: SKIN_D });
    hg.circle(-13, -25, 7).fill(0xfffbe8).stroke({ width: 1.5, color: 0x3a3a2a }); hg.circle(-15, -25, 2.6).fill(0x1c1c16);
    hg.circle(3, -27, 5).fill(0xfffbe8).stroke({ width: 1.5, color: 0x3a3a2a }); hg.circle(2, -27, 1.8).fill(0x1c1c16);
    hg.moveTo(-18, -12).lineTo(2, -11).stroke({ width: 2.5, color: 0x3a3a2a, cap: 'round' });
    for (const x of [-14, -8, -2]) hg.moveTo(x, -15).lineTo(x, -8).stroke({ width: 1.8, color: 0x3a3a2a });
    if (look === 'walker' || look === 'shield') { hg.moveTo(-2, -42).lineTo(2, -50).moveTo(4, -41).lineTo(10, -47).moveTo(-8, -42).lineTo(-9, -49).stroke({ width: 2.5, color: 0x4a4a3a, cap: 'round' }); }
    if (look === 'brute') { hg.rect(-23, -36, 39, 7).fill(0xe8e2d0).stroke({ width: 1.5, color: 0xa89f88 }); }
    this.head.addChild(hg, this.gear);
    this.head.position.set(0, -88); this.rig.addChild(this.head);
    this.drawGear(look);
    // 前臂 + 手持物
    this.armF.roundRect(-32, -5, 34, 10, 5).fill(SKIN).stroke({ width: 2, color: SKIN_D });
    if (look === 'brute' || look === 'king') { this.armF.roundRect(-40, -46, 13, 50, 6).fill(0x7a5a3a).stroke({ width: 2.5, color: 0x4a321e }); this.armF.circle(-33, -44, 12).fill(0x6a4a2e).stroke({ width: 2.5, color: 0x4a321e }); }
    if (look === 'necro') { this.armF.rect(-31, -52, 5, 74).fill(0x6a4a2e); this.armF.circle(-28, -56, 9).fill(0x9bf06b).stroke({ width: 2, color: 0x3f7a2a }); this.armF.circle(-28, -56, 15).fill({ color: 0x9bf06b, alpha: 0.25 }); }
    this.armF.position.set(-6, -70); this.rig.addChild(this.armF);
    // 盾
    if (def.shield) {
      this.shieldG.ellipse(0, 0, 13, 36).fill(0x9a7448).stroke({ width: 3, color: 0x5a4028 });
      this.shieldG.moveTo(-4, -32).lineTo(-4, 32).moveTo(5, -30).lineTo(5, 30).stroke({ width: 1.5, color: 0x5a4028, alpha: 0.7 });
      this.shieldG.circle(0, 0, 6).fill(0xb8c4cc).stroke({ width: 2, color: 0x555c66 });
      this.shieldG.position.set(-34, -58); this.rig.addChild(this.shieldG);
    }
    // 水中木筏
    this.raft.roundRect(-34, -8, 68, 14, 6).fill(0x8a6238).stroke({ width: 2.5, color: 0x4a321e });
    this.raft.ellipse(0, 8, 44, 6).fill({ color: 0xffffff, alpha: 0.25 });
    this.raft.position.set(0, -34); this.raft.visible = false; this.rig.addChild(this.raft);
    // 冰冻
    this.ice.roundRect(-30, -116, 60, 118, 12).fill({ color: 0xbfeaff, alpha: 0.5 }).stroke({ width: 3, color: 0xe8fbff, alpha: 0.9 });
    this.ice.visible = false; this.rig.addChild(this.ice);
    this.hpBar.position.set(0, -124 * s - 14); this.view.addChild(this.hpBar);
  }
  private legB() { return this.legR; }

  private drawGear(look: string) {
    const g = this.gear.clear();
    switch (look) {
      case 'pot':
        g.moveTo(-28, -30).bezierCurveTo(-26, -62, 18, -62, 20, -30).closePath().fill(0x5d6570).stroke({ width: 2.5, color: 0x30353c });
        g.roundRect(-31, -33, 54, 7, 3).fill(0x767f8b).stroke({ width: 2, color: 0x30353c });
        g.circle(-4, -58, 5).fill(0x30353c); g.ellipse(-14, -46, 6, 4).fill({ color: 0xffffff, alpha: 0.3 });
        break;
      case 'knight':
        g.roundRect(-27, -47, 46, 50, 12).fill(0x9aa7b3).stroke({ width: 2.5, color: 0x4a5560 });
        g.rect(-27, -27, 30, 6).fill(0x1c2228); g.rect(-11, -44, 5, 44).fill(0x76828e);
        g.moveTo(-2, -47).bezierCurveTo(6, -68, 26, -62, 26, -44).bezierCurveTo(18, -52, 8, -52, 4, -46).fill(0xd94a4a).stroke({ width: 1.5, color: 0x7a2020 });
        break;
      case 'runner':
        g.rect(-24, -36, 40, 7).fill(0xe8433a); g.poly([16, -36, 34, -42, 32, -32, 16, -29]).fill(0xe8433a);
        break;
      case 'leaper':
        g.rect(-24, -32, 40, 5).fill(0x3a2f2a);
        g.circle(-13, -26, 9).fill({ color: 0x7fd4ff, alpha: 0.55 }).stroke({ width: 2.5, color: 0x3a2f2a });
        g.circle(4, -27, 7).fill({ color: 0x7fd4ff, alpha: 0.55 }).stroke({ width: 2.5, color: 0x3a2f2a });
        break;
      case 'necro':
        g.moveTo(-28, -8).bezierCurveTo(-32, -50, 0, -64, 14, -52).lineTo(22, -6).quadraticCurveTo(12, -20, 10, -40).bezierCurveTo(-4, -50, -22, -38, -22, -8).closePath().fill(0x3a2a56).stroke({ width: 2.5, color: 0x221838 });
        break;
      case 'king':
        g.poly([-24, -38, -26, -62, -15, -48, -4, -68, 7, -48, 18, -62, 16, -38]).fill(0xffd23f).stroke({ width: 2.5, color: 0x9a7a1a });
        g.circle(-4, -46, 4).fill(0xe2475b); g.circle(-17, -44, 3).fill(0x4fa6e8); g.circle(9, -44, 3).fill(0x4fa6e8);
        break;
    }
  }

  setArmor(on: boolean) { this.gear.visible = on || this.def.look === 'runner' || this.def.look === 'leaper' || this.def.look === 'necro' || this.def.look === 'king'; }
  setShield(on: boolean) { this.shieldG.visible = on; }
  setSwim(on: boolean) {
    this.swim = on; this.raft.visible = on; this.shadow.visible = !on; this.legL.visible = !on; this.legR.visible = !on;
    this.rig.y = on ? 16 * (this.def.scale ?? 1) : 0;
  }
  setFrozen(on: boolean) { this.ice.visible = on; }

  drawHp(frac: number) {
    const w = 60; const g = this.hpBar.clear();
    g.roundRect(-w / 2, 0, w, 8, 4).fill(0x1c1c16);
    g.roundRect(-w / 2 + 1.5, 1.5, (w - 3) * Math.max(0, frac), 5, 2.5).fill(frac > 0.4 ? 0xe2475b : 0xff9a3a);
  }

  /** walk: 行走相位; eating: 是否在啃; frozen: 冻住不动 */
  update(t: number, moving: boolean, eating: boolean, frozen: boolean) {
    if (frozen) return;
    const w = t * (moving ? 7 : 0) + this.phase;
    const sw = moving ? Math.sin(w) * 0.45 : 0;
    this.legL.rotation = sw; this.legR.rotation = -sw;
    this.rig.rotation = moving ? Math.sin(w * 0.5) * 0.04 : 0;
    const bob = this.swim ? Math.sin(t * 3 + this.phase) * 2 : 0;
    this.head.y = -88 + bob + (eating ? Math.sin(t * 16) * 3 : 0);
    this.armF.rotation = eating ? Math.sin(t * 16) * 0.5 - 0.15 : Math.sin(w) * 0.12 + 0.1;
    this.armB.rotation = eating ? Math.cos(t * 16) * 0.5 - 0.15 : -Math.sin(w) * 0.12 + 0.18;
  }
}

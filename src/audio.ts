import { save } from './save';

// 用 WebAudio 合成的简易音效，不依赖任何音频文件
let ctx: AudioContext | null = null;
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
}
const last: Record<string, number> = {};
function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0) {
  if (!ctx || save.mute) return;
  try {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
  } catch { /* 忽略 */ }
}
function noise(dur: number, vol: number) {
  if (!ctx || save.mute) return;
  try {
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.value = vol;
    s.connect(g).connect(ctx.destination); s.start();
  } catch { /* 忽略 */ }
}
export type Sfx = 'shoot' | 'hit' | 'plant' | 'fuse' | 'sun' | 'boom' | 'bite' | 'wave' | 'win' | 'lose' | 'click' | 'deny' | 'freeze';
export function sfx(name: Sfx) {
  const now = performance.now();
  if (now - (last[name] || 0) < 45) return; // 同一音效限流
  last[name] = now;
  switch (name) {
    case 'shoot': tone(520, 0.07, 'triangle', 0.05, -200); break;
    case 'hit': tone(180, 0.05, 'square', 0.035, -80); break;
    case 'plant': tone(240, 0.12, 'sine', 0.12, -120); break;
    case 'fuse': tone(440, 0.12, 'sine', 0.1, 440); setTimeout(() => tone(880, 0.2, 'sine', 0.1, 400), 90); break;
    case 'sun': tone(880, 0.12, 'sine', 0.07, 500); break;
    case 'boom': noise(0.5, 0.35); tone(90, 0.4, 'sawtooth', 0.15, -50); break;
    case 'bite': tone(130, 0.06, 'sawtooth', 0.04, -40); break;
    case 'wave': tone(220, 0.5, 'sawtooth', 0.08, -110); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.1), i * 130)); break;
    case 'lose': [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'sawtooth', 0.08), i * 180)); break;
    case 'click': tone(660, 0.05, 'triangle', 0.06); break;
    case 'deny': tone(150, 0.12, 'square', 0.05); break;
    case 'freeze': tone(1400, 0.4, 'sine', 0.08, -900); break;
  }
}

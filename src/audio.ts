import { save } from './save';

// 用 WebAudio 合成的简易音效，不依赖任何音频文件
let ctx: AudioContext | null = null;
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    startMusic();
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

// ---- 背景音乐：原创的小调循环，同样用 WebAudio 实时合成，不依赖音频文件 ----
const BPM = 96;
const STEP = 60 / BPM / 2;            // 八分音符
const BARS: { bass: number; arp: number[] }[] = [
  { bass: 45, arp: [57, 60, 64] },    // Am
  { bass: 41, arp: [53, 57, 60] },    // F
  { bass: 38, arp: [50, 53, 57] },    // Dm
  { bass: 40, arp: [52, 56, 59] },    // E
];
// 旋律（MIDI 音高，0 = 休止），两遍和弦进行共 64 步
const MELODY = [
  76, 0, 0, 72, 0, 69, 0, 0,   0, 77, 0, 72, 0, 69, 72, 0,
  74, 0, 77, 0, 76, 0, 74, 0,  71, 0, 0, 68, 0, 71, 76, 0,
  81, 0, 76, 0, 72, 0, 76, 0,  77, 0, 0, 72, 0, 77, 81, 0,
  74, 0, 0, 77, 74, 0, 69, 0,  68, 0, 71, 0, 76, 0, 0, 0,
];
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
let musicGain: GainNode | null = null;
let musicTimer: number | undefined;
let step = 0;
let nextT = 0;

function note(midi: number, t: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !musicGain) return;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(hz(midi), t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicGain); o.start(t); o.stop(t + dur + 0.02);
}

function scheduleStep(i: number, t: number) {
  const s = i % 8; const bar = BARS[Math.floor(i / 8) % BARS.length];
  if (s === 0 || s === 4) note(bar.bass, t, STEP * 3.2, 'triangle', 0.09);
  else if (s === 3 || s === 6) note(bar.bass + 12, t, STEP * 0.9, 'triangle', 0.05);
  note(bar.arp[s % 3] + (s >= 6 ? 12 : 0), t, STEP * 0.9, 'sine', 0.03);
  const m = MELODY[i % MELODY.length];
  if (m) note(m, t, STEP * 1.8, 'square', 0.022);
}

function musicTick() {
  if (!ctx || !musicGain) return;
  const now = ctx.currentTime;
  const on = !save.mute && !document.hidden && ctx.state === 'running';
  musicGain.gain.setTargetAtTime(on ? 1 : 0, now, 0.08);
  if (nextT < now) nextT = now + 0.05;          // 后台被节流后重新对齐
  while (nextT < now + 0.3) {
    if (on) scheduleStep(step, nextT);
    step = (step + 1) % MELODY.length;
    nextT += STEP;
  }
}

/** 首次用户手势解锁音频后调用；重复调用无副作用 */
export function startMusic() {
  if (!ctx || musicTimer !== undefined) return;
  try {
    musicGain = ctx.createGain(); musicGain.gain.value = 0;
    musicGain.connect(ctx.destination);
    musicTimer = window.setInterval(musicTick, 100);
  } catch { musicGain = null; }
}

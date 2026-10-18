// Cue-driven sound engine. A film declares cues ({kind, f, ...}) in its manifest; this renders them to a stereo wav.
// Cue frames are on the film's SOURCE timeline (manifest.fps), so the score re-times with scene edits like any timeline track.
// Themes remap cue parameters (pitch, decay, gain) or drop cues, so one film can sound deep, bright or minimal.
import { ffmpegPath } from '../core/ffmpeg';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SR = 48000;

class Mixer {
  N: number; L: Float32Array; R: Float32Array; mir: number; seed: number; pendingSilence: Array<[number, number, number]> = [];
  constructor(seconds, { rtl = false } = {}) {
    this.N = Math.round(SR * seconds); this.L = new Float32Array(this.N); this.R = new Float32Array(this.N);
    this.mir = rtl ? -1 : 1; this.seed = 7;
  }
  rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296 * 2 - 1; }
  put(t, n, fn, pan = 0, gain = 1) {                       // fn(i, tSec) -> sample
    pan = Math.max(-1, Math.min(1, pan * this.mir));
    const i0 = Math.round(t * SR), lg = Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, rg = Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
    for (let i = 0; i < n; i++) { const k = i0 + i; if (k < 0 || k >= this.N) continue; const v = fn(i, i / SR) * gain; this.L[k] += v * lg; this.R[k] += v * rg; }
  }
}
const lp = fc => { const a = Math.exp(-2 * Math.PI * fc / SR); let s = 0; return x => (s = (1 - a) * x + a * s); };
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const noteHz = n => typeof n === 'number' ? n : (m => m ? 440 * Math.pow(2, (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12 - 69) / 12) : 110)(/^([A-G])([#b]?)(-?\d)$/.exec(n));

/* ---------- instruments: (mixer, t0 seconds, opts) ---------- */
const I = {
  boom(m, t, o) {                                          // sub boom: sine with pitch drop, saturated for phone speakers, tiny click
    const decay = o.decay ?? 2.6, f0 = o.f0 ?? 58, f1 = o.f1 ?? 36, n = Math.round((decay + .1) * SR), tau = decay / 4.6; let ph = 0; const cl = lp(2400);
    m.put(t, n, (i, s) => { const f = f1 + (f0 - f1) * Math.exp(-s / .07); ph += 2 * Math.PI * f / SR; return Math.tanh(1.7 * Math.sin(ph)) * .62 * (1 - Math.exp(-s / .004)) * Math.exp(-s / tau) + cl(m.rnd()) * Math.exp(-s / .0025) * .9; }, 0, o.gain ?? 1);
  },
  tick(m, t, o) { const fq = o.freq ?? 2200, f = lp(3200), n = Math.round(.05 * SR); m.put(t, n, (i, s) => (Math.sin(2 * Math.PI * fq * s) * Math.exp(-s / .006) + f(m.rnd()) * Math.exp(-s / .0018)) * .6, o.pan ?? 0, o.gain ?? .2); },
  dtick(m, t, o) { const g = o.gain ?? .22; I.tick(m, t, { gain: g, freq: 2100, pan: -.15 }); I.tick(m, t + .07, { gain: g * .9, freq: 2650, pan: .15 }); },   // the brand "double tick"
  pluck(m, t, o) {
    const fq = noteHz(o.note ?? o.freq ?? 110), n = Math.round(1.6 * SR);
    m.put(t, n, (i, s) => (1 - Math.exp(-s / .003)) * (Math.sin(2 * Math.PI * fq * s) * Math.exp(-s / .38) + .35 * Math.sin(4 * Math.PI * fq * s) * Math.exp(-s / .16) + .7 * Math.sin(Math.PI * fq * s) * Math.exp(-s / .55)), o.pan ?? 0, o.gain ?? .5);
  },
  whoosh(m, t, o) {
    const dur = o.dur ?? .5, g = o.gain ?? .3, p0 = o.p0 ?? -.6, p1 = o.p1 ?? .6, n = Math.round(dur * SR); let s1 = 0, s2 = 0;
    for (let i = 0; i < n; i++) {
      const k = Math.round(t * SR) + i; if (k < 0 || k >= m.N) continue; const u = i / n, fc = 180 + 2200 * Math.sin(Math.PI * u) ** 2, a = Math.exp(-2 * Math.PI * fc / SR);
      s1 = (1 - a) * m.rnd() + a * s1; s2 = (1 - a) * s1 + a * s2; const env = Math.sin(Math.PI * u) ** 2 * g * 3, pan = Math.max(-1, Math.min(1, (p0 + (p1 - p0) * u) * m.mir));
      m.L[k] += s2 * env * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2; m.R[k] += s2 * env * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
    }
  },
  riser(m, t, o) { const t1 = o.t1, n = Math.round((t1 - t) * SR); let s = 0, ph = 0; m.put(t, n, (i) => { const u = i / n, fc = 150 * Math.pow(20, u), a = Math.exp(-2 * Math.PI * fc / SR); s = (1 - a) * m.rnd() + a * s; ph += 2 * Math.PI * (55 + 55 * u) / SR; return (s * 2.2 + Math.sin(ph) * .4) * u * u; }, 0, o.gain ?? .35); },
  drone(m, t, o) {
    const t1 = o.t1, D = t1 - t, n = Math.round(D * SR), o0 = o.open0 ?? 300, o1 = o.open1 ?? 1000, fi = o.fadeIn ?? 1.5, fo = o.fadeOut ?? .08; let s = 0;
    m.put(t, n, (i, sec) => { const u = sec / D, fc = o0 + (o1 - o0) * u, a = Math.exp(-2 * Math.PI * fc / SR); s = (1 - a) * m.rnd() + a * s; const env = Math.min(1, sec / fi) * Math.min(1, (D - sec) / fo) * (.85 + .15 * Math.sin(2 * Math.PI * .23 * sec)); return env * (Math.sin(2 * Math.PI * 36.71 * sec) * .55 + Math.sin(2 * Math.PI * 55 * sec) * .35 + Math.sin(2 * Math.PI * 73.42 * sec + .4) * .18 + s * 1.4); }, 0, o.gain ?? .1);
  },
  pad(m, t, o) { const t1 = o.t1, D = t1 - t, n = Math.round(D * SR), fr = [146.83, 174.61, 220.0]; m.put(t, n, (i, s) => { const env = Math.min(1, s / .9) * Math.min(1, (D - s) / 1.0); return env * fr.reduce((a, f, k) => a + Math.sin(2 * Math.PI * (f + (k - 1) * .6) * s) + .5 * Math.sin(2 * Math.PI * (f - (k - 1) * .5) * s), 0) / 4; }, 0, o.gain ?? .03); },
  ring(m, t, o) { const dur = o.dur ?? .9, n = Math.round(dur * SR), f1 = lp(700), f2 = lp(700); m.put(t, n, (i, s) => { const on = (Math.sin(2 * Math.PI * 22 * s) > 0 ? 1 : .2) * Math.min(1, s / .02) * Math.min(1, (dur - s) / .05); return f2(f1((Math.sin(2 * Math.PI * 440 * s) + Math.sin(2 * Math.PI * 480 * s)) * on)) * 2; }, .1, o.gain ?? .12); },
  kick(m, t, o) { const n = Math.round(.6 * SR); let ph = 0; m.put(t, n, (i, s) => { ph += 2 * Math.PI * (48 + 40 * Math.exp(-s / .03)) / SR; return Math.sin(ph) * Math.exp(-s / .16) * (1 - Math.exp(-s / .002)); }, 0, o.gain ?? .4); },
  shaker(m, t, o) { const n = Math.round(.09 * SR), f = lp(5000); let h = 0; m.put(t, n, (i, s) => { const x = f(m.rnd()), y = x - h; h = x; return y * Math.exp(-s / .02) * 3; }, o.pan ?? .3, o.gain ?? .05); },
  blip(m, t, o) { const f0 = o.freq ?? 440, n = Math.round(.08 * SR), f = lp(1300); m.put(t, n, (i, s) => f((Math.sin(2 * Math.PI * f0 * s) + Math.sin(2 * Math.PI * (f0 + 40) * s)) * (Math.sin(2 * Math.PI * 25 * s) > -.3 ? 1 : .3)) * Math.min(1, s / .003) * Math.exp(-s / .028) * 1.6, o.pan ?? 0, o.gain ?? .05); },
  scribble(m, t, o) {                                      // marker pen: band-limited noise, loudest while the stroke is fastest
    const t1 = o.t1, n = Math.round((t1 - t) * SR), a = lp(3200), b = lp(700), p0 = o.p0 ?? -.4, p1 = o.p1 ?? .4;
    for (let i = 0; i < n; i++) { const u = i / n, x = m.rnd(), bp = a(x) - b(x), g = Math.min(1, 3 * (1 - u) * (1 - u)) * (.7 + .3 * Math.sin(2 * Math.PI * 34 * i / SR + Math.sin(i / 900))) * Math.min(1, u * 40); m.put(t + i / SR, 1, () => bp * g * 3, p0 + (p1 - p0) * u, o.gain ?? .14); }
  },
  swipe(m, t, o) { const dur = o.dur ?? .36, n = Math.round(dur * SR), p0 = o.p0 ?? -.5, p1 = o.p1 ?? .5; let st = 0; for (let i = 0; i < n; i++) { const u = i / n, fc = 400 + 3600 * u * u, a = Math.exp(-2 * Math.PI * fc / SR); st = (1 - a) * m.rnd() + a * st; m.put(t + i / SR, 1, () => st * Math.sin(Math.PI * u) * 2.5, p0 + (p1 - p0) * u, o.gain ?? .14); } },
  slide(m, t, o) {                                         // something sliding across the frame (pan travels p0 -> p1)
    const t1 = o.t1, n = Math.round((t1 - t) * SR), f = lp(o.cut ?? 650), f2 = lp(o.cut ?? 650), p0 = o.p0 ?? -.9, p1 = o.p1 ?? .9;
    for (let i = 0; i < n; i++) { const u = i / n, env = Math.sin(Math.PI * u) ** 1.5, rat = .65 + .35 * Math.sin(2 * Math.PI * 17 * i / SR); const v = f2(f(m.rnd())) * env * rat * 5; m.put(t + i / SR, 1, () => v, p0 + (p1 - p0) * u, o.gain ?? .08); }
  },
  thud(m, t, o) { I.boom(m, t, { gain: o.gain ?? .16, decay: .35, f0: 84, f1: 50 }); I.tick(m, t, { gain: (o.gain ?? .16) * .5, freq: 900, pan: o.pan ?? 0 }); },
  stamp(m, t, o) { const g = o.gain ?? .32; I.boom(m, t, { gain: g, decay: .55, f0: 96, f1: 46 }); I.tick(m, t, { gain: g * .45, freq: 1300, pan: o.pan ?? 0 }); I.tick(m, t + .012, { gain: g * .3, freq: 700, pan: o.pan ?? 0 }); },
  roomtone(m, t, o) { const f = lp(380), n = Math.round((o.t1 - t) * SR); m.put(t, n, () => f(m.rnd()) * 4, 0, o.gain ?? .0012); },
  silence(m, t, o) { const a = Math.round(t * SR), b = Math.round(o.t1 * SR), fd = Math.round(.006 * SR); m.pendingSilence.push([a, b, fd]); },
};
const RANGE = new Set(['riser', 'drone', 'pad', 'scribble', 'slide', 'roomtone', 'silence']);   // kinds that span f..to

/* ---------- themes: cue -> cue' (or null to drop) ---------- */
const scale = (o, k, v, d) => (o[k] = (o[k] ?? d) * v);
const THEMES = {
  deep: { eq: 'highpass=f=25,highshelf=f=8000:g=-6', map: c => c },
  bright: { eq: 'highpass=f=40,highshelf=f=6000:g=2', map: c => {
    const o = { ...c };
    if (c.kind === 'boom' || c.kind === 'stamp' || c.kind === 'thud') { scale(o, 'f0', 1.8, 58); scale(o, 'f1', 1.8, 36); scale(o, 'decay', .45, 2.6); scale(o, 'gain', .8, 1); }
    else if (c.kind === 'tick' || c.kind === 'dtick' || c.kind === 'blip') { scale(o, 'freq', 1.35, 2200); scale(o, 'gain', 1.25, .2); }
    else if (c.kind === 'pluck') { o.freq = noteHz(c.note ?? c.freq ?? 110) * 2; delete o.note; }
    else if (c.kind === 'drone' || c.kind === 'pad') scale(o, 'gain', .5, .1);
    return o;
  } },
  minimal: { eq: 'highpass=f=30,highshelf=f=8000:g=-4', map: c => {
    if (['riser', 'whoosh', 'pad', 'shaker', 'kick', 'blip', 'drone', 'scribble', 'swipe', 'slide'].includes(c.kind)) return null;
    const o = { ...c }; if (['boom', 'stamp', 'thud'].includes(c.kind)) { scale(o, 'gain', .6, 1); scale(o, 'decay', .6, 2.6); } return o;
  } },
};

/* ---------- render ---------- */
// cues: [{kind, f, to?, ...opts}], fps: film fps, seconds: total length
function mix(cues, { fps, seconds, theme = 'deep', rtl = false }) {
  const T = THEMES[theme] || THEMES.deep, m = new Mixer(seconds, { rtl }); m.pendingSilence = [];
  const ordered = [...cues].sort((a, b) => Number(a.kind === 'silence') - Number(b.kind === 'silence') || a.f - b.f);
  for (const raw of ordered) {
    const c = T.map(raw); if (!c) continue; const fn = I[c.kind]; if (!fn) continue;
    const { kind, f, to, ...o } = c; if (RANGE.has(kind)) { if (to == null) continue; o.t1 = to / fps; }
    fn(m, f / fps, o);
  }
  for (const [a, b, fd] of m.pendingSilence) for (let k = a - fd; k < b + fd; k++) { if (k < 0 || k >= m.N) continue; const g = k < a ? (a - k) / fd : k >= b ? (k - b) / fd : 0; m.L[k] *= g; m.R[k] *= g; }
  return { m, eq: T.eq };
}
function writeWav(m, file, gain) {
  const N = m.N, buf = Buffer.alloc(44 + N * 8);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 8, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 8, 28); buf.writeUInt16LE(8, 32); buf.writeUInt16LE(32, 34); buf.write('data', 36); buf.writeUInt32LE(N * 8, 40);
  for (let i = 0; i < N; i++) { buf.writeFloatLE(m.L[i] * gain, 44 + i * 8); buf.writeFloatLE(m.R[i] * gain, 48 + i * 8); }
  fs.writeFileSync(file, buf);
}
// Two-pass loudness normalisation (EBU R128) to `loudness` LUFS with a -1 dBTP ceiling.
function master(rawFile, outFile, { eq, loudness = -16 }) {
  const FF = ffmpegPath();
  const af = `${eq},loudnorm=I=${loudness}:TP=-1:LRA=11`;
  const log = spawnSync(FF, ['-hide_banner', '-i', rawFile, '-af', `${af}:print_format=json`, '-f', 'null', '-']).stderr.toString();
  const j = JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));
  const r = spawnSync(FF, ['-hide_banner', '-v', 'error', '-y', '-i', rawFile, '-af', `${af}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=${SR}`, '-c:a', 'pcm_s24le', outFile]);
  if (r.status) throw new Error('ffmpeg mastering failed: ' + r.stderr);
  return { inputLUFS: +j.input_i, lra: +j.input_lra };
}
function renderToFile(cues, o) {
  const { m, eq } = mix(cues, o), raw = o.out + '.raw.wav';
  let pk = 0; for (let i = 0; i < m.N; i++) pk = Math.max(pk, Math.abs(m.L[i]), Math.abs(m.R[i]));
  writeWav(m, raw, pk ? .7 / pk : 1);
  try { return master(raw, o.out, { eq, loudness: o.loudness ?? -16 }); } finally { fs.rmSync(raw, { force: true }); }
}
const KINDS = Object.keys(I);
export { mix, renderToFile, THEMES, KINDS, RANGE, noteHz, SR };

/* Seekframe runtime: helpers every film needs, plus SF.define() which wires up the film contract.
   Include it from your film.html (path from `seekframe new`):  <script src="../../dist/browser/runtime.js"></script>
   Docs: docs/RUNTIME.md and docs/FILM_SPEC.md. Everything here is a pure function of its inputs (no clocks, no randomness). */
import type { Manifest, Param, ParamValue } from '../types';
import { createTimeline, type Timeline } from './kit';
import { tokens } from '../core/kit-math';
import { ui, canvas } from './components';
import type { CueBuilder, Ease, FilmSpec, Keyframe, Layout, SFApi } from './api';

const g = window as any;

/* ---------- math + easing ---------- */
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rng = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
const E: SFApi['E'] = {
  lin: t => clamp(t),
  out: t => 1 - Math.pow(1 - clamp(t), 3), in: t => Math.pow(clamp(t), 3),
  out2: t => 1 - (1 - clamp(t)) * (1 - clamp(t)), in2: t => clamp(t) * clamp(t),
  io: t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  expo: t => { t = clamp(t); return (1 - Math.pow(2, -9 * t)) / (1 - Math.pow(2, -9)); },
  back: t => { t = clamp(t); const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
// keyframes: kf(f, [[frame, value, ease?], ...]); each segment eases into its value with its own ease (default io)
function kf(f: number, tab: Keyframe[], ease: Ease = E.io): number {
  if (f <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (f <= tab[i][0]) { const [f0, v0] = tab[i - 1], [f1, v1, e] = tab[i]; return lerp(v0, v1, (e || ease)((f - f0) / (f1 - f0))); }
  return tab[tab.length - 1][1];
}
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // seeded 0..1, use instead of Math.random
const wob = (seed: number, t: number, amp = 1) => amp * (Math.sin(t * 0.045 + seed * 1.7) * 0.6 + Math.sin(t * 0.021 + seed * 3.1) * 0.4);

/* ---------- dom ---------- */
const el: SFApi['el'] = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
const css: SFApi['css'] = (e, o) => { for (const k in o) (e.style as any)[k] = o[k]; return e; };
const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// for elements positioned with transform: keep them pinned to the origin (otherwise RTL pages offset them)
const place = (e: HTMLElement, x: number, y: number, extra = '') => { e.style.left = '0'; e.style.top = '0'; e.style.transform = `translate(${x}px,${y}px) ${extra}`; };

/* ---------- language / direction ---------- */
const html = document.documentElement;
const lang: string = g.FILM_LANG || html.lang || 'en';
const rtl = (html.dir || (g.FILM_RTL ? 'rtl' : 'ltr')) === 'rtl' || g.FILM_LANG === 'ar' || !!g.FILM_RTL;

/* ---------- layout (responsive films: 16:9, 9:16, 1:1) ---------- */
const layout = (): Layout => {
  // a hidden frame (the editor builds before it shows the film) has no size yet: use the film's own size then
  const W = g.innerWidth || g.manifest?.width || 1920, H = g.innerHeight || g.manifest?.height || 1080, r = W / H;
  const aspect = Math.abs(r - 16 / 9) < .05 ? '16x9' : Math.abs(r - 9 / 16) < .05 ? '9x16' : Math.abs(r - 1) < .05 ? '1x1' : r > 1 ? 'wide' : 'tall';
  const unit = Math.min(W, H) / 1080;                                  // scale type/spacing with this
  return { W, H, aspect, unit, portrait: H > W, safe: { x: Math.round(W * .06), y: Math.round(H * (H > W ? .1 : .08)) } };
};
const X = (x: number, W?: number) => (rtl ? (W || layout().W) - x : x);          // mirror a horizontal coordinate in RTL

/* ---------- text animation ---------- */
// "Cash on [delivery.]" -> word spans; [..] = highlighted keyword (its text sits in .in so wipe() can colour it separately)
const words: SFApi['words'] = (parent, text, cls = '') => {
  const out: HTMLElement[] = [];
  const src = String(text), toks = [...src.matchAll(/\[[^\]]+\]|[^\s[]+/g)];
  toks.forEach((m, i) => {
    const tk = m[0], hl = tk.startsWith('[');
    out.push(el('span', 'w' + (hl ? ' hl' : '') + (cls ? ' ' + cls : ''), parent, hl ? `<span class="in">${esc(tk.slice(1, -1))}</span>` : esc(tk)));
    const next = toks[i + 1];                                          // "[films]?" keeps the ? next to the word
    if (next && /\s/.test(src.slice(m.index! + tk.length, next.index))) parent.appendChild(document.createTextNode(' '));
  });
  return out;
};
const pop: SFApi['pop'] = (ws, f, start, step = 4, dur = 9, dy = 26) => ws.forEach((w, i) => {
  const t = rng(f, start + i * step, start + i * step + dur), e = E.expo(t);
  w.style.opacity = String(clamp(t * 2.2)); w.style.transform = `translateY(${(1 - e) * dy}px)`; w.style.filter = t < 1 ? `blur(${(1 - e) * 8}px)` : '';
});
// highlight that wipes in: box and text colour sweep together (no dark-on-dark half state). Direction follows the page.
const wipe: SFApi['wipe'] = (w, t, base = 'var(--fg)') => {
  const d = rtl ? 270 : 90, p = (clamp(t) * 100).toFixed(2), i = w.firstChild as HTMLElement;
  w.style.background = `linear-gradient(${d}deg, var(--acc) ${p}%, transparent ${p}%)`;
  i.style.background = `linear-gradient(${d}deg, var(--accInk) ${p}%, ${base} ${p}%)`; (i.style as any).webkitBackgroundClip = 'text'; i.style.backgroundClip = 'text'; i.style.color = 'transparent';
};
const typed: SFApi['typed'] = (text, f, a, b) => { const gs = [...new Intl.Segmenter(lang, { granularity: 'grapheme' }).segment(text)].map(x => x.segment); return gs.slice(0, Math.floor(rng(f, a, b) * gs.length)).join(''); };

/* ---------- svg stroke drawing ---------- */
// path with pathLength=1 and stroke-dasharray "1 1": dash(p, 0..1) draws it
const dash = (p: SVGPathElement, v: number) => { p.style.strokeDashoffset = String(1 - clamp(v)); p.style.opacity = v <= .001 ? '0' : '1'; };
// Draws a logo from `seekframe brand import-logo --strokes` output (assets/logo-strokes.json) as animatable strokes.
const strokeLogo: SFApi['strokeLogo'] = (parent, data, o = {}) => {
  const [x, y, w, h] = data.viewBox, W = o.width || 400, ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`); svg.setAttribute('width', String(W)); svg.setAttribute('height', String(W * h / w)); svg.style.overflow = 'visible';
  const paths = data.strokes.map((s, i) => {
    const p = document.createElementNS(ns, 'path'); p.setAttribute('d', s.d); p.setAttribute('fill', 'none'); p.setAttribute('stroke-width', String(s.width)); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); p.setAttribute('pathLength', '1'); p.setAttribute('stroke-dasharray', '1 1');
    p.style.stroke = (o.colors && o.colors[i]) || s.color; svg.appendChild(p); return p;
  });
  if (parent) parent.appendChild(svg); return { svg, paths };
};

/* ---------- fonts + images ---------- */
// Waits for every @font-face to settle. A face whose file is missing (e.g. a licensed brand font that is not in the repo)
// is skipped, so the CSS fallback stack takes over instead of failing the film.
const fontsReady = async () => {
  await Promise.all([...document.fonts].map(f => f.load().catch(() => null)));
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => i.complete || !i.src ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
};

/* ---------- brand tokens (brand/brand.js defines window.BRAND, brand/brand.css the CSS variables) ---------- */
const brandParams: SFApi['brandParams'] = (opts = {}) => {
  const B = g.BRAND; if (!B) return [];
  const L: Record<string, string> = { accent: 'Accent colour', ink: 'Dark colour', paper: 'Light colour', muted: 'Muted colour' }, out: Param[] = [];
  for (const k of Object.keys(B.colors || {})) out.push({ id: 'brand-' + k, type: 'color', label: L[k] || k, default: B.colors[k], cssVar: '--brand-' + k, ...opts });
  return out;
};

/* ---------- cues (feed the sound engine; see docs/SOUND.md) ---------- */
// const c = SF.cues(); c.boom(42); c.tick(10, {pan:-.2}); c.slide(106, 141, {p0:-1, p1:1}); the film manifest gets c.list
const cues = (): CueBuilder => {
  const list: any[] = [], add = (kind: string, f: number, o?: object) => { list.push({ kind, f, ...o }); return list; };
  return new Proxy({ list } as any, { get: (_t, k: string) => k === 'list' ? list : (a: number, b?: any, c?: any) => typeof b === 'number' ? add(k, a, { to: b, ...c }) : add(k, a, b) });
};

/* ---------- the contract ---------- */
let currentValues: Record<string, ParamValue> = {}, currentFps = 30, currentTimeline: Timeline | null = null;
const timeline = (o: { fps?: number } = {}): Timeline => createTimeline({ fps: o.fps || currentFps, rtl, lang, size: () => ({ W: g.innerWidth, H: g.innerHeight }) });
const define = (spec: FilmSpec): Manifest => {
  currentFps = spec.fps || 30;
  const m: Manifest = g.manifest = { schema: 1 as const, title: spec.title, width: spec.width, height: spec.height, fps: spec.fps || 30, duration: spec.duration, scenes: spec.scenes, params: [], audio: typeof spec.audio === 'function' ? [] : (spec.audio || []) };
  if (spec.sizes) m.sizes = spec.sizes; if (spec.variants) m.variants = spec.variants; if (spec.poster != null) m.poster = spec.poster; m.lang = { code: lang, rtl };
  const values = () => ({ ...currentValues });
  g.applyParams = (v: Record<string, ParamValue>) => {
    currentValues = { ...v };
    m.params = typeof spec.params === 'function' ? spec.params(values()) : (spec.params || []);
    if (typeof spec.audio === 'function') m.audio = spec.audio(values());
    m.cues = spec.cues ? spec.cues(values()) : [];            // rebuilt on every application of params (the kit's cues are appended below)
    if (spec.soundtrack) m.soundtrack = typeof spec.soundtrack === 'function' ? spec.soundtrack(values()) : spec.soundtrack;
    currentTimeline = null; spec.build(values());
    if (spec.timeline) { currentTimeline = timeline({ fps: m.fps }); spec.timeline(currentTimeline, values()); m.cues = [...(m.cues || []), ...currentTimeline.cues()]; }
  };
  g.seek = (f: number) => { if (spec.seek) spec.seek(f); if (currentTimeline) currentTimeline.draw(f); };
  g.ready = (async () => { await fontsReady(); g.applyParams({}); await fontsReady(); return true; })();
  return m;
};
const value = <T extends ParamValue>(id: string, dflt: T): T => (currentValues[id] == null ? dflt : (currentValues[id] as T));

const SF: SFApi = { clamp, lerp, rng, E, kf, hash, wob, el, css, esc, place, lang: { code: lang, rtl }, X, dirSign: (rtl ? -1 : 1) as 1 | -1, layout, words, pop, wipe, typed, dash, strokeLogo, fontsReady, brandParams, timeline, motion: tokens(30), ui, canvas, cues, define, value };
g.SF = SF;

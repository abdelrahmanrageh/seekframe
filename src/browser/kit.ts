// The motion + sound kit: one call animates an element AND registers its sound, so picture and sound cannot drift.
//   const T = SF.timeline();  T.rise(card, 12);  T.type(box, text, 40, 92);  ...  seek(f) { T.draw(f); }  cues() { return T.cues(); }
// Every primitive is a pure function of the frame (poses are combined per element each draw; nothing is remembered between frames).
import type { Cue } from '../types';
import { combine, css, EASE, IDENTITY, keyFrames, panOf, pose, rng, tickFrames, tokens, type Pose, type Tokens } from '../core/kit-math';
import type { Ease } from './api';

export type Els = HTMLElement | HTMLElement[];
export interface Common { dur?: number; ease?: Ease; stagger?: number; /** false = no sound; an object overrides the default cue */ sound?: boolean | Record<string, unknown> }
export interface RiseOpts extends Common { from?: 'below' | 'above' | 'start' | 'end' | 'none'; dist?: number; blur?: number }
export interface ExitOpts extends Common { to?: 'above' | 'below' | 'zoom' | 'fade' }
export interface PopOpts extends Common { from?: number }
export interface TypeOpts { caret?: boolean; keys?: boolean | Record<string, unknown> }
export interface CountOpts { format?: (n: number) => string; decimals?: number; ease?: Ease; sound?: boolean | Record<string, unknown> }
export interface PressOpts { dur?: number; ring?: boolean; sound?: boolean | Record<string, unknown> }
export interface FlyOpts { scale?: number; blur?: number; ease?: Ease; sound?: boolean | Record<string, unknown> }
export interface MorphOpts { ease?: Ease; sound?: boolean | Record<string, unknown> }
export interface RevealOpts { style?: 'iris' | 'wipe' | 'rise' | 'fade'; dur?: number; lead?: number; sound?: boolean | Record<string, unknown> }
export interface Camera { push(a: number, b: number, o?: { scale?: number; x?: number; y?: number; ease?: Ease }): Camera; focus(target: HTMLElement, a: number, b: number, o?: { scale?: number; ease?: Ease }): Camera; reset(a: number, b: number, o?: { ease?: Ease }): Camera }

export interface Timeline {
  /** motion tokens for this film's fps: fast, base, slow, stagger (frames) */
  tokens: Tokens;
  rise(el: Els, at: number, o?: RiseOpts): Timeline;
  exit(el: Els, at: number, o?: ExitOpts): Timeline;
  pop(el: Els, at: number, o?: PopOpts): Timeline;
  type(el: HTMLElement, text: string, a: number, b: number, o?: TypeOpts): Timeline;
  count(el: HTMLElement, from: number, to: number, a: number, b: number, o?: CountOpts): Timeline;
  press(el: HTMLElement, at: number, o?: PressOpts): Timeline;
  fly(el: HTMLElement, to: HTMLElement | { x: number; y: number }, a: number, b: number, o?: FlyOpts): Timeline;
  morph(from: HTMLElement, to: HTMLElement, a: number, b: number, o?: MorphOpts): Timeline;
  reveal(el: HTMLElement, at: number, o?: RevealOpts): Timeline;
  /** show `el` (display) only from a to b */
  scene(el: HTMLElement, a: number, b: number): Timeline;
  /** a camera on a container: push in, focus on an element, reset. Use it on an element nothing else animates. */
  camera(stage: HTMLElement): Camera;
  /** your own per-frame drawing, still a pure function of f */
  on(fn: (f: number) => void): Timeline;
  /** a sound cue that is not tied to a primitive */
  cue(kind: string, f: number, o?: Record<string, unknown>): Timeline;
  draw(f: number): void;
  cues(): Cue[];
}
export interface KitContext { fps: number; rtl: boolean; lang: string; size(): { W: number; H: number } }

const asArr = (e: Els) => (Array.isArray(e) ? e : [e]);
const over = (s: boolean | Record<string, unknown> | undefined) => (s === false ? null : s === true || s === undefined ? {} : s);

/** measure an element even when a scene ancestor is display:none (so a pan or a fly can be planned before the first draw) */
function rectOf(el: HTMLElement): DOMRect {
  const fixed: Array<[HTMLElement, string]> = [];
  for (let x: HTMLElement | null = el; x && x !== document.body; x = x.parentElement) if (getComputedStyle(x).display === 'none') { fixed.push([x, x.style.display]); x.style.display = 'block'; }
  const r = el.getBoundingClientRect(); for (const [x, d] of fixed) x.style.display = d; return r;
}

export function createTimeline(ctx: KitContext): Timeline {
  const tk = tokens(ctx.fps), cues: Cue[] = [], fx: Array<(f: number) => void> = [];
  const state = new Map<HTMLElement, { base: string; acts: Array<{ a: number; b: number; fn: (p: number, f: number) => Pose }> }>();
  const cams = new Map<HTMLElement, Array<{ a: number; b: number; to: { s: number; cx: number; cy: number } | null; ease: Ease }>>();
  const sign = ctx.rtl ? -1 : 1, unit = () => { const { W, H } = ctx.size(); return Math.min(W, H) / 1080; };
  const panAt = (el: HTMLElement) => { const r = rectOf(el), { W } = ctx.size(); return r.width ? panOf(r.left + r.width / 2, W) : 0; };
  const add = (kind: string, f: number, o: Record<string, unknown> = {}) => { cues.push({ kind, f: Math.max(0, Math.round(f)), ...o } as Cue); };
  const act = (el: HTMLElement, a: number, b: number, fn: (p: number, f: number) => Pose) => {
    let s = state.get(el); if (!s) { s = { base: el.style.transform || '', acts: [] }; state.set(el, s); }
    s.acts.push({ a, b, fn });
  };
  const each = (els: Els, at: number, step: number, fn: (el: HTMLElement, a: number, i: number) => void) => asArr(els).forEach((el, i) => fn(el, at + i * step, i));

  const T: Timeline = {
    tokens: tk,
    rise(els, at, o = {}) {
      const dur = o.dur ?? tk.base, ease = o.ease ?? EASE.expoOut, step = o.stagger ?? tk.stagger, from = o.from ?? 'below', dist = (o.dist ?? tk.rise) * unit(), blur = o.blur ?? 8, snd = over(o.sound);
      const dx = from === 'start' ? -sign * dist : from === 'end' ? sign * dist : 0, dy = from === 'below' ? dist : from === 'above' ? -dist : 0;
      each(els, at, step, (el, a) => {
        act(el, a, a + dur, p => { const e = ease(p); return pose({ x: dx * (1 - e), y: dy * (1 - e), o: Math.min(1, p * 2.2), blur: (1 - e) * blur }); });
        if (snd) { const pan = panAt(el); add('swipe', a, { dur: .22, gain: .06, p0: pan - .1, p1: pan + .1, ...snd }); }
      }); return T;
    },
    exit(els, at, o = {}) {
      const dur = o.dur ?? tk.base, ease = o.ease ?? EASE.inQuad, step = o.stagger ?? 0, to = o.to ?? 'fade', dist = tk.rise * unit(), snd = over(o.sound);
      each(els, at, step, (el, a) => {
        act(el, a, a + dur, p => { const e = ease(p); return pose({ y: to === 'above' ? -dist * e : to === 'below' ? dist * e : 0, s: to === 'zoom' ? 1 + e * .18 : 1, blur: to === 'zoom' ? e * 12 : 0, o: 1 - e }); });
        if (snd) add('whoosh', a, { dur: .35, gain: .08, p0: -.2, p1: .2, ...snd });
      }); return T;
    },
    pop(els, at, o = {}) {
      const dur = o.dur ?? tk.base, ease = o.ease ?? EASE.backOut, step = o.stagger ?? tk.stagger, from = o.from ?? .6, snd = over(o.sound);
      each(els, at, step, (el, a, i) => {
        act(el, a, a + dur, p => pose({ s: from + (1 - from) * ease(p), o: Math.min(1, p * 3) }));
        if (snd) { const pan = panAt(el); add('tick', a, { gain: .07, freq: 1800 + i * 90, pan, ...snd }); add('thud', a, { gain: .08, pan, ...snd }); }
      }); return T;
    },
    type(el, text, a, b, o = {}) {
      const gs = [...new Intl.Segmenter(ctx.lang, { granularity: 'grapheme' }).segment(text)].map(x => x.segment), n = gs.length, half = Math.max(1, Math.round(ctx.fps / 2));
      fx.push(f => { const k = Math.floor(rng(f, a, b) * n); el.textContent = gs.slice(0, k).join('') + (o.caret && f >= a && (f >= b ? Math.floor((f - b) / half) % 2 === 0 : true) ? '▏' : ''); });
      const snd = over(o.keys === undefined ? true : o.keys), kp = snd ? panAt(el) * .5 : 0;
      if (snd) keyFrames(gs, a, b).forEach(({ f, space }, i) => add('key', f, { gain: .06, pan: kp, seed: i, ...(space ? { space: true } : {}), ...snd }));
      return T;
    },
    count(el, from, to, a, b, o = {}) {
      const ease = o.ease ?? EASE.out, fmt = o.format ?? ((n: number) => (o.decimals ? n.toFixed(o.decimals) : String(Math.round(n)))), snd = over(o.sound);
      fx.push(f => { el.textContent = fmt(from + (to - from) * ease(rng(f, a, b))); });
      if (snd) { const pan = panAt(el), n = Math.min(24, Math.max(6, Math.round((b - a) / 2))); tickFrames(a, b, n).forEach((f, i) => add('tick', f, { gain: .04 + .05 * (i / n), freq: 1500 + i * 60, pan, ...snd })); }
      return T;
    },
    press(el, at, o = {}) {
      const dur = o.dur ?? tk.fast, snd = over(o.sound);
      act(el, at, at + dur, p => pose({ s: 1 - .08 * Math.sin(Math.PI * p) }));
      if (o.ring !== false) {
        const ring = document.createElement('i'); ring.setAttribute('data-sf-bg', ''); ring.setAttribute('aria-hidden', 'true');
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        Object.assign(ring.style, { position: 'absolute', inset: '0', borderRadius: 'inherit', border: '3px solid currentColor', opacity: '0', pointerEvents: 'none' }); el.appendChild(ring);
        fx.push(f => { const p = rng(f, at, at + dur * 3); ring.style.opacity = p > 0 && p < 1 ? String(.6 * (1 - p)) : '0'; ring.style.transform = `scale(${1 + .5 * EASE.out(p)})`; });
      }
      if (snd) add('tick', at, { gain: .12, freq: 1500, pan: panAt(el), ...snd }); return T;
    },
    fly(el, to, a, b, o = {}) {
      const ease = o.ease ?? EASE.inOut, r0 = rectOf(el), c0 = { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
      let dx: number, dy: number, s1 = o.scale ?? 1, c1x: number;
      if ('x' in to && !(to instanceof HTMLElement)) { dx = to.x; dy = to.y; c1x = c0.x + dx; } else { const r1 = rectOf(to as HTMLElement); dx = r1.left + r1.width / 2 - c0.x; dy = r1.top + r1.height / 2 - c0.y; c1x = r1.left + r1.width / 2; if (o.scale === undefined && r0.width) s1 = r1.width / r0.width; }
      const blur = o.blur ?? 10, snd = over(o.sound), { W } = ctx.size();
      act(el, a, b, p => { const e = ease(p); return pose({ x: dx * e, y: dy * e, s: 1 + (s1 - 1) * e, blur: Math.sin(Math.PI * p) * blur }); });
      if (snd) add('whoosh', a, { dur: Math.max(.2, (b - a) / ctx.fps), gain: .14, p0: panOf(c0.x, W), p1: panOf(c1x, W), ...snd }); return T;
    },
    morph(from, to, a, b, o = {}) {
      const ease = o.ease ?? EASE.inOut, r0 = rectOf(from), r1 = rectOf(to), dx = r1.left + r1.width / 2 - (r0.left + r0.width / 2), dy = r1.top + r1.height / 2 - (r0.top + r0.height / 2);
      const kx = r0.width ? r1.width / r0.width : 1, ky = r0.height ? r1.height / r0.height : 1, snd = over(o.sound);
      act(from, a, b, p => { const e = ease(p); return pose({ x: dx * e, y: dy * e, sx: 1 + (kx - 1) * e, sy: 1 + (ky - 1) * e, o: 1 - rng(p, .35, .85) }); });
      act(to, a, b, p => { const e = ease(p); return pose({ x: -dx * (1 - e), y: -dy * (1 - e), sx: 1 + (1 / kx - 1) * (1 - e), sy: 1 + (1 / ky - 1) * (1 - e), o: rng(p, .15, .65) }); });
      if (snd) add('swipe', a, { dur: Math.max(.2, (b - a) / ctx.fps), gain: .08, p0: panAt(from), p1: panAt(to), ...snd }); return T;
    },
    reveal(el, at, o = {}) {
      const style = o.style ?? 'iris', dur = o.dur ?? Math.round(tk.slow * 1.3), snd = over(o.sound), rtl = ctx.rtl;
      act(el, at, at + dur, p => {
        const e = EASE.expoOut(p);
        if (style === 'iris') return pose({ clip: `circle(${(e * 75).toFixed(2)}% at 50% 50%)`, s: .94 + .06 * e, o: Math.min(1, p * 4) });
        if (style === 'wipe') return pose({ clip: rtl ? `inset(0 0 0 ${((1 - e) * 100).toFixed(2)}%)` : `inset(0 ${((1 - e) * 100).toFixed(2)}% 0 0)`, o: 1 });
        if (style === 'rise') return pose({ y: (1 - e) * 40 * unit(), o: Math.min(1, p * 2.5), blur: (1 - e) * 10 });
        return pose({ o: e });
      });
      if (snd) { if (o.lead) cues.push({ kind: 'silence', f: Math.max(0, at - o.lead), to: at } as Cue); add('impact', at, { gain: .9, tail: 3, ...snd }); }
      return T;
    },
    scene(el, a, b) { fx.push(f => { el.style.display = f >= a && f < b ? 'block' : 'none'; }); return T; },
    camera(stage) {
      const steps: Array<{ a: number; b: number; to: { s: number; cx: number; cy: number } | null; ease: Ease }> = []; cams.set(stage, steps); stage.style.transformOrigin = '0 0';
      const cam: Camera = {
        push(a, b, o = {}) { const { W, H } = ctx.size(); steps.push({ a, b, to: { s: o.scale ?? 1.12, cx: o.x ?? W / 2, cy: o.y ?? H / 2 }, ease: o.ease ?? EASE.inOut }); return cam; },
        focus(target, a, b, o = {}) { const r = rectOf(target); steps.push({ a, b, to: { s: o.scale ?? 1.4, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }, ease: o.ease ?? EASE.inOut }); return cam; },
        reset(a, b, o = {}) { steps.push({ a, b, to: null, ease: o.ease ?? EASE.inOut }); return cam; },
      }; return cam;
    },
    on(fn) { fx.push(fn); return T; },
    cue(kind, f, o = {}) { add(kind, f, o); return T; },
    draw(f) {
      for (const [el, s] of state) { let p = IDENTITY; for (const x of s.acts) p = combine(p, x.fn(rng(f, x.a, x.b), f)); const c = css(s.base, p); el.style.transform = c.transform; el.style.opacity = c.opacity; el.style.filter = c.filter; el.style.clipPath = c.clipPath; }
      for (const [stage, steps] of cams) {
        const { W, H } = ctx.size(); let cur = { s: 1, cx: W / 2, cy: H / 2 };
        for (const st of [...steps].sort((p, q) => p.a - q.a)) {
          const to = st.to ?? { s: 1, cx: W / 2, cy: H / 2 };
          if (f >= st.b) cur = to; else if (f > st.a) { const e = st.ease(rng(f, st.a, st.b)); cur = { s: cur.s + (to.s - cur.s) * e, cx: cur.cx + (to.cx - cur.cx) * e, cy: cur.cy + (to.cy - cur.cy) * e }; break; } else break;
        }
        stage.style.transform = `translate(${(W / 2 - cur.cx * cur.s).toFixed(2)}px,${(H / 2 - cur.cy * cur.s).toFixed(2)}px) scale(${cur.s.toFixed(4)})`;
      }
      for (const fn of fx) fn(f);
    },
    cues() { return [...cues].sort((a, b) => a.f - b.f); },
  };
  return T;
}

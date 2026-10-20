// Pure math for the motion kit (no DOM): motion tokens, pose composition, and where the sounds of each primitive land.
// Kept apart from kit.ts so it is unit-tested in Node.
export type Ease = (t: number) => number;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const rng = (f: number, a: number, b: number) => (b === a ? (f >= b ? 1 : 0) : clamp((f - a) / (b - a)));

/** house style, in frames at 30 fps; the kit scales it to the film's fps */
export const TOKENS30 = { fast: 8, base: 14, slow: 22, stagger: 5, rise: 26, overshoot: 1.7 };
export interface Tokens { fast: number; base: number; slow: number; stagger: number; rise: number; overshoot: number }
export const tokens = (fps: number): Tokens => { const k = fps / 30; return { fast: Math.round(TOKENS30.fast * k), base: Math.round(TOKENS30.base * k), slow: Math.round(TOKENS30.slow * k), stagger: Math.max(1, Math.round(TOKENS30.stagger * k)), rise: TOKENS30.rise, overshoot: TOKENS30.overshoot }; };

export const EASE = {
  expoOut: ((t: number) => { t = clamp(t); return t >= 1 ? 1 : (1 - Math.pow(2, -9 * t)) / (1 - Math.pow(2, -9)); }) as Ease,
  inQuad: ((t: number) => clamp(t) * clamp(t)) as Ease,
  backOut: ((t: number, c1 = TOKENS30.overshoot) => { t = clamp(t); const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }) as Ease,
  inOut: ((t: number) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }) as Ease,
  out: ((t: number) => 1 - Math.pow(1 - clamp(t), 3)) as Ease,
};

/** one element's look at one frame. Poses from every action on the element are combined with `combine`. */
export interface Pose { x: number; y: number; s: number; sx: number; sy: number; r: number; o: number; blur: number; clip?: string }
export const IDENTITY: Pose = { x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, o: 1, blur: 0 };
export const pose = (p: Partial<Pose> = {}): Pose => ({ ...IDENTITY, ...p });
/** translate adds, scale and opacity multiply, blur takes the larger, the last clip wins */
export const combine = (a: Pose, b: Pose): Pose => ({ x: a.x + b.x, y: a.y + b.y, s: a.s * b.s, sx: a.sx * b.sx, sy: a.sy * b.sy, r: a.r + b.r, o: a.o * b.o, blur: Math.max(a.blur, b.blur), clip: b.clip ?? a.clip });
export const css = (base: string, p: Pose): { transform: string; opacity: string; filter: string; clipPath: string } => ({
  transform: `${base} translate(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px) rotate(${p.r.toFixed(3)}deg) scale(${(p.s * p.sx).toFixed(4)},${(p.s * p.sy).toFixed(4)})`.trim(),
  opacity: String(Math.max(0, Math.min(1, +p.o.toFixed(4)))), filter: p.blur > .05 ? `blur(${p.blur.toFixed(2)}px)` : '', clipPath: p.clip || '',
});

/* ---------- where each primitive's sounds land (frames, film fps) ---------- */
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** a keystroke per grapheme at the frame it appears (+/- 1 frame of human jitter); spaces use the heavier key.
    Matches `typed()`: grapheme i shows once progress * n >= i + 1. Typing faster than ~11 keys a second is thinned, because a machine-gun of clicks is noise, not typing. */
export function keyFrames(text: string[], a: number, b: number, fps = 30): Array<{ f: number; space: boolean }> {
  const n = text.length, rate = n / Math.max(.1, (b - a) / fps), stride = Math.max(1, Math.ceil(rate / 11)), out: Array<{ f: number; space: boolean }> = [];
  text.forEach((ch, i) => { if (stride > 1 && i % stride !== stride - 1 && i !== n - 1) return; const f = Math.ceil(a + (b - a) * (i + 1) / n); out.push({ f: Math.min(b, Math.max(a, f + Math.round((hash(i) - .5) * 2))), space: /^\s+$/.test(ch) }); });
  return out;
}
/** a counter's ticks are close together at the start and slow towards the end, like an eased number roll */
export function tickFrames(a: number, b: number, n: number): number[] {
  const out: number[] = []; for (let k = 0; k < n; k++) out.push(Math.round(a + (b - a) * Math.pow((k + .5) / n, 1.35))); return [...new Set(out)];
}
/** pan -1..1 from a horizontal position, softened so a sound at the edge is still in the mix */
export const panOf = (cx: number, W: number, width = .7) => (W > 0 ? clamp((cx / W - .5) * 2 * width, -1, 1) : 0);

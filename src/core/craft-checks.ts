// Craft checks: pure functions that turn measurements (text sizes, content boxes, picture and audio series)
// into findings, a 0-100 score and a ranked fix list. No browser here, so they are unit-tested.
// `craft.ts` does the measuring. Thresholds are defaults; a film opts out of one check with a reason (see ALLOW below).
import type { TextBox, Box } from './probe';

export const DEFAULTS = {
  headlineMin: .045,         // largest text >= 4.5 % of the short side
  bodyMin: .022,             // every other text >= 2.2 % of the short side
  occupancyMin: .55,         // content covers >= 55 % of the safe area (mid scene)
  safeMargin: .05,
  heroRatio: 1.6,            // the largest text is >= 1.6x the next size
  sceneMin: 1.5, sceneMax: 6,   // seconds
  secPerWord: .25,           // reading time per word on screen
  stillMax: 1.2,             // seconds without meaningful picture change
  moveThreshold: .002,       // fraction of pixels that must change to count as motion
  entranceFrames30: 6,       // first visible change within 6 frames at 30 fps
  silenceMax: 1.5,           // seconds without sound
  cuesPerSecond: 1,
  loudnessTolerance: 1.5,    // LU around the film's loudness target
  truePeakMax: -.5,          // dBTP; the mastering ceiling is -1 and the limiter overshoots by up to ~0.5
};
export type Thresholds = typeof DEFAULTS;

export type CheckId = 'readability' | 'occupancy' | 'hierarchy' | 'motion' | 'entrance' | 'transition' | 'pacing' | 'silence' | 'sync' | 'loudness';
export const CHECKS: Record<CheckId, { label: string; weight: number; scope: 'picture' | 'sound' }> = {
  readability: { label: 'Readability', weight: 12, scope: 'picture' },
  occupancy: { label: 'Occupancy', weight: 12, scope: 'picture' },
  hierarchy: { label: 'Hierarchy', weight: 8, scope: 'picture' },
  motion: { label: 'Motion presence', weight: 14, scope: 'picture' },
  entrance: { label: 'Entrances', weight: 6, scope: 'picture' },
  transition: { label: 'Transitions', weight: 10, scope: 'picture' },
  pacing: { label: 'Pacing', weight: 8, scope: 'picture' },
  silence: { label: 'Sound coverage', weight: 12, scope: 'sound' },
  sync: { label: 'Sound sync', weight: 10, scope: 'sound' },
  loudness: { label: 'Loudness', weight: 8, scope: 'sound' },
};

export interface Finding { check: CheckId; message: string; at?: number; scene?: string }
export interface Allowance { check: CheckId; where: string; reason: string }
export interface CheckResult { check: CheckId; units: number; bad: number; findings: Finding[] }
export interface SceneProbe { id: string; name: string; t0: number; t1: number; text: TextBox[]; boxes: Box[]; allow: Allowance[] }

/* ----- allow: "check: reason; check2: reason" on an element (data-sf-allow) or in scene.allow ----- */
export function parseAllow(raw: string | string[] | undefined, where: string): { ok: Allowance[]; problems: string[] } {
  const ok: Allowance[] = [], problems: string[] = [];
  for (const part of (Array.isArray(raw) ? raw : String(raw || '').split(';')).map(x => x.trim()).filter(Boolean)) {
    const i = part.indexOf(':'), id = (i < 0 ? part : part.slice(0, i)).trim() as CheckId, reason = i < 0 ? '' : part.slice(i + 1).trim();
    if (!(id in CHECKS)) problems.push(`${where}: unknown check "${id}" in allow`);
    else if (reason.length < 4) problems.push(`${where}: allow "${id}" needs a reason (e.g. "${id}: logo end card")`);
    else ok.push({ check: id, where, reason });
  }
  return { ok, problems };
}
const allowed = (s: SceneProbe, id: CheckId) => s.allow.some(a => a.check === id);
const textAllowed = (t: TextBox, id: CheckId) => t.allow.some(a => a.split(';').some(p => p.trim().startsWith(id + ':') && p.slice(p.indexOf(':') + 1).trim().length >= 4));
const fmt = (s: number) => s.toFixed(1) + ' s';
const px = (n: number) => Math.round(n) + ' px';
const real = (s: SceneProbe) => s.text.filter(t => !t.ticker && /[\p{L}\p{N}]/u.test(t.text));   // ticker and symbols (✓, ›) are not copy

/* ----- picture, per scene (DOM) ----- */
export function checkReadability(scenes: SceneProbe[], short: number, T: Thresholds = DEFAULTS): CheckResult {
  const r: CheckResult = { check: 'readability', units: 0, bad: 0, findings: [] };
  for (const s of scenes) {
    const items = real(s).filter(t => !textAllowed(t, 'readability')); if (!items.length || allowed(s, 'readability')) continue; r.units++;
    const top = Math.max(...items.map(t => t.size)), hMin = T.headlineMin * short, bMin = T.bodyMin * short;
    const small = items.filter(t => t.size < top - .5 && t.size < bMin);
    let bad = false;
    if (top < hMin) { bad = true; r.findings.push({ check: 'readability', scene: s.id, at: s.t0, message: `Scene ${s.id}: the largest text is ${px(top)}; make the headline at least ${px(hMin)} (${(T.headlineMin * 100).toFixed(1)} % of the short side) or crop in.` }); }
    if (small.length) { bad = true; const m = Math.min(...small.map(t => t.size)); r.findings.push({ check: 'readability', scene: s.id, at: s.t0, message: `Scene ${s.id}: body text is ${px(m)} (“${small.find(t => t.size === m)!.text}”); make it at least ${px(bMin)} (${(T.bodyMin * 100).toFixed(1)} % of the short side) or crop in.` }); }
    if (bad) r.bad++;
  }
  return r;
}
/** share of the safe area spanned by the content (bounding box of everything that reads as content) */
export function extent(boxes: Box[], W: number, H: number, margin = DEFAULTS.safeMargin): number {
  const x0 = W * margin, y0 = H * margin, x1 = W * (1 - margin), y1 = H * (1 - margin), big = boxes;
  if (!big.length) return 0;
  const l = Math.max(x0, Math.min(...big.map(b => b.x))), t = Math.max(y0, Math.min(...big.map(b => b.y))), r = Math.min(x1, Math.max(...big.map(b => b.x + b.w))), d = Math.min(y1, Math.max(...big.map(b => b.y + b.h)));
  return Math.max(0, r - l) * Math.max(0, d - t) / ((x1 - x0) * (y1 - y0));
}
export function checkOccupancy(scenes: Array<SceneProbe & { coverage: number }>, T: Thresholds = DEFAULTS): CheckResult {
  const r: CheckResult = { check: 'occupancy', units: 0, bad: 0, findings: [] };
  for (const s of scenes) {
    if (allowed(s, 'occupancy')) continue; r.units++;
    if (s.coverage < T.occupancyMin) { r.bad++; r.findings.push({ check: 'occupancy', scene: s.id, at: s.t0, message: `Scene ${s.id}: content spans ${Math.round(s.coverage * 100)} % of the safe area (aim for ${Math.round(T.occupancyMin * 100)} % or more); scale the main element up or move the camera in.` }); }
  }
  return r;
}
export function checkHierarchy(scenes: SceneProbe[], T: Thresholds = DEFAULTS): CheckResult {
  const r: CheckResult = { check: 'hierarchy', units: 0, bad: 0, findings: [] };
  for (const s of scenes) {
    const items = real(s).filter(t => !textAllowed(t, 'hierarchy')); if (items.length < 2 || allowed(s, 'hierarchy')) continue; r.units++;
    const sizes = [...new Set(items.map(t => Math.round(t.size)))].sort((a, b) => b - a), s1 = sizes[0], s2 = sizes.find(v => v < s1 * .95);
    if (!s2) continue;   // one size tier (a headline set in spans) is dominant by itself
    if (s1 / s2 < T.heroRatio) { r.bad++; r.findings.push({ check: 'hierarchy', scene: s.id, at: s.t0, message: `Scene ${s.id}: the largest text (${px(s1)}) is only ${(s1 / s2).toFixed(2)}x the next size (${px(s2)}); aim for ${T.heroRatio}x so one element leads the eye.` }); }
  }
  return r;
}
export function checkPacing(scenes: SceneProbe[], fps: number, short: number, T: Thresholds = DEFAULTS): CheckResult {
  const r: CheckResult = { check: 'pacing', units: 0, bad: 0, findings: [] };
  for (const s of scenes) {
    if (allowed(s, 'pacing')) continue; r.units++;
    const len = (s.t1 - s.t0) / fps, words = real(s).filter(t => !textAllowed(t, 'pacing') && t.size >= T.bodyMin * short).reduce((n, t) => n + t.words, 0); let bad = false;   // text too small to read is flagged by readability, not counted here
    if (len < T.sceneMin) { bad = true; r.findings.push({ check: 'pacing', scene: s.id, at: s.t0, message: `Scene ${s.id} lasts ${fmt(len)}; scenes under ${T.sceneMin} s rarely register. Merge it or give it ${T.sceneMin} s or more.` }); }
    else if (len > T.sceneMax) { bad = true; r.findings.push({ check: 'pacing', scene: s.id, at: s.t0, message: `Scene ${s.id} lasts ${fmt(len)}; over ${T.sceneMax} s drags. Split it or add a second beat.` }); }
    if (words * T.secPerWord > len) { bad = true; r.findings.push({ check: 'pacing', scene: s.id, at: s.t0, message: `Scene ${s.id} shows about ${Math.round(words)} words for ${fmt(len)}; viewers need about ${fmt(words * T.secPerWord)}. Cut words or lengthen the scene.` }); }
    if (bad) r.bad++;
  }
  return r;
}

/* ----- picture, over time (pixels) ----- */
export interface PictureSeries {
  fps: number; step: number;            // samples are `step` frames apart, starting at frame 0 of the output timeline
  lag: number[];                        // change vs the sample ~0.25 s earlier (fraction of pixels)
  adj: number[];                        // change vs the previous sample
  lum: number[];                        // mean luminance 0..1
  fromStart: number[];                  // change vs the first frame of the scene this sample is in
}
export function checkMotion(series: PictureSeries, scenes: SceneProbe[], T: Thresholds = DEFAULTS): CheckResult {
  const r: CheckResult = { check: 'motion', units: 0, bad: 0, findings: [] }, { fps, step, lag } = series, lagS = .25;
  const inAllowed = (f: number) => scenes.some(s => f >= s.t0 && f < s.t1 && allowed(s, 'motion'));
  const n = lag.length; let run = -1;
  const windows = Math.max(1, Math.round((n * step / fps) / T.stillMax)); r.units = windows;
  const flush = (end: number) => { if (run < 0) return; const t0 = run * step / fps - lagS, t1 = end * step / fps, dur = t1 - run * step / fps + lagS; if (dur > T.stillMax && !inAllowed(run * step)) { r.bad++; r.findings.push({ check: 'motion', at: Math.max(0, t0), message: `Nothing moves for ${fmt(dur)} starting at ${fmt(Math.max(0, t0))}; add a camera push, a follow-through or a second beat (or mark a deliberate hold with allow).` }); } run = -1; };
  for (let i = 0; i < n; i++) { if (lag[i] < T.moveThreshold) { if (run < 0) run = i; } else flush(i); }
  flush(n);
  r.bad = Math.min(r.bad, r.units);
  return r;
}
export function checkEntrances(series: PictureSeries, scenes: SceneProbe[], T: Thresholds = DEFAULTS): CheckResult {
  const r: CheckResult = { check: 'entrance', units: 0, bad: 0, findings: [] }, { fps, step, fromStart } = series, limit = T.entranceFrames30 * fps / 30;
  for (const s of scenes) {
    if (allowed(s, 'entrance')) continue; r.units++;
    let first = -1; for (let f = s.t0; f < s.t1; f += step) { const i = Math.round(f / step); if (i < fromStart.length && fromStart[i] > T.moveThreshold) { first = f; break; } }
    const delay = first < 0 ? s.t1 - s.t0 : first - s.t0;
    if (delay > limit + step) { r.bad++; r.findings.push({ check: 'entrance', scene: s.id, at: s.t0 / fps, message: `Scene ${s.id} starts static for ${(delay / fps).toFixed(1)} s; something should move within ${Math.round(limit)} frames of the cut.` }); }
  }
  return r;
}
export function checkTransitions(series: PictureSeries, scenes: SceneProbe[], T: Thresholds = DEFAULTS): CheckResult {
  const r: CheckResult = { check: 'transition', units: 0, bad: 0, findings: [] }, { fps, step, adj, lum } = series, reach = Math.round(8 * fps / 30);
  for (let k = 1; k < scenes.length; k++) {
    const cut = scenes[k].t0; if (allowed(scenes[k - 1], 'transition') || allowed(scenes[k], 'transition')) continue; r.units++;
    const peak = (a: number, b: number) => { let m = 0; for (let f = a; f <= b; f += step) { const i = Math.round(f / step); if (i >= 0 && i < adj.length) m = Math.max(m, adj[i]); } return m; };
    const before = peak(cut - reach, cut - step - 1), after = peak(cut + step + 1, cut + reach), ci = Math.round(cut / step);
    const around = (d: number) => lum[Math.max(0, Math.min(lum.length - 1, ci + d))] ?? 0, dip = around(0) < .08 && around(-Math.round(6 / step)) > .2 && around(Math.round(6 / step)) > .2;
    if (dip) { r.bad++; r.findings.push({ check: 'transition', at: cut / fps, scene: scenes[k].id, message: `Cut at ${fmt(cut / fps)} (into ${scenes[k].id}) dips to black; use a morph, push or wipe instead of a fade through black.` }); }
    else if (before < T.moveThreshold || after < T.moveThreshold) { r.bad++; r.findings.push({ check: 'transition', at: cut / fps, scene: scenes[k].id, message: `Cut at ${fmt(cut / fps)} (into ${scenes[k].id}) has no motion ${before < T.moveThreshold ? 'before' : 'after'} it; carry movement across the cut (overlap the exit and the entrance).` }); }
  }
  return r;
}

/* ----- sound ----- */
export interface SoundStats { seconds: number; silences: Array<[number, number]>; lufs: number; truePeak: number; target: number; cueCount: number; pauses: Array<[number, number]>; hasCues: boolean }
export function checkSilence(a: SoundStats, scenes: SceneProbe[], fps: number, T: Thresholds = DEFAULTS): CheckResult {
  const r: CheckResult = { check: 'silence', units: Math.max(1, Math.round(a.seconds / T.silenceMax)), bad: 0, findings: [] };
  if (!a.hasCues) { r.bad = r.units; r.findings.push({ check: 'silence', message: 'The film declares no sound cues; add cues on the frames you animate on (SF.cues()).' }); return r; }
  const covered = (s: number, e: number) => a.pauses.some(([p0, p1]) => p0 <= s + .2 && p1 >= e - .2) || scenes.some(sc => allowed(sc, 'silence') && s >= sc.t0 / fps - .2 && e <= sc.t1 / fps + .2);
  const gaps = a.silences.filter(([s, e]) => e - s > T.silenceMax && !covered(s, e));
  for (const [s, e] of gaps) { r.bad += Math.max(1, Math.round((e - s) / T.silenceMax)); r.findings.push({ check: 'silence', at: s, message: `No sound from ${fmt(s)} to ${fmt(e)}; add cues for what moves there, or mark a deliberate pause with a silence cue.` }); }
  const per = a.cueCount / Math.max(1, a.seconds);
  if (per < T.cuesPerSecond) { r.bad += 1; r.findings.push({ check: 'silence', message: `${a.cueCount} cues in ${fmt(a.seconds)} (${per.toFixed(2)} per second); aim for at least ${T.cuesPerSecond} per second on average.` }); r.units += 1; }
  r.bad = Math.min(r.bad, r.units);
  return r;
}
export function checkLoudness(a: SoundStats, T: Thresholds = DEFAULTS): CheckResult {
  const r: CheckResult = { check: 'loudness', units: 2, bad: 0, findings: [] };
  if (!Number.isFinite(a.lufs)) { r.bad = 2; r.findings.push({ check: 'loudness', message: 'The mix is silent or could not be measured.' }); return r; }
  const d = a.lufs - a.target;
  if (Math.abs(d) > T.loudnessTolerance) { r.bad++; r.findings.push({ check: 'loudness', message: `Mix is ${a.lufs.toFixed(1)} LUFS, ${Math.abs(d).toFixed(1)} LU ${d < 0 ? 'under' : 'over'} the ${a.target} LUFS target; ${d < 0 ? 'the score is too sparse or peaky to reach it: add sustained beds and lift quiet cues' : 'lower the loudest hits'}.` }); }
  if (a.truePeak > T.truePeakMax) { r.bad++; r.findings.push({ check: 'loudness', message: `True peak is ${a.truePeak.toFixed(1)} dBTP; keep it under -1 dBTP (the limiter should leave headroom).` }); }
  return r;
}

/* ----- score ----- */
export interface CraftReport {
  score: number; categories: Array<{ check: CheckId; label: string; weight: number; score: number | null; units: number; bad: number }>;
  fixes: Finding[]; allowances: Allowance[]; allowancePenalty: number; notMeasured: string[]; problems: string[];
}
export const ALLOW_COST = 1.5, ALLOW_CAP = 10;
export function buildReport(results: CheckResult[], allowances: Allowance[], problems: string[] = [], notMeasured: string[] = []): CraftReport {
  const cats = results.map(x => ({ check: x.check, label: CHECKS[x.check].label, weight: CHECKS[x.check].weight, score: x.units ? Math.round(100 * (1 - Math.min(1, x.bad / x.units))) : null, units: x.units, bad: x.bad }));
  const live = cats.filter(c => c.score !== null), wsum = live.reduce((n, c) => n + c.weight, 0);
  const base = wsum ? live.reduce((n, c) => n + c.weight * (c.score as number), 0) / wsum : 0;
  const penalty = Math.min(ALLOW_CAP, allowances.length * ALLOW_COST);
  const impact = (f: Finding) => { const c = cats.find(x => x.check === f.check); return c && c.units ? c.weight / c.units : 0; };
  const fixes = results.flatMap(x => x.findings).sort((a, b) => impact(b) - impact(a) || (a.at ?? 0) - (b.at ?? 0));
  return { score: Math.max(0, Math.round(base - penalty)), categories: cats, fixes, allowances, allowancePenalty: penalty, notMeasured, problems };
}

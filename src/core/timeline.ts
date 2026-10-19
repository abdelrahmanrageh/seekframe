/* Shared by the editor (browser bundle) and the renderer (node).
   A project's `clips` are an ordered list of scene excerpts; each plays for `frames` (film-fps frames) and shows
   the source range [in, out) of its scene, time-scaled to fit. The film itself never knows about any of this:
   the editor just calls film.seek(sourceFrame). */
import type { BuiltTimeline, Clip, Manifest, NormalizedClip, NormalizedProject, ProjectInput, TimelineClip } from '../types';

export const MIN_FRAMES = 3;

/** default project clips: every scene once, at its natural length */
export function defaultClips(manifest: Manifest): Clip[] {
  return manifest.scenes.map((s, i) => ({ id: 'c' + (i + 1), scene: s.id, frames: s.end - s.start }));
}

/** normalise a project against a manifest (drops clips of unknown scenes, fills defaults) */
export function normalize(manifest: Manifest, project?: ProjectInput | null): NormalizedProject {
  const p: any = Object.assign({ version: 1, params: {}, clips: null, audio: { tracks: {}, custom: [] }, output: {} }, project || {});
  p.params = p.params || {}; p.audio = Object.assign({ tracks: {}, custom: [] }, p.audio || {}); p.output = p.output || {};
  const byId = Object.fromEntries(manifest.scenes.map(s => [s.id, s]));
  let clips: Clip[] = (p.clips && p.clips.length ? p.clips : defaultClips(manifest)).filter((c: Clip) => byId[c.scene]);
  if (!clips.length) clips = defaultClips(manifest);
  const used = new Set<string>();
  p.clips = clips.map((c, i): NormalizedClip => {
    let id = c.id || 'c' + (i + 1); while (used.has(id)) id += '_'; used.add(id);
    const sc = byId[c.scene];
    const inF = c.in == null ? sc.start : Math.max(sc.start, Math.min(sc.end - 1, c.in));
    const outF = c.out == null ? sc.end : Math.max(inF + 1, Math.min(sc.end, c.out));
    return Object.assign({}, c, { id, in: inF, out: outF, frames: Math.max(MIN_FRAMES, Math.round(c.frames || (outF - inF))) });
  });
  return p;
}

/** compute clip positions on the edited timeline */
export function build(manifest: Manifest, project?: ProjectInput | null): BuiltTimeline {
  const p = normalize(manifest, project); let t = 0;
  const clips: TimelineClip[] = p.clips.map((c: NormalizedClip, i: number) => { const frames = c.frames, sourceIn = c.in, sourceOut = c.out; const o: TimelineClip = { i, id: c.id, scene: c.scene, in: sourceIn, out: sourceOut, t0: t, t1: t + frames, rate: (sourceOut - sourceIn) / frames }; t += frames; return o; });
  return { project: p, clips, total: t };
}

export function clipAt(tl: BuiltTimeline, f: number): TimelineClip {
  for (const c of tl.clips) if (f < c.t1) return c;
  return tl.clips[tl.clips.length - 1];
}
/** edited-timeline frame -> source frame in the film (and playback rate of that spot) */
export function sourceFrame(tl: BuiltTimeline, f: number): { src: number; clip: TimelineClip; rate: number } {
  const c = clipAt(tl, f);
  const lf = Math.max(0, Math.min(c.t1 - c.t0, f - c.t0));
  return { src: c.in + lf * c.rate, clip: c, rate: c.rate };
}

/** source frame -> first edited-timeline frame that shows it (null if the edit cut it out) */
export function timelineFrame(tl: BuiltTimeline, src: number): number | null {
  for (const c of tl.clips) if (src >= c.in && src < c.out) return Math.round(c.t0 + (src - c.in) / c.rate);
  return null;
}

/** atempo chain for any factor in [0.25, 4] (a single atempo only does 0.5-2 in older ffmpeg builds) */
export function tempoChain(r: number): string {
  const parts: string[] = []; r = Math.max(0.25, Math.min(4, r));
  while (r > 2) { parts.push('atempo=2'); r /= 2; }
  while (r < 0.5) { parts.push('atempo=0.5'); r /= 0.5; }
  parts.push('atempo=' + r.toFixed(5)); return parts.join(',');
}

export interface AudioInput { index: number; track: { sync?: string; volume?: number; offset?: number } }
/** ffmpeg filter_complex for the enabled audio tracks (inputs numbered from 1; input 0 is the video) */
export function audioFilter(tl: BuiltTimeline, fps: number, inputs: AudioInput[]): string {
  const total = tl.total / fps, chains: string[] = [], outs: string[] = [];
  inputs.forEach(({ index, track }, k) => {
    const vol = (track.volume == null ? 1 : track.volume).toFixed(3), fmt = `[${index}:a]aformat=sample_rates=48000:channel_layouts=stereo,`;
    if (track.sync === 'free') {
      const off = Math.max(0, Math.round((track.offset || 0) * 1000));
      chains.push(`${fmt}${off ? `adelay=${off}|${off},` : ''}apad,atrim=0:${total.toFixed(4)},volume=${vol}[t${k}]`);
    } else {
      const segs = tl.clips.map((c, i) => {
        const dur = (c.t1 - c.t0) / fps, a = c.in / fps, b = c.out / fps;
        chains.push(`${fmt}atrim=${a.toFixed(4)}:${b.toFixed(4)},asetpts=PTS-STARTPTS,${tempoChain(c.rate)},apad,atrim=0:${dur.toFixed(4)}[t${k}_${i}]`);
        return `[t${k}_${i}]`;
      });
      chains.push(`${segs.join('')}concat=n=${segs.length}:v=0:a=1,volume=${vol}[t${k}]`);
    }
    outs.push(`[t${k}]`);
  });
  if (outs.length === 1) chains.push(`${outs[0]}anull[aout]`);
  else chains.push(`${outs.join('')}amix=inputs=${outs.length}:normalize=0:duration=longest[aout]`);
  return chains.join(';');
}

/** push project params into a film window: css-variable params first, then the film's own applyParams */
export function applyToFilm(win: any, params?: Record<string, unknown>): Manifest {
  const m: Manifest = win.manifest || {}; params = params || {};
  for (const p of m.params || []) {
    const v = params[p.id] == null ? p.default : params[p.id];
    if (p.cssVar && v != null) win.document.documentElement.style.setProperty(p.cssVar, String(v) + (p.type === 'number' && p.unit ? p.unit : ''));
  }
  if (typeof win.applyParams === 'function') win.applyParams(Object.assign({}, params));
  return win.manifest;
}

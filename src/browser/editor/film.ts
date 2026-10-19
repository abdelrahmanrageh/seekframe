// The film controller: mounts the film page in the preview iframe, applies params, maps the edited timeline to source frames, plays.
import * as Timeline from '../../core/timeline';
import { api } from './api';
import { $, $$, clamp, debounce, fmtTime, toast } from './dom';
import { S, bus, filmBase, type FilmWindow } from './state';
import * as History from './history';
import { t } from './i18n';
import { syncAudio, stopAudio, startAudio } from './playback';

const iframe = () => $<HTMLIFrameElement>('#film');

/* ---------- project persistence ---------- */
/** what gets stored: no values that equal the film's defaults */
export function stripped(): any {
  const p = JSON.parse(JSON.stringify(S.project));
  const byId = Object.fromEntries(S.manifest.scenes.map(s => [s.id, s]));
  const dflt = Object.fromEntries((S.manifest.params || []).map(x => [x.id, x.default]));
  Object.keys(p.params).forEach(k => { if (p.params[k] === dflt[k]) delete p.params[k]; });
  p.clips.forEach((c: any) => { const s = byId[c.scene]; if (c.in === s.start) delete c.in; if (c.out === s.end) delete c.out; delete c.id; });
  const sc = S.manifest.scenes;                                          // untouched scene list: store nothing, so opening a version never rewrites its file
  if (p.clips.length === sc.length && p.clips.every((c: any, i: number) => c.scene === sc[i].id && c.frames === sc[i].end - sc[i].start && c.in === undefined && c.out === undefined)) delete p.clips;
  if (!Object.keys(p.audio.tracks).length && !p.audio.custom.length) delete p.audio;
  if (!Object.keys(p.output).length) delete p.output;
  return p;
}
let saveTimer = 0;
const setSaved = (msg: string) => { bus.emit('saved', msg); };
export function saveSoon(): void {
  setSaved(t('unsaved')); clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveNow, 500);
}
export async function saveNow(): Promise<void> {
  clearTimeout(saveTimer);
  try { await api.putProject(S.filmId, S.version, stripped()); setSaved(`${t('saved')} · ${S.version}`); } catch (e: any) { setSaved(t('saveFailed')); toast(e.message || t('saveFailed'), 'err'); }
}
const pushHistory = debounce(() => History.push(JSON.stringify(stripped())), 400);
/** call after every user edit: schedules the save and an undo step */
export function changed(): void { saveSoon(); pushHistory(); }

/* ---------- mounting ---------- */
export async function mountFilm(size?: string | null): Promise<void> {
  const f = iframe();
  const load = async () => {
    f.src = filmBase() + 'film.html'; await new Promise<void>(r => { f.onload = () => r(); });
    await new Promise<void>(r => { const h = setInterval(() => { try { if ((f.contentWindow as any).ready) { clearInterval(h); r(); } } catch { /* not ready */ } }, 40); });
    S.film = f.contentWindow as FilmWindow; await S.film.ready;
  };
  await load();
  const m = S.film.manifest, [w, h] = size ? size.split('x').map(Number) : [m.width, m.height];
  f.style.width = w + 'px'; f.style.height = h + 'px'; f.dataset.w = String(w); f.dataset.h = String(h);
  if (size) { await load(); f.style.width = w + 'px'; f.style.height = h + 'px'; }   // reload so a responsive film lays itself out at the new size
  fit();
}
export function fit(): void {
  const f = iframe(); if (!f || !f.dataset.w || !f.dataset.h) return;
  const wrap = $('#stageWrap'), W = +f.dataset.w, H = +f.dataset.h, pad = 24;
  const s = Math.min((wrap.clientWidth - pad * 2) / W, (wrap.clientHeight - pad * 2) / H);
  const box = $('#frameBox'); box.style.width = W * s + 'px'; box.style.height = H * s + 'px'; f.style.transform = `scale(${s})`;
}
addEventListener('resize', fit);

/* ---------- applying edits ---------- */
let paramSig = '';
/** params/audio changed -> push into the film (debounced), then redraw the current frame */
export const applySoon = (() => { let h = 0; return () => { clearTimeout(h); h = window.setTimeout(() => { pause(); apply(); }, 250); }; })();
export function apply(o: { panels?: boolean } = {}): void {
  Timeline.applyToFilm(S.film, S.project.params);
  S.manifest = S.film.manifest;
  const sig = (S.manifest.params || []).map(p => p.id).join('|');          // a film may expose different options depending on other options
  if (sig !== paramSig) { paramSig = sig; o = { ...o, panels: true }; }
  retime(o);
  if (o.panels) bus.emit('panels');
  bus.emit('project');
}
/** timeline-only change (durations, order, trims): no need to touch the film */
export function retime(o: { panels?: boolean } = {}): void {
  S.tl = Timeline.build(S.manifest, S.project); S.project = S.tl.project;
  bus.emit('timeline', !!o.panels);
  seek(Math.min(S.frame, S.tl.total - 1));
}
/** replace the project (undo, restore, reset, preset) */
export function replaceProject(p: any): void { S.project = Timeline.normalize(S.manifest, p); apply({ panels: true }); }
History.registerRestore(json => { replaceProject(JSON.parse(json)); saveSoon(); });

/* ---------- transport ---------- */
export function seek(f: number): void {
  S.frame = clamp(f, 0, S.tl.total - 1);
  const { src, clip } = Timeline.sourceFrame(S.tl, S.frame);
  S.film.seek(src);
  bus.emit('frame', S.frame, clip.i);
}
let raf = 0;
export function play(): void {
  if (S.playing) return; S.playing = true; bus.emit('playing', true);
  if (S.frame >= S.tl.total - 1) S.frame = 0;
  const t0 = performance.now(), f0 = S.frame; startAudio();
  const loop = (now: number) => {
    if (!S.playing) return;
    const f = f0 + (now - t0) / 1000 * S.fps;
    if (f >= S.tl.total - 1) { seek(S.tl.total - 1); pause(); return; }
    seek(f); syncAudio(); raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
export function pause(): void { if (!S.playing && !raf) return; S.playing = false; cancelAnimationFrame(raf); raf = 0; stopAudio(); bus.emit('playing', false); }
export const toggle = () => (S.playing ? pause() : play());
export const timeLabel = (f: number) => fmtTime(f, S.fps);
export const sceneName = (id: string): string => (S.manifest.scenes.find(s => s.id === id) || { name: id }).name;
export function gotoClip(i: number): void { const c = S.tl.clips[clamp(i, 0, S.tl.clips.length - 1)]; pause(); seek(c.t0 + 1); }
export { $$ };

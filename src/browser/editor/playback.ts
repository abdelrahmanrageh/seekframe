// Preview audio: file tracks, the generated score (rendered by the server from the film's cues), and the waveform source.
import * as Timeline from '../../core/timeline';
import { api } from './api';
import { clamp } from './dom';
import { S, bus, filmBase } from './state';
import { stripped } from './film';

export interface TrackView { id: string; label?: string; src?: string; generated?: string; sync?: string; group?: string; custom: boolean; enabled: boolean; volume: number; offset?: number }
interface Live { el: HTMLAudioElement; t: TrackView & { url?: string } }
const live: Live[] = [];

export function allTracks(): TrackView[] {
  const m = (S.manifest.audio || []).map(t => { const s = S.project.audio.tracks[t.id] || {}; return { ...t, custom: false, enabled: s.enabled == null ? !!t.default : s.enabled, volume: s.volume == null ? (t.volume == null ? 1 : t.volume) : s.volume } as TrackView; });
  const c = S.project.audio.custom.map(t => ({ ...t, custom: true, enabled: t.enabled !== false, volume: t.volume == null ? 1 : t.volume }) as TrackView);
  return [...m, ...c];
}
let scoreKey = '', scoreUrl: string | null = null, scoreTimer = 0;
async function fetchScore(): Promise<string | null> {          // the generated score depends on the film's cues, so regenerate when they change
  const key = JSON.stringify([S.manifest.cues, S.manifest.soundtrack]);
  if (key === scoreKey) return scoreUrl; scoreKey = key; scoreUrl = null;
  try { scoreUrl = (await api.score(S.filmId, stripped())).url; } catch { scoreUrl = null; }
  return scoreUrl;
}
const trackUrl = (t: TrackView) => new URL(t.src!, location.origin + filmBase() + 'film.html').pathname;

/** (re)create the audio elements for the enabled tracks */
export function buildAudioEls(): void {
  const was = S.playing; live.forEach(a => { a.el.pause(); a.el.removeAttribute('src'); }); live.length = 0;
  allTracks().filter(t => t.enabled && t.src && !t.generated).forEach(t => {
    const a = new Audio(trackUrl(t)); a.preload = 'auto'; a.volume = clamp(t.volume, 0, 1); live.push({ el: a, t: { ...t, url: trackUrl(t) } });
  });
  bus.emit('tracks');
  const gen = allTracks().find(t => t.enabled && t.generated);
  if (gen) {
    clearTimeout(scoreTimer);
    scoreTimer = window.setTimeout(async () => {
      const url = await fetchScore(); if (!url || !allTracks().find(t => t.enabled && t.generated)) return;
      for (let i = live.length - 1; i >= 0; i--) if (live[i].t.generated) live.splice(i, 1);
      const a = new Audio(url); a.preload = 'auto'; a.volume = clamp(gen.volume, 0, 1); live.push({ el: a, t: { ...gen, sync: 'timeline', url } });
      bus.emit('tracks'); if (S.playing) syncAudio(true);
    }, 400);
  }
  if (was) syncAudio(true);
}
export function setTrackVolume(id: string, v: number): void { live.forEach(a => { if (a.t.id === id) a.el.volume = clamp(v, 0, 1); }); }
/** the track the timeline draws a waveform for: the first enabled one (generated score first) */
export function waveSource(): { url: string; sync: string; offset: number } | null {
  const l = live.find(a => a.t.generated) || live[0]; return l ? { url: l.t.url || l.el.src, sync: l.t.sync || 'timeline', offset: l.t.offset || 0 } : null;
}
export function startAudio(): void { syncAudio(true); }
export function stopAudio(): void { live.forEach(a => a.el.pause()); }
export function syncAudio(force = false): void {
  if (!S.playing) return;
  const { src, rate } = Timeline.sourceFrame(S.tl, S.frame);
  live.forEach(({ el: a, t }) => {
    const free = t.sync === 'free', target = free ? S.frame / S.fps - (t.offset || 0) : src / S.fps;
    if (target < 0) { a.pause(); return; }
    if (a.paused) a.play().catch(() => { /* autoplay blocked until the first click */ });
    a.playbackRate = clamp(free ? 1 : rate, 0.25, 4);
    if (force || Math.abs(a.currentTime - target) > 0.2) a.currentTime = target;
  });
}

import type { BuiltTimeline, Manifest, NormalizedProject } from '../../types';

/** The film page inside the preview iframe (it follows the film contract). */
export interface FilmWindow extends Window { seek(f: number): void; manifest: Manifest; applyParams?: (v: Record<string, unknown>) => void; ready: Promise<boolean> }

export interface State {
  filmId: string; filmRoot: string; version: string; film: FilmWindow; manifest: Manifest; project: NormalizedProject; tl: BuiltTimeline;
  fps: number; frame: number; playing: boolean;
}
export const S = {} as State;
S.frame = 0; S.playing = false; S.fps = 30;

type Handler = (...args: any[]) => void;
const handlers = new Map<string, Handler[]>();
/** tiny event bus so panels don't import each other: 'frame' | 'timeline' | 'project' | 'panels' | 'tracks' | 'saved' */
export const bus = {
  on(evt: string, fn: Handler): void { (handlers.get(evt) || handlers.set(evt, []).get(evt)!).push(fn); },
  emit(evt: string, ...a: unknown[]): void { (handlers.get(evt) || []).forEach(fn => fn(...a)); },
};
export const filmBase = (): string => `/${S.filmRoot}/${S.filmId}/`;

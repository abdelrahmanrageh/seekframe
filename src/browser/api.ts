// The public API of the Seekframe runtime (window.SF). Film authors get these types through
// dist/types/browser/film-globals.d.ts (referenced by `seekframe new` films with // @ts-check).
import type { AudioTrack, Cue, LogoStrokes, Manifest, Param, ParamValue, Scene, SizeOption, Variants } from '../types';

export type Ease = (t: number) => number;
export type Keyframe = [frame: number, value: number, ease?: Ease];
export interface Layout { W: number; H: number; aspect: '16x9' | '9x16' | '1x1' | 'wide' | 'tall'; unit: number; portrait: boolean; safe: { x: number; y: number } }
export type CueOptions = Record<string, unknown>;
/** `c.boom(42, {gain: .6})`, `c.slide(106, 141, {p0: -1})`; read the result from `c.list`. Kinds: docs/SOUND.md */
export type CueBuilder = { list: Cue[] } & Record<string, (frame: number, toOrOptions?: number | CueOptions, options?: CueOptions) => Cue[]>;

export interface FilmSpec {
  title: string; width: number; height: number; fps?: number; duration: number; scenes: Scene[];
  /** editable options; may be a function of the current values when the list depends on other options */
  params?: Param[] | ((values: Record<string, ParamValue>) => Param[]);
  audio?: AudioTrack[] | ((values: Record<string, ParamValue>) => AudioTrack[]);
  /** sound events on the same frames you animate on */
  cues?: (values: Record<string, ParamValue>) => Cue[];
  soundtrack?: { theme?: string; loudness?: number }; variants?: Variants; sizes?: SizeOption[];
  /** (re)build the DOM for these param values */
  build(values: Record<string, ParamValue>): void;
  /** draw frame f (film fps units, may be fractional). MUST be a pure function of f. */
  seek(f: number): void;
}

export interface SFApi {
  clamp(x: number, a?: number, b?: number): number; lerp(a: number, b: number, t: number): number;
  /** progress 0..1 of f between a and b */ rng(f: number, a: number, b: number): number;
  E: Record<'lin' | 'out' | 'in' | 'out2' | 'in2' | 'io' | 'expo' | 'back', Ease>;
  kf(f: number, table: Keyframe[], ease?: Ease): number;
  /** seeded 0..1; use instead of Math.random */ hash(n: number): number; wob(seed: number, t: number, amp?: number): number;
  el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, parent?: Element | null, html?: string): HTMLElementTagNameMap[K];
  css<T extends HTMLElement | SVGElement>(e: T, styles: Record<string, string | number>): T;
  esc(s: unknown): string; place(e: HTMLElement, x: number, y: number, extra?: string): void;
  lang: { code: string; rtl: boolean }; X(x: number, W?: number): number; dirSign: 1 | -1;
  layout(): Layout;
  /** "Cash on [delivery.]" -> word spans; [..] is a highlighted keyword */ words(parent: Element, text: string, cls?: string): HTMLElement[];
  pop(words: HTMLElement[], f: number, start: number, step?: number, dur?: number, dy?: number): void;
  wipe(word: HTMLElement, t: number, base?: string): void; typed(text: string, f: number, a: number, b: number): string;
  dash(path: SVGPathElement, v: number): void;
  strokeLogo(parent: Element | null, data: LogoStrokes, o?: { width?: number; colors?: Record<number, string> }): { svg: SVGSVGElement; paths: SVGPathElement[] };
  fontsReady(): Promise<void>; brandParams(opts?: Partial<Param>): Param[];
  cues(): CueBuilder; define(spec: FilmSpec): Manifest; value<T extends ParamValue>(id: string, dflt: T): T;
}

// The data model shared by the film contract, the editor, the renderer, the CLI and the MCP server.
// `src/core/film.schema.json` is the JSON-Schema twin of `Manifest` (validated at runtime by `seekframe validate`).

export type ParamType = 'text' | 'number' | 'color' | 'boolean' | 'select' | 'image';
export type ParamValue = string | number | boolean;

export interface Param {
  id: string; type: ParamType; default: ParamValue;
  label?: string; help?: string; scene?: string; cssVar?: string;
  multiline?: boolean; maxLength?: number;                       // text
  min?: number; max?: number; step?: number; unit?: string;      // number
  options?: Array<string | { value: string; label?: string }>;   // select
}
export interface Scene { id: string; name: string; start: number; end: number }
export interface AudioTrack { id: string; label: string; src?: string; generated?: 'cues'; sync?: 'timeline' | 'free'; group?: string; default?: boolean; volume?: number }
export interface Cue { kind: string; f: number; to?: number; [option: string]: unknown }
export interface VariantPreset { id: string; label?: string; params: Record<string, ParamValue> }
export interface Variants { axes?: Array<{ id: string; label?: string; values?: string[] }>; presets?: VariantPreset[]; thumbFrame?: number }
export interface SizeOption { width: number; height: number; label?: string }

export interface Manifest {
  schema: 1; title: string; width: number; height: number; fps: number; duration: number;
  scenes: Scene[]; params?: Param[]; audio?: AudioTrack[]; cues?: Cue[];
  soundtrack?: { theme?: string; loudness?: number }; variants?: Variants; sizes?: SizeOption[]; lang?: { code: string; rtl: boolean };
}

/** One excerpt of a scene on the edited timeline. `frames` = how long it plays; `in`/`out` = which part of the scene (source frames). */
export interface Clip { id?: string; scene: string; frames?: number; in?: number; out?: number }
export interface NormalizedClip extends Clip { id: string; in: number; out: number; frames: number }
export interface CustomTrack { id: string; label?: string; src: string; sync?: 'timeline' | 'free'; offset?: number; volume?: number; enabled?: boolean; generated?: never }
export interface TrackState { enabled?: boolean; volume?: number }

/** A saved version of a film (`films/<film>/projects/<name>.json`). */
export interface Project {
  version?: number;
  params: Record<string, ParamValue>;
  clips?: Clip[] | null;
  audio: { tracks: Record<string, TrackState>; custom: CustomTrack[] };
  output: { size?: string };
}
export interface NormalizedProject extends Project { clips: NormalizedClip[] }
export type ProjectInput = Partial<Omit<Project, 'audio'>> & { audio?: Partial<Project['audio']> };

export interface TimelineClip { i: number; id: string; scene: string; in: number; out: number; t0: number; t1: number; rate: number }
export interface BuiltTimeline { project: NormalizedProject; clips: TimelineClip[]; total: number }

/** A film on disk. `root` is the workspace folder it lives in ('films' = yours, 'examples' = the gallery). */
export interface FilmRef { id: string; root: string; dir: string }

export interface BrandFont { family: string; role?: 'display' | 'text' | 'both'; files: Record<string, string>; license?: string; redistributable?: boolean }
export interface BrandJson {
  name: string; nameLocal?: Record<string, string>;
  colors: Record<string, string>; fonts: BrandFont[];
  logo?: { svg?: string; strokes?: string; raster?: string };
  voice?: { tone?: string; tagline?: string }; languages?: string[];
}
export interface LogoStrokes { viewBox: [number, number, number, number]; background: string; strokes: Array<{ color: string; width: number; d: string; length: number }> }

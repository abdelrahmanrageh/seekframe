// Typed client for the editor server (src/editor/server.ts).
import type { BrandJson, Project } from '../../types';

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { ...(init?.headers || {}), 'X-Seekframe': '1' } }); const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body as any).error || `${r.status} ${r.statusText}`);
  return body as T;
}
const post = <T>(url: string, body: unknown) => j<T>(url, { method: 'POST', body: JSON.stringify(body) });
const upload = <T>(url: string, file: File) => j<T>(url, { method: 'POST', body: file });

export interface FilmEntry { id: string; root: string }
export interface DoctorCheck { name: string; ok: boolean; detail: string; fix?: string }
export interface DoctorReport { ok: boolean; checks: DoctorCheck[] }
export interface ContrastRow { label: string; ratio: number; grade: string }
export interface BrandPayload { brand: BrandJson; exists: boolean; contrast: ContrastRow[]; dir: string; assets: { svg: string | null; raster: string | null; strokesPreview: string | null } }
export interface LogoResult extends BrandPayload { note?: string; strokes?: number; palette?: Array<{ hex: string; share: number }>; roles?: Record<string, string> }
export interface QueueJob { id: string; film: string; name: string; fps: number; size: string | null; state: 'queued' | 'rendering' | 'done' | 'error' | 'cancelled'; phase?: string; done: number; total: number; queuedAt: number; started?: number; ended?: number; file?: string; outName?: string; length?: number; error?: string }
export interface Snapshot { id: string; at: number }

export const api = {
  films: () => j<FilmEntry[]>('/api/films'),
  workspace: () => j<{ root: string; isClone: boolean; version: string }>('/api/workspace'),
  doctor: () => j<DoctorReport>('/api/doctor'),
  newFilm: (o: { name: string; width: number; height: number; fps: number; noBrand?: boolean }) => post<{ id: string }>('/api/films/new', o),
  versions: (film: string) => j<string[]>(`/api/projects/${film}`),
  getProject: (film: string, v: string) => j<Partial<Project>>(`/api/project/${film}/${v}`),
  putProject: (film: string, v: string, p: unknown) => j<{ ok: true }>(`/api/project/${film}/${v}`, { method: 'PUT', body: JSON.stringify(p) }),
  deleteProject: (film: string, v: string) => j<{ ok: true }>(`/api/project/${film}/${v}`, { method: 'DELETE' }),
  history: (film: string, v: string) => j<Snapshot[]>(`/api/history/${film}/${v}`),
  snapshot: (film: string, v: string, id: string) => j<Partial<Project>>(`/api/history/${film}/${v}/${id}`),
  importProject: (f: File, o: { name?: string; force?: boolean } = {}) => upload<{ id: string }>(`/api/import?${new URLSearchParams({ ...(o.name ? { name: o.name } : {}), ...(o.force ? { force: '1' } : {}) })}`, f),
  packUrl: (film: string) => `/api/pack/${encodeURIComponent(film)}`,
  uploadFile: (film: string, f: File) => upload<{ path: string }>(`/api/upload/${film}?name=${encodeURIComponent(f.name)}`, f),
  thumb: (film: string, project: unknown, frame: number) => post<{ url: string }>('/api/thumb', { film, project, frame, width: 480 }),
  score: (film: string, project: unknown) => post<{ url: string | null }>('/api/score', { film, project }),
  brand: () => j<BrandPayload>('/api/brand'),
  saveBrand: (b: Partial<BrandJson>) => j<BrandPayload>('/api/brand', { method: 'PUT', body: JSON.stringify(b) }),
  brandLogo: (f: File) => upload<LogoResult>(`/api/brand/logo?name=${encodeURIComponent(f.name)}`, f),
  brandFont: (f: File, o: { family: string; weight: string; role: string; license: string }) => upload<BrandPayload & { warning?: string; ignored?: string }>(`/api/brand/font?name=${encodeURIComponent(f.name)}&family=${encodeURIComponent(o.family)}&weight=${encodeURIComponent(o.weight)}&role=${o.role}&license=${o.license}`, f),
  removeFont: (family: string) => j<BrandPayload>(`/api/brand/font?family=${encodeURIComponent(family)}`, { method: 'DELETE' }),
  applyBrand: (film: string) => post<{ ok: true }>('/api/brand/apply', { film }),
  render: (o: { film: string; name: string; project: unknown; fps: number; size: string | null }) => post<{ id: string }>('/api/render', o),
  jobs: () => j<QueueJob[]>('/api/jobs'),
  cancel: (id: string) => post<{ ok: true }>('/api/cancel', { id }),
};

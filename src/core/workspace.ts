// Where things live.
//   PKG_ROOT  the installed seekframe package (templates, bundled fonts, dist/ browser bundles, gallery examples)
//   ROOT      your workspace: the folder with films/, brand/, output/ (found from the current directory; in a clone it is the clone itself)
// A workspace is any folder containing `seekframe.json` (created by `seekframe init`). Inside a clone of the repo the repo is the workspace.
import fs from 'node:fs';
import path from 'node:path';
import { build as buildBrand } from '../brand/build';
import type { FilmRef } from '../types';

export const PKG_ROOT = path.resolve(__dirname, '..', '..');           // dist/core -> package root (same depth in src/core)
export const BROWSER_DIR = path.join(PKG_ROOT, 'dist', 'browser');
export const ASSETS_DIR = path.join(PKG_ROOT, 'assets');

export function findWorkspace(cwd: string = process.cwd()): string {
  if (process.env.SEEKFRAME_WORKSPACE) return path.resolve(process.env.SEEKFRAME_WORKSPACE);
  for (let d = path.resolve(cwd); ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, 'seekframe.json'))) return d;
    if (path.dirname(d) === d) break;
  }
  const rel = path.relative(PKG_ROOT, path.resolve(cwd));
  return !rel.startsWith('..') && !path.isAbsolute(rel) ? PKG_ROOT : path.resolve(cwd);   // inside the package/clone -> the clone; elsewhere -> here
}
export const ROOT = findWorkspace();
export const ROOTS = ['films', 'examples'];

export const slug = (s: unknown): string => String(s || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);

/** folders that hold films, in lookup order: your workspace first, then the gallery shipped with the package */
export function filmRoots(): Array<{ root: string; base: string }> {
  const out: Array<{ root: string; base: string }> = [], seen = new Set<string>();
  for (const [r, base] of [['films', ROOT], ['examples', ROOT], ['examples', PKG_ROOT]] as const) {
    const d = path.join(base, r); if (seen.has(d) || !fs.existsSync(d)) continue; seen.add(d); out.push({ root: r, base });
  }
  return out;
}
export function listFilms(): FilmRef[] {
  const out: FilmRef[] = [], seen = new Set<string>();
  for (const { root, base } of filmRoots()) {
    const d = path.join(base, root);
    for (const id of fs.readdirSync(d).sort()) if (!id.startsWith('_') && !id.startsWith('.') && !seen.has(id) && fs.existsSync(path.join(d, id, 'film.html'))) { seen.add(id); out.push({ id, root, dir: path.join(d, id) }); }
  }
  return out;
}
export const findFilm = (id: string): FilmRef | null => listFilms().find(f => f.id === slug(id)) || null;
/** accepts an id ("akked-tick") or a path ("examples/akked-tick", "./films/x") */
export function resolveFilm(arg?: string): FilmRef | null {
  if (!arg) return null;
  const byId = findFilm(arg); if (byId) return byId;
  const p = path.resolve(process.cwd(), arg);
  if (fs.existsSync(path.join(p, 'film.html'))) return { id: path.basename(p), root: path.basename(path.dirname(p)), dir: p };
  return null;
}

// brand/brand.css and brand.js are GENERATED from brand.json (and are git-ignored): rebuild them (once per process) so they match the
// fonts that actually exist on this machine. A clone without a licensed font simply gets the bundled fallbacks, with no missing-file requests.
let brandsBuilt = false;
export function ensureBrands(force = false): void {
  if (brandsBuilt && !force) return; brandsBuilt = true;
  const dirs = new Set<string>([path.join(ROOT, 'brand'), path.join(PKG_ROOT, 'brand')]);
  for (const base of [ROOT, PKG_ROOT]) for (const r of [...ROOTS, 'templates']) { const d = path.join(base, r); if (fs.existsSync(d)) for (const id of fs.readdirSync(d)) dirs.add(path.join(d, id, 'brand')); }
  for (const d of dirs) if (fs.existsSync(path.join(d, 'brand.json'))) { try { buildBrand(d); } catch (e: any) { console.error(`brand build failed in ${path.relative(ROOT, d)}: ${e.message}`); } }
}

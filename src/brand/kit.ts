// The brand kit, as functions. The CLI (`seekframe brand …`), the MCP tools and the editor's Brand panel are all thin wrappers around these.
// A kit is a folder: brand.json + assets/ (logo.svg, logo-strokes.json) + fonts/; brand.css/brand.js are generated from brand.json.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../core/workspace';
import { build } from './build';
import { palette, roles } from './palette';
import { toSVG, strokes as extractStrokes, strokesSVG } from './logo';
import { PAIRS, contrastHex, grade } from '../core/color';
import type { BrandFont, BrandJson } from '../types';

export const defaultBrandDir = (): string => path.join(ROOT, 'brand');
const DEFAULT: BrandJson = { name: 'My Brand', colors: { accent: '#5B8CFF', ink: '#0F1226', paper: '#FFFFFF', muted: '#8A90A8' }, fonts: [], voice: { tone: 'calm, confident, short sentences', tagline: '' }, languages: ['en'] };

export function readBrand(dir = defaultBrandDir()): BrandJson {
  const f = path.join(dir, 'brand.json');
  return fs.existsSync(f) ? { ...DEFAULT, ...JSON.parse(fs.readFileSync(f, 'utf8')) } : { ...DEFAULT, colors: { ...DEFAULT.colors } };
}
export function writeBrand(dir: string, b: BrandJson): void {
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'brand.json'), JSON.stringify(b, null, 2) + '\n');
  build(dir);
}
export function initBrand(dir = defaultBrandDir(), name?: string): BrandJson {
  const b = fs.existsSync(path.join(dir, 'brand.json')) ? readBrand(dir) : { ...DEFAULT, name: name || DEFAULT.name };
  writeBrand(dir, b); return b;
}

export interface ContrastRow { label: string; ratio: number; grade: string }
export const contrastTable = (colors: Record<string, string>): ContrastRow[] =>
  PAIRS.filter(([, a, b]) => colors[a] && colors[b]).map(([label, a, b]) => { const ratio = contrastHex(colors[a], colors[b]); return { label, ratio: +ratio.toFixed(2), grade: grade(ratio) }; });

export interface LogoResult { svg: string; strokes?: number; palette?: Array<{ hex: string; share: number }>; roles?: Record<string, string>; preview?: string }
/** Trace a logo into brand/assets (svg, and optionally centre-line strokes) and suggest colours from it. */
export function importLogo(dir: string, file: string, o: { strokes?: boolean; colors?: number } = {}): LogoResult {
  const out = path.join(dir, 'assets'); fs.mkdirSync(out, { recursive: true });
  const b = readBrand(dir); b.logo = b.logo || {}; const res: LogoResult = { svg: 'assets/logo.svg' };
  if (/\.svg$/i.test(file)) fs.copyFileSync(file, path.join(out, 'logo.svg'));
  else {
    fs.writeFileSync(path.join(out, 'logo.svg'), toSVG(file, { colors: 6 }));
    const cols = palette(file, 5); res.palette = cols.map(c => ({ hex: c.hex, share: c.share })); res.roles = roles(cols);
    if (o.strokes !== false) {
      const j = extractStrokes(file, { colors: o.colors || 3 });
      fs.writeFileSync(path.join(out, 'logo-strokes.json'), JSON.stringify(j, null, 2));
      fs.writeFileSync(path.join(out, 'logo-strokes.svg'), strokesSVG(j, { bg: true }));
      b.logo.strokes = 'assets/logo-strokes.json'; res.strokes = j.strokes.length; res.preview = 'assets/logo-strokes.svg';
    }
  }
  b.logo.svg = 'assets/logo.svg'; writeBrand(dir, b); return res;
}

export type FontLicense = 'OFL' | 'free-no-redistribute' | 'commercial-no-redistribute' | 'unknown';
export interface AddFontOptions { family: string; weight?: string; role?: 'display' | 'text' | 'both'; license?: string; redistributable?: boolean }
/** Add a font file to the kit. Fonts that may not be redistributed are added to .gitignore so they are never committed. */
export function addFont(dir: string, file: string, o: AddFontOptions): { warning?: string; ignored?: string } {
  const b = readBrand(dir); fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
  const dest = 'fonts/' + path.basename(file).replace(/[^\w.\-]+/g, '_'); if (path.resolve(file) !== path.resolve(dir, dest)) fs.copyFileSync(file, path.join(dir, dest));
  let f = b.fonts.find((x: BrandFont) => x.family === o.family);
  if (!f) b.fonts.push(f = { family: o.family, role: o.role || 'both', files: {} });
  f.files[String(o.weight || 400)] = dest; f.role = o.role || f.role || 'both'; f.license = o.license || f.license || 'unknown';
  f.redistributable = o.redistributable === undefined ? f.redistributable !== false : o.redistributable;
  writeBrand(dir, b);
  const res: { warning?: string; ignored?: string } = {};
  if (!f.redistributable) {
    const gi = path.join(ROOT, '.gitignore'), line = path.relative(ROOT, path.join(dir, dest)).split(path.sep).join('/'), cur = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
    if (!cur.split('\n').includes(line)) fs.appendFileSync(gi, `${cur.endsWith('\n') || !cur ? '' : '\n'}# non-redistributable font (${o.family})\n${line}\n`);
    res.ignored = line;
  } else if (f.license === 'unknown') res.warning = 'Licence unknown: confirm the font may be redistributed before you publish.';
  return res;
}
export function removeFont(dir: string, family: string): void {
  const b = readBrand(dir), f = b.fonts.find((x: BrandFont) => x.family === family); if (!f) return;
  for (const file of Object.values(f.files)) fs.rmSync(path.join(dir, file), { force: true });
  b.fonts = b.fonts.filter((x: BrandFont) => x.family !== family); writeBrand(dir, b);
}
/** Copy the kit into a film (films are self-contained so they can be moved or shared) and rebuild its CSS. */
export function applyBrand(srcDir: string, filmDir: string): void {
  const dst = path.join(filmDir, 'brand'); if (path.resolve(srcDir) === path.resolve(dst)) { build(dst); return; }
  fs.rmSync(dst, { recursive: true, force: true }); fs.cpSync(srcDir, dst, { recursive: true }); build(dst);
}

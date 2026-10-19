// seekframe new <name> — copy templates/blank into films/<name>
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, PKG_ROOT, slug, ensureBrands } from './workspace';
import { build as buildBrand } from '../brand/build';



// In a workspace (not a clone) the package lives in node_modules/seekframe: rewrite the template's clone-relative paths to go through it
const viaPackage = (text: string): string => ROOT === PKG_ROOT ? text : text.replace(/\.\.\/\.\.\/dist\//g, '../../node_modules/seekframe/dist/');
export interface ScaffoldOptions { name: string; width?: number | string; height?: number | string; fps?: number | string; brand?: string }
// returns {id, dir, brand}; throws on problems (so MCP/CLI can both use it)
function scaffoldFilm({ name, width, height, fps, brand: brandArg }: ScaffoldOptions) {
  name = slug(name);
  if (!name || name.startsWith('_')) throw new Error('give the film a name, e.g. "spring-sale"');
  ensureBrands();
  const src = path.join(PKG_ROOT, 'templates', 'blank'), dst = path.join(ROOT, 'films', name);
  if (fs.existsSync(dst)) throw new Error(`films/${name} already exists`);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
  const brand = brandArg ? path.resolve(brandArg) : path.join(ROOT, 'brand'); let brandCopied = false;
  if (fs.existsSync(path.join(brand, 'brand.json'))) { fs.rmSync(path.join(dst, 'brand'), { recursive: true, force: true }); fs.cpSync(brand, path.join(dst, 'brand'), { recursive: true }); brandCopied = true; }
  const f = path.join(dst, 'film.js'); let s = fs.readFileSync(f, 'utf8');
  s = s.replace("title: 'Blank film'", `title: '${name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}'`);
  if (width) s = s.replace('width: 1280', 'width: ' + +width);
  if (height) s = s.replace('height: 720', 'height: ' + +height);
  if (fps) s = s.replace('fps: 30', 'fps: ' + +fps);
  fs.writeFileSync(f, s);
  for (const name of ['film.html', 'film.js']) { const h = path.join(dst, name); fs.writeFileSync(h, viaPackage(fs.readFileSync(h, 'utf8'))); }
  if (width || height) { const h = path.join(dst, 'film.html'); fs.writeFileSync(h, fs.readFileSync(h, 'utf8').replace('width:1280px;height:720px', `width:${+width! || 1280}px;height:${+height! || 720}px`)); }
  return { id: name, dir: dst, brand: brandCopied };
}
/** copy any film (typically a gallery example) into films/<name> so it can be edited */
function copyFilm(srcDir: string, name: string): { id: string; dir: string } {
  const id = slug(name); if (!id) throw new Error('give the copy a name');
  const dst = path.join(ROOT, 'films', id); if (fs.existsSync(dst)) throw new Error(`films/${id} already exists`);
  ensureBrands(); fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(srcDir, dst, { recursive: true, filter: p => !/[\\/](\.history|uploads)([\\/]|$)/.test(p) && !/brand[\\/]brand\.(css|js)$/.test(p) });
  for (const f of ['film.html', 'film.js']) { const h = path.join(dst, f); if (fs.existsSync(h)) fs.writeFileSync(h, viaPackage(fs.readFileSync(h, 'utf8'))); }
  try { buildBrand(path.join(dst, 'brand')); } catch { /* film has no brand kit */ }
  return { id, dir: dst };
}
function scaffold(a) {
  try {
    const r = scaffoldFilm({ name: a._[1], width: a.width, height: a.height, fps: a.fps, brand: a.brand });
    console.log(`Created films/${r.id}${r.brand ? ' (brand kit copied from brand/)' : ''}\n  1. edit films/${r.id}/film.js\n  2. seekframe validate ${r.id}\n  3. seekframe editor   (then pick "${r.id}")`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
export { scaffold, scaffoldFilm, copyFilm };

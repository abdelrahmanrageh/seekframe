// Where films live. A workspace is the repo root: `films/` is yours, `examples/` is the gallery that ships with Seekframe.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const ROOTS = ['films', 'examples'];
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
function listFilms() {
  const out = [];
  for (const r of ROOTS) {
    const d = path.join(ROOT, r); if (!fs.existsSync(d)) continue;
    for (const id of fs.readdirSync(d).sort()) if (!id.startsWith('_') && !id.startsWith('.') && fs.existsSync(path.join(d, id, 'film.html'))) out.push({ id, root: r, dir: path.join(d, id) });
  }
  return out;
}
const findFilm = id => listFilms().find(f => f.id === slug(id)) || null;
// accepts an id ("client-tick") or a path ("examples/client-tick", "./films/x")
function resolveFilm(arg) {
  if (!arg) return null;
  const byId = findFilm(arg); if (byId) return byId;
  const p = path.resolve(process.cwd(), arg);
  if (fs.existsSync(path.join(p, 'film.html'))) return { id: path.basename(p), root: path.relative(ROOT, path.dirname(p)), dir: p };
  return null;
}

// brand/brand.css and brand.js are GENERATED from brand.json (and are git-ignored): rebuild them (once per process) so they match the
// fonts that actually exist on this machine. A clone without a licensed font simply gets the bundled fallbacks, with no missing-file requests.
let brandsBuilt = false;
function ensureBrands() {
  if (brandsBuilt) return; brandsBuilt = true;
  const { build } = require('../brand/build.js'), dirs = [path.join(ROOT, 'brand')];
  for (const r of [...ROOTS, 'templates']) { const d = path.join(ROOT, r); if (fs.existsSync(d)) for (const id of fs.readdirSync(d)) dirs.push(path.join(d, id, 'brand')); }
  for (const d of dirs) if (fs.existsSync(path.join(d, 'brand.json'))) { try { build(d); } catch (e) { console.error(`brand build failed in ${path.relative(ROOT, d)}: ${e.message}`); } }
}
module.exports = { ROOT, ROOTS, slug, listFilms, findFilm, resolveFilm, ensureBrands };

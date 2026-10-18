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
module.exports = { ROOT, ROOTS, slug, listFilms, findFilm, resolveFilm };

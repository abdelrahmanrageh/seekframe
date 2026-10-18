// seekframe new <name> — copy templates/blank into films/<name>
const fs = require('fs'), path = require('path');
const { ROOT, slug } = require('./workspace.js');

// returns {id, dir, brand}; throws on problems (so MCP/CLI can both use it)
function scaffoldFilm({ name, width, height, fps, brand: brandArg }) {
  name = slug(name);
  if (!name || name.startsWith('_')) throw new Error('give the film a name, e.g. "spring-sale"');
  const src = path.join(ROOT, 'templates', 'blank'), dst = path.join(ROOT, 'films', name);
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
  if (width || height) { const h = path.join(dst, 'film.html'); fs.writeFileSync(h, fs.readFileSync(h, 'utf8').replace('width:1280px;height:720px', `width:${+width || 1280}px;height:${+height || 720}px`)); }
  return { id: name, dir: dst, brand: brandCopied };
}
function scaffold(a) {
  try {
    const r = scaffoldFilm({ name: a._[1], width: a.width, height: a.height, fps: a.fps, brand: a.brand });
    console.log(`Created films/${r.id}${r.brand ? ' (brand kit copied from brand/)' : ''}\n  1. edit films/${r.id}/film.js\n  2. seekframe validate ${r.id}\n  3. seekframe editor   (then pick "${r.id}")`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { scaffold, scaffoldFilm };

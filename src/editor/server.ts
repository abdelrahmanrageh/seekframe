// Local server for the editor.  `seekframe editor`  ->  http://localhost:4173/
//  - serves the workspace read-only (films, examples, editor UI)
//  - stores project versions in <film>/projects/<name>.json and uploads in <film>/uploads/
//  - renders thumbnails (variants view), generated scores, and MP4 exports
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import * as Timeline from '../core/timeline';
import { openFilm } from '../core/render';
import { exportFilm } from '../core/export';
import { ROOT, PKG_ROOT, slug, listFilms, findFilm, ensureBrands } from '../core/workspace';
import { renderScore } from '../sound/score';
import { chromium } from 'playwright';






const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.md': 'text/plain' };
const UPLOAD_EXT = /\.(png|jpe?g|webp|gif|svg|wav|mp3|m4a|ogg)$/i;
const CACHE = path.join(os.tmpdir(), 'seekframe-cache'); fs.mkdirSync(CACHE, { recursive: true });
const json = (res, code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
const readBody = (req: http.IncomingMessage, max = 100e6): Promise<Buffer> => new Promise((ok, no) => { const ch = []; let n = 0; req.on('data', c => { n += c.length; if (n > max) { no(new Error('too large')); req.destroy(); } else ch.push(c); }); req.on('end', () => ok(Buffer.concat(ch))); req.on('error', no); });
const hash = o => crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 16);

interface Job { state: 'idle' | 'rendering' | 'done' | 'error'; phase?: string; done?: number; total?: number; procs?: any[]; started?: number; file?: string; name?: string; seconds?: number; length?: number; error?: string }
let job: Job = { state: 'idle' };
async function generateScore(film, project, track, manifest) {          // -> absolute path of a cached wav
  
  const theme = (manifest.soundtrack && manifest.soundtrack.theme) || 'deep', rtl = !!(manifest.lang && manifest.lang.rtl);
  const f = path.join(CACHE, `score-${hash([manifest.cues, theme, rtl, manifest.duration, manifest.fps, manifest.soundtrack])}.wav`);
  if (!fs.existsSync(f)) await renderScore({ manifest, theme, out: f, rtl });
  return f;
}

async function startRender({ film, name, project, fps, size }) {
  const out = path.join(ROOT, 'output', `${film.id}-${slug(name) || 'default'}.mp4`);
  job = { state: 'rendering', phase: 'preparing', done: 0, total: 0, procs: [], started: Date.now() };
  const procs = job.procs;
  try {
    const r = await exportFilm({ film, project, fps, size, out, procs, onProgress: p => Object.assign(job, p), generateScore: (t, m) => generateScore(film, project, t, m) });
    job = { state: 'done', file: '/output/' + path.basename(out) + '?t=' + Date.now(), name: path.basename(out), seconds: (Date.now() - job.started) / 1000, length: r.seconds };
  } catch (e) {
    procs.forEach(p => p.kill());
    job = { state: e.message === 'cancelled' ? 'idle' : 'error', error: String(e.message || e) };
  }
}

// one browser reused for thumbnails
let thumbBrowser = null;
async function thumb(film, project, frame, width) {
  const key = hash([film.id, project, frame, width]); const f = path.join(CACHE, `thumb-${key}.png`);
  if (fs.existsSync(f)) return f;
  
  thumbBrowser = thumbBrowser || await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const { page, manifest } = await openFilm(film.dir, project, null, thumbBrowser);
  const tl = Timeline.build(manifest, project);
  const { src } = Timeline.sourceFrame(tl, Math.min(frame < 0 ? tl.total * 0.5 : frame, tl.total - 1));
  await page.evaluate(f => window.seek(f), src);
  const buf = await page.screenshot({ type: 'png' }); await page.close();
  fs.writeFileSync(f, buf); return f;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const p = decodeURIComponent(u.pathname); let m;
  try {
    if (p === '/') { res.writeHead(302, { location: '/dist/editor/editor.html' + u.search }); return res.end(); }
    if (p === '/api/films') return json(res, 200, listFilms().map(({ id, root }) => ({ id, root })));
    if ((m = /^\/api\/projects\/([^/]+)$/.exec(p))) {
      const f = findFilm(m[1]); if (!f) return json(res, 404, { error: 'unknown film' });
      const pd = path.join(f.dir, 'projects'); return json(res, 200, fs.existsSync(pd) ? fs.readdirSync(pd).filter(x => x.endsWith('.json')).map(x => x.slice(0, -5)) : []);
    }
    if ((m = /^\/api\/project\/([^/]+)\/([^/]+)$/.exec(p))) {
      const f = findFilm(m[1]), n = slug(m[2]); if (!f || !n) return json(res, 404, { error: 'unknown film/project' });
      const file = path.join(f.dir, 'projects', n + '.json');
      if (req.method === 'GET') return fs.existsSync(file) ? json(res, 200, JSON.parse(fs.readFileSync(file, 'utf8'))) : json(res, 200, {});
      if (req.method === 'PUT') { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(JSON.parse((await readBody(req)).toString()), null, 2)); return json(res, 200, { ok: true }); }
      if (req.method === 'DELETE') { fs.rmSync(file, { force: true }); return json(res, 200, { ok: true }); }
    }
    if ((m = /^\/api\/upload\/([^/]+)$/.exec(p)) && req.method === 'POST') {
      const f = findFilm(m[1]); const fn = path.basename(u.searchParams.get('name') || '').replace(/[^\w.\-]+/g, '_');
      if (!f || !UPLOAD_EXT.test(fn)) return json(res, 400, { error: 'unsupported file type' });
      const dst = path.join(f.dir, 'uploads'); fs.mkdirSync(dst, { recursive: true });
      fs.writeFileSync(path.join(dst, fn), await readBody(req)); return json(res, 200, { path: 'uploads/' + fn });
    }
    if (p === '/api/thumb' && req.method === 'POST') {                  // {film, project, frame, width} -> png url
      const o = JSON.parse((await readBody(req)).toString()); const f = findFilm(o.film); if (!f) return json(res, 404, { error: 'unknown film' });
      const file = await thumb(f, o.project || {}, o.frame ?? -1, o.width || 480);
      return json(res, 200, { url: '/api/cache/' + path.basename(file) });
    }
    if (p === '/api/score' && req.method === 'POST') {                  // {film, project} -> wav url (generated from the film's cues)
      const o = JSON.parse((await readBody(req)).toString()); const f = findFilm(o.film); if (!f) return json(res, 404, { error: 'unknown film' });
      const { browser, manifest } = await openFilm(f.dir, o.project || {}); await browser.close();
      if (!manifest.cues || !manifest.cues.length) return json(res, 200, { url: null });
      const file = await generateScore(f, o.project || {}, {}, manifest);
      return json(res, 200, { url: '/api/cache/' + path.basename(file) });
    }
    if ((m = /^\/api\/cache\/([\w.-]+)$/.exec(p))) { const f = path.join(CACHE, m[1]); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'max-age=3600' }); return fs.createReadStream(f).pipe(res); }
    if (p === '/api/render' && req.method === 'POST') {
      if (job.state === 'rendering') return json(res, 409, { error: 'a render is already running' });
      const o = JSON.parse((await readBody(req)).toString()); const film = findFilm(o.film);
      if (!film) return json(res, 400, { error: 'unknown film' });
      const fps = [24, 25, 30, 50, 60].includes(+o.fps) ? +o.fps : 30;
      if (o.size && !/^\d{2,5}x\d{2,5}$/.test(o.size)) return json(res, 400, { error: 'bad size' });
      startRender({ film, name: o.name || 'default', project: o.project, fps, size: o.size || null });
      return json(res, 200, { ok: true });
    }
    if (p === '/api/job') { const { procs, ...j } = job; return json(res, 200, j); }
    if (p === '/api/cancel' && req.method === 'POST') { (job.procs || []).forEach(c => c.kill()); return json(res, 200, { ok: true }); }

    // static (read-only): your workspace first, then the package (gallery examples, templates, dist/ bundles, assets).
    // A film in your workspace points at the runtime as ../../node_modules/seekframe/dist/browser/runtime.js: that prefix maps to the package.
    const pkgPrefix = /^\/node_modules\/seekframe(\/.*)?$/.exec(p), rel = pkgPrefix ? (pkgPrefix[1] || '/') : p;
    const bases = pkgPrefix ? [PKG_ROOT] : (ROOT === PKG_ROOT ? [ROOT] : [ROOT, PKG_ROOT]);
    let file = '';
    for (const base of bases) {
      const f = path.normalize(path.join(base, rel));
      if (f.startsWith(base + path.sep) && !/(^|[\\/])(node_modules|\.git|\.claude|\.cursor)([\\/]|$)/.test(rel) && fs.existsSync(f) && fs.statSync(f).isFile()) { file = f; break; }
    }
    if (!file) { res.writeHead(404); return res.end('not found'); }
    const stat = fs.statSync(file), type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const a = range[1] ? +range[1] : 0, z = range[2] ? +range[2] : stat.size - 1;
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${z}/${stat.size}`, 'accept-ranges': 'bytes', 'content-length': z - a + 1 });
      return fs.createReadStream(file, { start: a, end: z }).pipe(res);
    }
    res.writeHead(200, { 'content-type': type, 'content-length': stat.size, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { json(res, 500, { error: String(e.message || e) }); }
});
function start(port = +process.env.PORT || 4173) {
  ensureBrands();
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => { console.log(`Seekframe editor: http://localhost:${port}/`); resolve(server); }));
}
export { start, server };

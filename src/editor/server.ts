// Local server for the editor.  `seekframe editor`  ->  http://localhost:4173/
//  - serves your workspace and the package (gallery, dist bundles) read-only
//  - stores project versions (+ timestamped history) in <film>/projects/, uploads in <film>/uploads/
//  - brand kit API (logo, palette, fonts), new-film wizard, setup check
//  - renders thumbnails, generated scores and MP4 exports (through a queue)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import * as Timeline from '../core/timeline';
import { openFilm } from '../core/render';
import { exportFilm } from '../core/export';
import { ROOT, PKG_ROOT, slug, listFilms, findFilm, ensureBrands } from '../core/workspace';
import { renderScore } from '../sound/score';
import { scaffoldFilm } from '../core/scaffold';
import { doctor } from '../core/doctor';
import { addFont, applyBrand, contrastTable, defaultBrandDir, importLogo, initBrand, readBrand, removeFont, writeBrand } from '../brand/kit';
import type { AudioTrack, BrandJson, FilmRef, Manifest, Project, ProjectInput } from '../types';

const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.md': 'text/plain' };
const UPLOAD_EXT = /\.(png|jpe?g|webp|gif|svg|wav|mp3|m4a|ogg)$/i, FONT_EXT = /\.(woff2?|ttf|otf)$/i, LOGO_EXT = /\.(png|jpe?g|svg|webp)$/i;
const CACHE = path.join(os.tmpdir(), 'seekframe-cache'); fs.mkdirSync(CACHE, { recursive: true });
const json = (res: http.ServerResponse, code: number, o: unknown) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
const readBody = (req: http.IncomingMessage, max = 100e6): Promise<Buffer> => new Promise((ok, no) => { const ch: Buffer[] = []; let n = 0; req.on('data', c => { n += c.length; if (n > max) { no(new Error('too large')); req.destroy(); } else ch.push(c); }); req.on('end', () => ok(Buffer.concat(ch))); req.on('error', no); });
const bodyJSON = async (req: http.IncomingMessage) => JSON.parse((await readBody(req)).toString() || '{}');
const hash = (o: unknown) => crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 16);
/** gallery films shipped inside an installed package are read-only (a clone's own examples are yours to edit) */
const writable = (f: FilmRef): boolean => f.dir.startsWith(ROOT + path.sep) && !f.dir.split(path.sep).includes('node_modules');
const READONLY = (f: FilmRef) => `“${f.id}” is a gallery film that ships with Seekframe and is read-only here. Copy it into your workspace first: seekframe copy ${f.id}`;
const safeName = (s: string | null) => path.basename(s || '').replace(/[^\w.\-]+/g, '_');

/* ---------- generated scores ---------- */
async function generateScore(manifest: Manifest): Promise<string> {          // -> absolute path of a cached wav
  const theme = (manifest.soundtrack && manifest.soundtrack.theme) || 'deep', rtl = !!(manifest.lang && manifest.lang.rtl);
  const f = path.join(CACHE, `score-${hash([manifest.cues, theme, rtl, manifest.duration, manifest.fps, manifest.soundtrack])}.wav`);
  if (!fs.existsSync(f)) await renderScore({ manifest, theme, out: f, rtl });
  return f;
}

/* ---------- render queue ---------- */
export interface QueueJob {
  id: string; film: string; name: string; fps: number; size: string | null;
  state: 'queued' | 'rendering' | 'done' | 'error' | 'cancelled'; phase?: string; done: number; total: number;
  queuedAt: number; started?: number; ended?: number; file?: string; outName?: string; length?: number; error?: string;
  project?: ProjectInput; procs?: any[]; cancelled?: boolean;
}
const jobs: QueueJob[] = []; let running: QueueJob | null = null;
const publicJob = ({ project, procs, cancelled, ...j }: QueueJob) => j;

async function pump(): Promise<void> {
  if (running) return;
  const job = jobs.find(j => j.state === 'queued'); if (!job) return;
  running = job; job.state = 'rendering'; job.started = Date.now(); job.procs = [];
  const film = findFilm(job.film);
  try {
    if (!film) throw new Error('unknown film');
    const out = path.join(ROOT, 'output', `${film.id}-${slug(job.name) || 'default'}.mp4`);
    const r = await exportFilm({ film, project: job.project || {}, fps: job.fps, size: job.size, out, procs: job.procs, onProgress: p => { job.phase = p.phase; job.done = p.done; job.total = p.total; }, generateScore: (_t: AudioTrack, m: Manifest) => generateScore(m) });
    job.state = 'done'; job.file = '/output/' + path.basename(out) + '?t=' + Date.now(); job.outName = path.basename(out); job.length = r.seconds;
  } catch (e: any) {
    (job.procs || []).forEach(p => { try { p.kill(); } catch { /* already gone */ } });
    if (job.cancelled || e.message === 'cancelled') job.state = 'cancelled'; else { job.state = 'error'; job.error = String(e.message || e); }
  }
  job.ended = Date.now(); running = null; job.project = undefined;
  while (jobs.length > 30) { const i = jobs.findIndex(j => j.state !== 'queued' && j.state !== 'rendering'); if (i < 0) break; jobs.splice(i, 1); }
  void pump();
}

/* ---------- thumbnails (variants view) ---------- */
let thumbBrowser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
async function thumb(film: FilmRef, project: ProjectInput, frame: number, width: number): Promise<string> {
  const key = hash([film.id, project, frame, width]), f = path.join(CACHE, `thumb-${key}.png`);
  if (fs.existsSync(f)) return f;
  thumbBrowser = thumbBrowser || await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const { page, manifest } = await openFilm(film.dir, project, null, thumbBrowser);
  const tl = Timeline.build(manifest, project), { src } = Timeline.sourceFrame(tl, Math.min(frame < 0 ? tl.total * 0.5 : frame, tl.total - 1));
  await page.evaluate(x => window.seek(x), src);
  const buf = await page.screenshot({ type: 'png' }); await page.close();
  fs.writeFileSync(f, buf); return f;
}

/* ---------- version history: timestamped snapshots next to each saved version ---------- */
const histDir = (film: FilmRef, name: string) => path.join(film.dir, 'projects', '.history', name);
function snapshot(film: FilmRef, name: string, body: string): void {
  const d = histDir(film, name); fs.mkdirSync(d, { recursive: true });
  const files = fs.readdirSync(d).sort(), last = files[files.length - 1];
  if (last && fs.readFileSync(path.join(d, last), 'utf8') === body) return;                                  // unchanged
  if (last && Date.now() - fs.statSync(path.join(d, last)).mtimeMs < 20_000) { fs.writeFileSync(path.join(d, last), body); return; }   // coalesce rapid autosaves
  fs.writeFileSync(path.join(d, new Date().toISOString().replace(/[:.]/g, '-') + '.json'), body);
  for (const f of fs.readdirSync(d).sort().slice(0, -40)) fs.rmSync(path.join(d, f), { force: true });       // keep the last 40
}

/* ---------- brand ---------- */
const brandPayload = () => { const dir = defaultBrandDir(), b = readBrand(dir); return { brand: b, exists: fs.existsSync(path.join(dir, 'brand.json')), contrast: contrastTable(b.colors), dir: path.relative(ROOT, dir) || 'brand', assets: { svg: b.logo?.svg && fs.existsSync(path.join(dir, b.logo.svg)) ? `/brand/${b.logo.svg}` : null, raster: b.logo?.raster && fs.existsSync(path.join(dir, b.logo.raster)) ? `/brand/${b.logo.raster}` : null, strokesPreview: b.logo?.strokes && fs.existsSync(path.join(dir, 'assets', 'logo-strokes.svg')) ? '/brand/assets/logo-strokes.svg' : null } }; };

/* ---------- request guard (the server is local, but browsers will happily let ANY web page talk to it) ----------
   1. Host allowlist: stops DNS-rebinding (a hostile page re-pointing its own domain at 127.0.0.1 to read your workspace).
   2. State-changing requests must carry `X-Seekframe: 1` (a custom header forces a CORS preflight, which we never grant) and, if the browser
      sends an Origin, it must be one of the allowed hosts. Together these stop cross-site forgery of writes, uploads and renders.
   SEEKFRAME_ALLOWED_HOSTS adds hosts for containers/Codespaces, e.g. "*.app.github.dev". */
const allowedHosts = (): string[] => ['localhost', '127.0.0.1', '[::1]', ...(process.env.SEEKFRAME_ALLOWED_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)];
const hostOf = (h: string): string => { h = h.toLowerCase(); return h.startsWith('[') ? h.slice(0, h.indexOf(']') + 1) : h.replace(/:\d+$/, ''); };
const hostAllowed = (host: string): boolean => allowedHosts().some(p => p.startsWith('*.') ? host.endsWith(p.slice(1)) : host === p);
export function guard(req: http.IncomingMessage): string | null {
  const host = hostOf(String(req.headers.host || ''));
  if (!host || !hostAllowed(host)) return `host "${host}" is not allowed (set SEEKFRAME_ALLOWED_HOSTS to add it)`;
  const origin = req.headers.origin;
  if (origin && origin !== 'null') { let oh = ''; try { oh = new URL(String(origin)).hostname.toLowerCase(); } catch { return 'bad origin'; } if (!hostAllowed(oh)) return `origin "${origin}" is not allowed`; }
  else if (origin === 'null') return 'opaque origin is not allowed';
  const m = req.method || 'GET';
  if (m !== 'GET' && m !== 'HEAD' && req.headers['x-seekframe'] !== '1') return 'missing X-Seekframe header';
  return null;
}

const server = http.createServer(async (req, res) => {
  const denied = guard(req); if (denied) return json(res, 403, { error: 'forbidden: ' + denied });
  const u = new URL(req.url || '/', 'http://x'); const p = decodeURIComponent(u.pathname); let m: RegExpExecArray | null;
  try {
    if (p === '/') { res.writeHead(302, { location: '/dist/editor/editor.html' + u.search }); return res.end(); }
    if (p === '/api/films') return json(res, 200, listFilms().map(({ id, root }) => ({ id, root })));
    if (p === '/api/doctor') return json(res, 200, await doctor());
    if (p === '/api/workspace') return json(res, 200, { root: ROOT, isClone: ROOT === PKG_ROOT, version: require('../../package.json').version });
    if (p === '/api/films/new' && req.method === 'POST') {
      const o = await bodyJSON(req);
      try { const r = scaffoldFilm({ name: o.name, width: o.width, height: o.height, fps: o.fps }); return json(res, 200, { id: r.id, brand: r.brand }); }
      catch (e: any) { return json(res, 400, { error: e.message }); }
    }
    if ((m = /^\/api\/projects\/([^/]+)$/.exec(p))) {
      const f = findFilm(m[1]); if (!f) return json(res, 404, { error: 'unknown film' });
      const pd = path.join(f.dir, 'projects'); return json(res, 200, fs.existsSync(pd) ? fs.readdirSync(pd).filter(x => x.endsWith('.json')).map(x => x.slice(0, -5)) : []);
    }
    if ((m = /^\/api\/project\/([^/]+)\/([^/]+)$/.exec(p))) {
      const f = findFilm(m[1]), n = slug(m[2]); if (!f || !n) return json(res, 404, { error: 'unknown film/project' });
      const file = path.join(f.dir, 'projects', n + '.json');
      if (req.method === 'GET') return fs.existsSync(file) ? json(res, 200, JSON.parse(fs.readFileSync(file, 'utf8'))) : json(res, 200, {});
      if ((req.method === 'PUT' || req.method === 'DELETE') && !writable(f)) return json(res, 403, { error: READONLY(f) });
      if (req.method === 'PUT') { const body = JSON.stringify(JSON.parse((await readBody(req)).toString()), null, 2); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); snapshot(f, n, body); return json(res, 200, { ok: true }); }
      if (req.method === 'DELETE') { fs.rmSync(file, { force: true }); return json(res, 200, { ok: true }); }
    }
    if ((m = /^\/api\/history\/([^/]+)\/([^/]+)(?:\/([\w.-]+))?$/.exec(p))) {
      const f = findFilm(m[1]), n = slug(m[2]); if (!f || !n) return json(res, 404, { error: 'unknown film/project' });
      const d = histDir(f, n);
      if (!m[3]) return json(res, 200, fs.existsSync(d) ? fs.readdirSync(d).filter(x => x.endsWith('.json')).sort().reverse().map(x => ({ id: x.slice(0, -5), at: fs.statSync(path.join(d, x)).mtimeMs })) : []);
      const file = path.join(d, m[3] + '.json'); return fs.existsSync(file) ? json(res, 200, JSON.parse(fs.readFileSync(file, 'utf8'))) : json(res, 404, { error: 'no such snapshot' });
    }
    if ((m = /^\/api\/upload\/([^/]+)$/.exec(p)) && req.method === 'POST') {
      const f = findFilm(m[1]), fn = safeName(u.searchParams.get('name'));
      if (!f || !UPLOAD_EXT.test(fn)) return json(res, 400, { error: 'unsupported file type' });
      if (!writable(f)) return json(res, 403, { error: READONLY(f) });
      const dst = path.join(f.dir, 'uploads'); fs.mkdirSync(dst, { recursive: true });
      fs.writeFileSync(path.join(dst, fn), await readBody(req)); return json(res, 200, { path: 'uploads/' + fn });
    }

    /* brand kit */
    if (p === '/api/brand' && req.method === 'GET') return json(res, 200, brandPayload());
    if (p === '/api/brand' && req.method === 'PUT') { const b = await bodyJSON(req) as BrandJson; const cur = readBrand(); writeBrand(defaultBrandDir(), { ...cur, name: b.name ?? cur.name, nameLocal: b.nameLocal ?? cur.nameLocal, colors: { ...cur.colors, ...b.colors }, voice: { ...cur.voice, ...b.voice }, languages: b.languages ?? cur.languages }); return json(res, 200, brandPayload()); }
    if (p === '/api/brand/init' && req.method === 'POST') { initBrand(defaultBrandDir(), (await bodyJSON(req)).name); return json(res, 200, brandPayload()); }
    if (p === '/api/brand/logo' && req.method === 'POST') {
      const fn = safeName(u.searchParams.get('name')); if (!LOGO_EXT.test(fn)) return json(res, 400, { error: 'Use a PNG, JPG, WebP or SVG logo.' });
      const tmp = path.join(CACHE, 'logo-' + Date.now() + '-' + fn); fs.writeFileSync(tmp, await readBody(req));
      try { const dir = defaultBrandDir(); if (!fs.existsSync(path.join(dir, 'brand.json'))) initBrand(dir); const r = importLogo(dir, tmp, { strokes: u.searchParams.get('strokes') !== '0' }); return json(res, 200, { ...r, ...brandPayload() }); }
      catch (e: any) { return json(res, 400, { error: String(e.message || e) }); } finally { fs.rmSync(tmp, { force: true }); }
    }
    if (p === '/api/brand/font' && req.method === 'POST') {
      const fn = safeName(u.searchParams.get('name')), q = u.searchParams; if (!FONT_EXT.test(fn) || !q.get('family')) return json(res, 400, { error: 'Choose a .woff2, .woff, .ttf or .otf file and give the family a name.' });
      const tdir = fs.mkdtempSync(path.join(CACHE, 'font-')), tmp = path.join(tdir, fn); fs.writeFileSync(tmp, await readBody(req));
      try {
        const dir = defaultBrandDir(); if (!fs.existsSync(path.join(dir, 'brand.json'))) initBrand(dir);
        const lic = q.get('license') || 'unknown', redistributable = lic === 'OFL' ? true : lic === 'unknown' ? undefined : false;
        const r = addFont(dir, tmp, { family: q.get('family')!, weight: q.get('weight') || '400', role: (q.get('role') as any) || 'both', license: lic, redistributable } as any);
        return json(res, 200, { ...r, ...brandPayload() });
      } catch (e: any) { return json(res, 400, { error: String(e.message || e) }); } finally { fs.rmSync(tdir, { recursive: true, force: true }); }
    }
    if (p === '/api/brand/font' && req.method === 'DELETE') { removeFont(defaultBrandDir(), u.searchParams.get('family') || ''); return json(res, 200, brandPayload()); }
    if (p === '/api/brand/apply' && req.method === 'POST') { const o = await bodyJSON(req), f = findFilm(o.film); if (!f) return json(res, 404, { error: 'unknown film' }); if (!writable(f)) return json(res, 403, { error: READONLY(f) }); applyBrand(defaultBrandDir(), f.dir); return json(res, 200, { ok: true }); }

    /* previews and audio */
    if (p === '/api/thumb' && req.method === 'POST') {                  // {film, project, frame, width} -> png url
      const o = await bodyJSON(req); const f = findFilm(o.film); if (!f) return json(res, 404, { error: 'unknown film' });
      const file = await thumb(f, o.project || {}, o.frame ?? -1, o.width || 480);
      return json(res, 200, { url: '/api/cache/' + path.basename(file) });
    }
    if (p === '/api/score' && req.method === 'POST') {                  // {film, project} -> wav url (generated from the film's cues)
      const o = await bodyJSON(req); const f = findFilm(o.film); if (!f) return json(res, 404, { error: 'unknown film' });
      const { browser, manifest } = await openFilm(f.dir, o.project || {}); await browser.close();
      if (!manifest.cues || !manifest.cues.length) return json(res, 200, { url: null });
      const file = await generateScore(manifest);
      return json(res, 200, { url: '/api/cache/' + path.basename(file) });
    }
    if ((m = /^\/api\/cache\/([\w.-]+)$/.exec(p))) { const f = path.join(CACHE, m[1]); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'max-age=3600' }); return fs.createReadStream(f).pipe(res); }

    /* render queue */
    if (p === '/api/render' && req.method === 'POST') {
      const o = await bodyJSON(req), film = findFilm(o.film); if (!film) return json(res, 400, { error: 'unknown film' });
      const fps = [24, 25, 30, 50, 60].includes(+o.fps) ? +o.fps : 30;
      if (o.size && !/^\d{2,5}x\d{2,5}$/.test(o.size)) return json(res, 400, { error: 'bad size' });
      const job: QueueJob = { id: crypto.randomBytes(4).toString('hex'), film: film.id, name: o.name || 'default', fps, size: o.size || null, state: 'queued', done: 0, total: 0, queuedAt: Date.now(), project: o.project || {} };
      jobs.push(job); void pump(); return json(res, 200, { ok: true, id: job.id });
    }
    if (p === '/api/jobs') return json(res, 200, jobs.map(publicJob));
    if (p === '/api/job') { const j = running || jobs[jobs.length - 1]; return json(res, 200, j ? publicJob(j) : { state: 'idle' }); }
    if (p === '/api/cancel' && req.method === 'POST') {
      const o = await bodyJSON(req), j = jobs.find(x => x.id === o.id) || running; if (!j) return json(res, 404, { error: 'no such job' });
      j.cancelled = true; if (j.state === 'queued') { j.state = 'cancelled'; j.ended = Date.now(); } else (j.procs || []).forEach(c => { try { c.kill(); } catch { /* gone */ } });
      return json(res, 200, { ok: true });
    }

    // static (read-only): your workspace first, then the package (gallery examples, templates, dist/ bundles, assets).
    // /brand/* serves your workspace brand kit. A film in your workspace points at the runtime as ../../node_modules/seekframe/dist/browser/runtime.js: that prefix maps to the package.
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
  } catch (e: any) { json(res, 500, { error: String(e.message || e) }); }
});

export function start(port: number = +(process.env.PORT || 4173)): Promise<http.Server> {
  ensureBrands();
  const host = process.env.SEEKFRAME_HOST || '127.0.0.1';
  return new Promise(resolve => server.listen(port, host, () => { console.log(`Seekframe editor: http://${host}:${port}/`); resolve(server); }));
}
export { server };

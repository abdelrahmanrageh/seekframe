// seekframe render / seekframe matrix — the export pipeline from the command line, and variant matrices.
import type { FilmRef, Manifest } from '../types';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, resolveFilm, slug } from './workspace';
import { exportFilm } from './export';
import { openFilm } from './render';
import { renderScore } from '../sound/score';





const loadProject = (film, v) => { const f = path.join(film.dir, 'projects', slug(v) + '.json'); if (!fs.existsSync(f)) throw new Error(`no saved version "${v}" for ${film.id} (see ${path.relative(ROOT, path.join(film.dir, 'projects'))})`); return JSON.parse(fs.readFileSync(f, 'utf8')); };
const listVersions = film => { const d = path.join(film.dir, 'projects'); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort() : []; };
function coerce(p, v) {                                  // CLI strings -> the param's type
  if (!p) return v; if (p.type === 'number') return +v; if (p.type === 'boolean') return v === true || v === 'true' || v === '1' || v === 'on'; return v;
}
function parseParams(str, manifest) {
  const o = {}; if (!str || str === true) return o;
  for (const kv of String(str).split(',')) { const i = kv.indexOf('='); if (i < 0) continue; const k = kv.slice(0, i).trim(); o[k] = coerce((manifest.params || []).find(p => p.id === k), kv.slice(i + 1).trim()); }
  return o;
}
const optValues = p => p.type === 'select' ? p.options.map(o => typeof o === 'object' ? o.value : o) : p.type === 'boolean' ? [true, false] : [];

async function manifestOf(film: FilmRef, project?: any): Promise<Manifest> { const { browser, manifest } = await openFilm(film.dir, project || {}); await browser.close(); return manifest; }

async function renderOne(film, project, name, o) {
  const out = path.resolve(o.out || path.join(ROOT, 'output', `${film.id}-${slug(name)}.mp4`));
  let last = '';
  const r = await exportFilm({ film, project, fps: +o.fps || 30, size: o.size || null, out, onProgress: p => { const m = p.phase === 'frames' ? `frames ${p.done}/${p.total}` : p.phase; if (m !== last && process.stdout.isTTY) { process.stdout.write(`\r  ${film.id} ${name}: ${m}        `); last = m; } },
    generateScore: async (t, manifest) => {  const f = path.join(os.tmpdir(), `sf-score-${process.pid}-${Date.now()}.wav`); await renderScore({ manifest, theme: (manifest.soundtrack && manifest.soundtrack.theme) || 'deep', out: f, rtl: !!(manifest.lang && manifest.lang.rtl) }); return f; } });
  if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(70) + '\r');
  console.log(`${path.relative(process.cwd(), out)}  ${r.seconds.toFixed(1)} s`); return out;
}

async function renderCmd(film, a) {
  let project = a.version ? loadProject(film, a.version) : {};
  if (a.params) { const m = await manifestOf(film, project); project = { ...project, params: { ...(project.params || {}), ...parseParams(a.params, m) } }; }
  await renderOne(film, project, a.version || (a.params ? 'custom' : 'default'), a);
}

/* matrix: --axes hook=*,theme=mono|dark  (select/boolean params; * = every option), films comma separated,
   --versions renders every saved version instead */
async function matrixCmd(a) {
  const ids = String(a._[1] || '').split(',').filter(Boolean); if (!ids.length) { console.error('usage: seekframe matrix <film[,film2]> [--axes hook=*,theme=a|b] [--versions] [--fps 30]'); process.exit(2); }
  const jobs = [];
  for (const id of ids) {
    const film = resolveFilm(id); if (!film) { console.error('unknown film ' + id); process.exit(2); }
    if (a.versions) { for (const v of listVersions(film)) jobs.push({ film, name: v, project: loadProject(film, v) }); continue; }
    const m = await manifestOf(film), axes = [];
    for (const part of String(a.axes || '').split(',').filter(Boolean)) {
      const [k, vals] = part.split('='), p = (m.params || []).find(x => x.id === k); if (!p) { console.error(`${film.id} has no param "${k}"`); process.exit(2); }
      axes.push({ k, vals: !vals || vals === '*' ? optValues(p) : vals.split('|').map(v => coerce(p, v)) });
    }
    let combos = [{}]; for (const ax of axes) combos = combos.flatMap(c => ax.vals.map(v => ({ ...c, [ax.k]: v })));
    for (const params of combos) jobs.push({ film, name: Object.entries(params).map(([k, v]) => `${k}-${v}`).join('_') || 'default', project: { params } });
  }
  console.log(`Rendering ${jobs.length} variant(s) at ${a.fps || 30} fps…`);
  for (const j of jobs) await renderOne(j.film, j.project, j.name, a);
}
export { renderCmd, matrixCmd, parseParams, loadProject, listVersions };

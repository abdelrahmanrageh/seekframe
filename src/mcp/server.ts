// Seekframe MCP server (stdio). Tools mirror the CLI so any MCP client (Claude, Codex, Cursor, opencode, …) can build films.
import pkg from '../../package.json';
import { scaffoldFilm } from '../core/scaffold';
import { validate } from '../core/validate';
import { review } from '../core/review';
import { sync } from '../sound/sync';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ROOT, resolveFilm, listFilms, slug } from '../core/workspace';
import { openFilm } from '../core/render';
import * as Timeline from '../core/timeline';
import { exportFilm } from '../core/export';
import { renderScore } from '../sound/score';
import * as P from '../brand/palette';
import * as L from '../brand/logo';






const text = s => ({ content: [{ type: 'text', text: typeof s === 'string' ? s : JSON.stringify(s, null, 2) }] });
const err = s => ({ isError: true, content: [{ type: 'text', text: String(s) }] });
const image = (file, mime = 'image/png') => ({ type: 'image', data: fs.readFileSync(file).toString('base64'), mimeType: mime });
const film = id => { const f = resolveFilm(id); if (!f) throw new Error(`Unknown film "${id}". Available: ${listFilms().map(x => x.id).join(', ') || '(none — create one with create_film)'}`); return f; };
const versionsOf = f => { const d = path.join(f.dir, 'projects'); return fs.existsSync(d) ? fs.readdirSync(d).filter(x => x.endsWith('.json')).map(x => x.slice(0, -5)) : []; };
const wrap = fn => async a => { try { return await fn(a); } catch (e) { return err(e && e.message || e); } };
const DOCS: Record<string, string> = { spec: 'docs/FILM_SPEC.md', runtime: 'docs/RUNTIME.md', sound: 'docs/SOUND.md', brand: 'docs/BRAND.md', variants: 'docs/VARIANTS.md', accessibility: 'docs/ACCESSIBILITY.md', rtl: 'docs/RTL.md' };

function build() {
  const s = new McpServer({ name: 'seekframe', version: pkg.version });

  s.tool('read_docs', 'Read a Seekframe guide. ALWAYS read "spec" before writing or changing a film. Topics: ' + Object.keys(DOCS).join(', '),
    { topic: z.enum(Object.keys(DOCS) as [string, ...string[]]).default('spec') }, wrap(async ({ topic }) => { const f = path.join(ROOT, DOCS[topic]); return text(fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : `(${DOCS[topic]} is not written yet)`); }));

  s.tool('list_films', 'List the films in this workspace (films/ = yours, examples/ = gallery) with their saved versions.', {}, wrap(async () => text(listFilms().map(f => ({ id: f.id, folder: `${f.root}/${f.id}`, versions: versionsOf(f) })))));

  s.tool('get_film', 'Open a film and return its manifest summary: scenes, editable params (id, type, label, scene, default, options), audio tracks, cue count, variants.',
    { film: z.string(), version: z.string().optional() }, wrap(async ({ film: id, version }) => {
      const f = film(id); const pf = version && path.join(f.dir, 'projects', slug(version) + '.json');
      const { browser, manifest } = await openFilm(f.dir, pf && fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {}); await browser.close();
      return text({ id: f.id, folder: `${f.root}/${f.id}`, title: manifest.title, size: `${manifest.width}x${manifest.height}`, fps: manifest.fps, seconds: manifest.duration / manifest.fps, scenes: manifest.scenes, params: (manifest.params || []).map(({ id, type, label, scene, default: d, options, min, max }) => ({ id, type, label, scene, default: d, options, min, max })), audio: manifest.audio, cues: (manifest.cues || []).length, variants: manifest.variants, versions: versionsOf(f) });
    }));

  s.tool('create_film', 'Scaffold films/<name> from the blank template (runtime + brand kit + cues already wired). Then edit films/<name>/film.js.',
    { name: z.string(), width: z.number().int().optional(), height: z.number().int().optional(), fps: z.number().optional() }, wrap(async a => {
      const r = scaffoldFilm(a); return text(`Created films/${r.id}${r.brand ? ' with the workspace brand kit' : ''}. Edit films/${r.id}/film.js, then call validate_film.`);
    }));

  s.tool('validate_film', 'Check a film against the contract (determinism, params really change the picture, audio, cues, no network, photosensitivity). Returns failures and warnings. Fix every failure and read every warning.',
    { film: z.string(), fast: z.boolean().optional().describe('skip the slow per-param effect check') }, wrap(async ({ film: id, fast }) => {
      const lines: string[] = []; const r = await validate(film(id).dir, { fast: !!fast, log: m => lines.push(m), color: false });
      return text({ passed: r.fail.length === 0, failures: r.fail, warnings: r.warn, passedChecks: r.ok.length, log: lines.join('\n') });
    }));

  s.tool('review_film', 'Render stills and a contact sheet per saved version, and check text overflow, WCAG text contrast and flashing. Returns the report AND the contact sheet image(s) so you can LOOK at the film. Always do this before saying a film is done.',
    { film: z.string(), version: z.string().optional() }, wrap(async ({ film: id, version }) => {
      const out = path.join(os.tmpdir(), 'seekframe-review-' + Date.now()), lines: string[] = [];
      const r = await review(film(id), { version, out, log: m => lines.push(m.replace(/\x1b\[[0-9;]*m/g, '')) });
      const content: any[] = [{ type: 'text', text: JSON.stringify({ failures: r.fail, warnings: r.warn, versions: Object.fromEntries(Object.entries(r.report.versions).map(([v, x]) => [v, { issues: x.issues, maxFlashesPerSecond: x.maxFlashesPerSecond }])) }, null, 2) }];
      for (const v of Object.values(r.report.versions)) if (v.sheet) { const f = path.join(out, path.basename(v.sheet)); if (fs.existsSync(f)) content.push(image(f, 'image/jpeg')); }
      return { content };
    }));

  s.tool('render_stills', 'Render specific frames (edited timeline, at the film fps) as images to inspect them.',
    { film: z.string(), frames: z.array(z.number()).min(1).max(6), version: z.string().optional(), params: z.record(z.any()).optional() }, wrap(async ({ film: id, frames, version, params }) => {
      const f = film(id); const pf = version && path.join(f.dir, 'projects', slug(version) + '.json');
      let project = pf && fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {}; if (params) project = { ...project, params: { ...(project.params || {}), ...params } };
      const { browser, page, manifest } = await openFilm(f.dir, project), tl = Timeline.build(manifest, project), content: any[] = [];
      for (const fr of frames) { await page.evaluate(x => window.seek(x), Timeline.sourceFrame(tl, Math.min(fr, tl.total - 1)).src); const file = path.join(os.tmpdir(), `sf-still-${Date.now()}-${fr}.png`); fs.writeFileSync(file, await page.screenshot({ type: 'png' })); content.push({ type: 'text', text: `frame ${fr}` }, image(file)); fs.rmSync(file); }
      await browser.close(); return { content };
    }));

  s.tool('set_params', 'Create or update a saved version (films/<film>/projects/<version>.json): merge param values and optionally set the scene order/lengths. Param ids come from get_film.',
    { film: z.string(), version: z.string().default('default'), params: z.record(z.any()).optional(), clips: z.array(z.object({ scene: z.string(), frames: z.number().optional(), in: z.number().optional(), out: z.number().optional() })).optional() }, wrap(async ({ film: id, version, params, clips }) => {
      const f = film(id), file = path.join(f.dir, 'projects', slug(version) + '.json'); fs.mkdirSync(path.dirname(file), { recursive: true });
      const cur = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { version: 1 }; if (params) cur.params = { ...(cur.params || {}), ...params }; if (clips) cur.clips = clips;
      fs.writeFileSync(file, JSON.stringify(cur, null, 2)); return text({ saved: path.relative(ROOT, file), project: cur });
    }));

  s.tool('render_film', 'Export a saved version (or the defaults) to MP4 in output/. Takes roughly the film length at 30 fps; use fps 60 for finals. Audio (including the generated score) is mixed in.',
    { film: z.string(), version: z.string().optional(), fps: z.number().default(30), size: z.string().optional().describe('WxH, only for films that declare sizes') }, wrap(async ({ film: id, version, fps, size }) => {
      const f = film(id); const pf = version && path.join(f.dir, 'projects', slug(version) + '.json');
      if (version && !fs.existsSync(pf)) throw new Error(`no saved version "${version}" (have: ${versionsOf(f).join(', ') || 'none'})`);
      const project = version ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {}, out = path.join(ROOT, 'output', `${f.id}-${slug(version || 'default')}.mp4`);
      const r = await exportFilm({ film: f, project, fps, size: size || null, out, generateScore: async (t, m) => { const w = path.join(os.tmpdir(), `sf-mcp-score-${Date.now()}.wav`); await renderScore({ manifest: m, theme: (m.soundtrack && m.soundtrack.theme) || 'deep', out: w, rtl: !!(m.lang && m.lang.rtl) }); return w; } });
      return text(`Rendered ${path.relative(ROOT, out)} (${r.seconds.toFixed(1)} s, ${fps} fps).`);
    }));

  s.tool('check_sound_sync', 'Compare the generated score with the picture: sound cues with nothing happening on screen, and big picture changes with no sound.',
    { film: z.string(), version: z.string().optional() }, wrap(async ({ film: id, version }) => {
      const lines: string[] = []; const r = await sync(film(id), { version, log: m => lines.push(m.replace(/\x1b\[[0-9;]*m/g, '')) }); return text(lines.join('\n'));
    }));

  s.tool('generate_score', 'Render the film\'s cues to a wav with a sound theme (deep, bright, minimal).',
    { film: z.string(), version: z.string().optional(), theme: z.enum(['deep', 'bright', 'minimal']).optional() }, wrap(async ({ film: id, version, theme }) => {
      const f = film(id); const pf = version && path.join(f.dir, 'projects', slug(version) + '.json');
      const { browser, manifest } = await openFilm(f.dir, pf && fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {}); await browser.close();
      if (!(manifest.cues || []).length) throw new Error('this film declares no cues (see read_docs sound)');
      const out = path.join(ROOT, 'output', `${f.id}-${slug(version || 'default')}-score.wav`); fs.mkdirSync(path.dirname(out), { recursive: true });
      const r = await renderScore({ manifest, theme: theme || (manifest.soundtrack && manifest.soundtrack.theme) || 'deep', out, rtl: !!(manifest.lang && manifest.lang.rtl) });
      return text(`Wrote ${path.relative(ROOT, out)} (${manifest.cues.length} cues, input ${r.inputLUFS} LUFS → -16).`);
    }));

  s.tool('brand_palette', 'Extract a palette from an image (logo or screenshot): colours, suggested accent/ink/paper/muted, and WCAG contrast of the combinations.',
    { image: z.string().describe('path to a png/jpg') }, wrap(async ({ image: file }) => {
      const cols = P.palette(file, 5), r = P.roles(cols), c = (a, b) => +P.contrast(P.unhex(a), P.unhex(b)).toFixed(2);
      return text({ colors: cols, roles: r, contrast: { 'ink on paper': c(r.ink, r.paper), 'muted on paper': c(r.muted, r.paper), 'accent on ink': c(r.accent, r.ink), 'accent on paper': c(r.accent, r.paper), 'ink on accent': c(r.ink, r.accent) }, note: 'WCAG AA needs 4.5:1 for small text, 3:1 for large text.' });
    }));

  s.tool('brand_import_logo', 'Trace a raster logo to SVG and (optionally) extract animatable centre-line strokes. Writes brand/assets/logo.svg, logo-strokes.json and a preview.',
    { file: z.string(), strokes: z.boolean().default(true), colors: z.number().int().default(3), dir: z.string().default('brand') }, wrap(async ({ file, strokes, colors, dir }) => {
      const out = path.join(path.resolve(ROOT, dir), 'assets'); fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, 'logo.svg'), L.toSVG(file, { colors: 6 })); const res: any = { svg: path.relative(ROOT, path.join(out, 'logo.svg')) };
      if (strokes) { const j = L.strokes(file, { colors }); fs.writeFileSync(path.join(out, 'logo-strokes.json'), JSON.stringify(j, null, 2)); fs.writeFileSync(path.join(out, 'logo-strokes.svg'), L.strokesSVG(j, { bg: true })); res.strokes = j.strokes.length; res.preview = path.relative(ROOT, path.join(out, 'logo-strokes.svg')); }
      return text({ ...res, next: 'Open the preview, drop stray strokes from logo-strokes.json, then run `seekframe brand build`.' });
    }));

  return s;
}
async function start() { const s = build(); await s.connect(new StdioServerTransport()); console.error('seekframe MCP server ready (stdio)'); }
export { start, build };

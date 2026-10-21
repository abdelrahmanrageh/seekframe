// seekframe review <film> --craft  (MCP: critique_film)
// Measures what the existing checks do not: is the film GOOD, not just correct. Renders the film headless, measures text sizes,
// how much of the frame the content fills, how the picture moves over time and what the generated score does, then returns a 0-100
// score and a ranked fix list in plain words. Scoring and thresholds live in craft-checks.ts.
import type { Cue, FilmRef, Manifest } from '../types';
import { ensureBrands, BROWSER_DIR, ROOT } from './workspace';
import { ffmpegPath } from './ffmpeg';
import { probeText, probeBoxes, type ProbeResult, type BoxesResult } from './probe';
import * as Timeline from './timeline';
import * as C from './craft-checks';
import { renderScore } from '../sound/score';
import { sync } from '../sound/sync';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';

export interface CraftOptions { version?: string; all?: boolean; out?: string; log?: (line: string) => void; thresholds?: Partial<C.Thresholds>; sound?: boolean }
export interface CraftResult { score: number; versions: Record<string, C.CraftReport>; seconds: number }

const GRID = 4;                         // screenshots are 0.2x; average 4x4 blocks -> a 96x54 sample per frame
type Sample = { rgb: Uint8Array; lum: number };
function sample(png: PNG): Sample {
  const w = Math.floor(png.width / GRID), h = Math.floor(png.height / GRID), rgb = new Uint8Array(w * h * 3); let lum = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0; for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) { const k = ((y * GRID + j) * png.width + x * GRID + i) * 4; r += png.data[k]; g += png.data[k + 1]; b += png.data[k + 2]; }
    const o = (y * w + x) * 3, n = GRID * GRID; rgb[o] = r / n; rgb[o + 1] = g / n; rgb[o + 2] = b / n;
    lum += .2126 * rgb[o] + .7152 * rgb[o + 1] + .0722 * rgb[o + 2];
  }
  return { rgb, lum: lum / (w * h) / 255 };
}
function changed(a: Sample, b: Sample): number {
  let n = 0; const d = a.rgb, e = b.rgb, len = d.length / 3;
  for (let i = 0; i < d.length; i += 3) if (Math.abs(d[i] - e[i]) + Math.abs(d[i + 1] - e[i + 1]) + Math.abs(d[i + 2] - e[i + 2]) > 40) n++;
  return n / len;
}

const NOISY = new Set(['swipe', 'whoosh', 'tick', 'key', 'hat', 'shaker', 'glitch', 'blip', 'scribble']);
function mixStats(wav: string, cues: Cue[], fps: number): { rmsDb: number[]; burst: { n: number; at: number } } {
  const raw = spawnSync(ffmpegPath(), ['-v', 'error', '-i', wav, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], { maxBuffer: 1 << 29 }).stdout;
  const x = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4)), seg = 1600, rmsDb: number[] = [];
  for (let i = 0; i + seg <= x.length; i += seg) { let s = 0; for (let k = i; k < i + seg; k++) s += x[k] * x[k]; rmsDb.push(10 * Math.log10(s / seg + 1e-12)); }
  const t = cues.filter(c => NOISY.has(c.kind)).map(c => c.f / fps).sort((a, b) => a - b); let n = 0, at = 0;
  for (let i = 0, j = 0; i < t.length; i++) { while (t[i] - t[j] >= 1) j++; if (i - j + 1 > n) { n = i - j + 1; at = t[j]; } }
  return { rmsDb, burst: { n, at } };
}
function soundStats(wav: string, manifest: Manifest, seconds: number): C.SoundStats {
  const out = spawnSync(ffmpegPath(), ['-hide_banner', '-i', wav, '-af', 'silencedetect=noise=-50dB:d=0.5,ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
  const silences: Array<[number, number]> = []; let open: number | null = null;
  for (const m of out.matchAll(/silence_(start|end): (-?[\d.]+)/g)) { const t = +m[2]; if (m[1] === 'start') open = Math.max(0, t); else if (open !== null) { silences.push([open, t]); open = null; } }
  if (open !== null) silences.push([open, seconds]);
  const sum = out.slice(out.lastIndexOf('Summary')), lufs = +(/\n\s*I:\s+(-?[\d.]+) LUFS/.exec(sum) || [])[1], tp = +(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum) || [])[1];
  const cues = manifest.cues || [], fps = manifest.fps;
  const mix = mixStats(wav, manifest.cues || [], manifest.fps);
  return { ...mix, seconds, silences, lufs, truePeak: Number.isFinite(tp) ? tp : -99, target: (manifest.soundtrack && manifest.soundtrack.loudness) ?? -16, hasCues: cues.length > 0,
    cueCount: cues.filter(c => c.kind !== 'silence').length, pauses: cues.filter(c => c.kind === 'silence').map(c => [c.f / fps, (c.to ?? c.f + 1) / fps] as [number, number]) };
}

async function craft(film: FilmRef, o: CraftOptions = {}): Promise<CraftResult> {
  ensureBrands();
  const t0 = Date.now(), log = o.log || (() => {}), T = { ...C.DEFAULTS, ...(o.thresholds || {}) }, out = path.resolve(o.out || path.join(ROOT, 'output', 'review'));
  fs.mkdirSync(out, { recursive: true });
  const pd = path.join(film.dir, 'projects'), saved = fs.existsSync(pd) ? fs.readdirSync(pd).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)) : [];
  const versions = o.version ? [o.version] : (saved.length ? saved : ['default']);
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const result: CraftResult = { score: 0, versions: {}, seconds: 0 };
  log(`Craft review of ${film.id} (${versions.length} version${versions.length > 1 ? 's' : ''})`);
  try {
    for (const v of versions) {
      const pf = path.join(pd, v + '.json'), project = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {};
      const probe = await browser.newPage({ viewport: { width: 1280, height: 720 } }); await probe.goto('file://' + path.join(film.dir, 'film.html')); await probe.evaluate(() => window.ready);
      const m0 = await probe.evaluate(() => ({ w: window.manifest.width, h: window.manifest.height })); await probe.close();
      const pg = await browser.newPage({ viewport: { width: m0.w, height: m0.h }, deviceScaleFactor: .2 }); await pg.goto('file://' + path.join(film.dir, 'film.html')); await pg.evaluate(() => window.ready);
      await pg.addScriptTag({ path: path.join(BROWSER_DIR, 'timeline.js') });
      const manifest: Manifest = await pg.evaluate(p => JSON.parse(JSON.stringify(Timeline.applyToFilm(window, p))), project.params || {});
      const tl = Timeline.build(manifest, project), fps = manifest.fps, short = Math.min(manifest.width, manifest.height);
      const seekTo = (f: number) => pg.evaluate(x => window.seek(x), Timeline.sourceFrame(tl, Math.min(f, tl.total - 1)).src);
      const problems: string[] = [], allowances: C.Allowance[] = [];

      /* ----- per scene: text, content boxes ----- */
      const scenes: Array<C.SceneProbe & { coverage: number }> = [];
      for (const c of tl.clips) {
        const sc = (manifest.scenes.find(s => s.id === c.scene) || {}) as any, len = c.t1 - c.t0;
        const sa = C.parseAllow(sc.allow, `scene ${c.scene}`); problems.push(...sa.problems); allowances.push(...sa.ok);
        const text: ProbeResult['items'] = []; let cov = 0;
        for (const t of [.35, .55, .85]) {
          await seekTo(c.t0 + len * t);
          const info = await pg.evaluate(probeText as () => ProbeResult), bx = await pg.evaluate(probeBoxes as () => BoxesResult);
          for (const it of info.items) {   // union over the probes; a typewriter's partial lines count once
            const sz = Math.round(it.size), dup = text.findIndex(x => Math.round(x.size) === sz && (x.text.startsWith(it.text) || it.text.startsWith(x.text)));
            if (dup < 0) text.push(it); else if (it.words > text[dup].words) text[dup] = it;
          }
          cov = Math.max(cov, C.extent(bx.boxes, bx.W, bx.H, T.safeMargin));
        }
        for (const it of text) for (const a of it.allow) { const r = C.parseAllow(a, `scene ${c.scene}`); problems.push(...r.problems); for (const x of r.ok) if (!allowances.some(y => y.check === x.check && y.where === x.where && y.reason === x.reason)) allowances.push(x); }
        scenes.push({ id: c.scene, name: sc.name || c.scene, t0: c.t0, t1: c.t1, text, boxes: [], allow: sa.ok, coverage: cov });
      }

      /* ----- picture over time ----- */
      const step = 2, lagN = Math.max(1, Math.round(.25 * fps / step)), samples: Sample[] = [];
      for (let f = 0; f < tl.total; f += step) {
        await seekTo(f); samples.push(sample(PNG.sync.read(await pg.screenshot({ type: 'png' }))));
      }
      const series: C.PictureSeries = { fps, step, lag: [], adj: [], lum: samples.map(s => s.lum), fromStart: [] };
      for (let i = 0; i < samples.length; i++) {
        series.adj.push(i ? changed(samples[i - 1], samples[i]) : 0);
        series.lag.push(i >= lagN ? changed(samples[i - lagN], samples[i]) : (i ? changed(samples[0], samples[i]) : 1));
        const sc = scenes.find(s => i * step >= s.t0 && i * step < s.t1), si = sc ? Math.round(sc.t0 / step) : 0;
        series.fromStart.push(changed(samples[Math.min(si, samples.length - 1)], samples[i]));
      }
      await pg.close();

      const results: C.CheckResult[] = [
        C.checkReadability(scenes, short, T), C.checkOccupancy(scenes, T), C.checkHierarchy(scenes, T), C.checkPacing(scenes, fps, short, T),
        C.checkMotion(series, scenes, T), C.checkEntrances(series, scenes, T), C.checkTransitions(series, scenes, T),
      ];

      /* ----- sound ----- */
      const notMeasured = ['Background dominance (needs a content/background split; not measured yet)'];
      if (o.sound !== false) {
        if (tl.total !== manifest.duration) notMeasured.push('Sound checks (this version edits the timeline; the score is generated from the source timeline)');
        else {
          const wav = path.join(os.tmpdir(), `sf-craft-${process.pid}-${v}.wav`);
          try {
            if (manifest.cues && manifest.cues.length) await renderScore({ manifest: { ...manifest, dir: manifest.dir || film.dir }, theme: (manifest.soundtrack && manifest.soundtrack.theme) || 'deep', out: wav, rtl: !!(manifest.lang && manifest.lang.rtl) });
            const stats: C.SoundStats = manifest.cues && manifest.cues.length ? soundStats(wav, manifest, manifest.duration / fps) : { seconds: manifest.duration / fps, silences: [[0, manifest.duration / fps]], lufs: NaN, truePeak: -99, target: -16, cueCount: 0, pauses: [], hasCues: false };
            results.push(C.checkSilence(stats, scenes, fps, T));
            if (stats.hasCues) {
              results.push(C.checkLoudness(stats, T));
              const sr = await sync(film, { version: v }), sv = sr.versions[v] || sr.versions[Object.keys(sr.versions)[0]];
              if (sv) { const units = Math.max(1, sv.cues + sv.events); results.push({ check: 'sync', units, bad: Math.min(units, sv.issues.length), findings: sv.issues.map(m => ({ check: 'sync' as const, message: m[0].toUpperCase() + m.slice(1) + '.' })) }); }
            }
          } finally { fs.rmSync(wav, { force: true }); }
        }
      }
      const report = C.buildReport(results, allowances, [...new Set(problems)], notMeasured);
      result.versions[v] = report;
      log(`\n[${v}] craft score ${report.score}/100`);
      for (const k of report.categories) log(`  ${k.score === null ? '–' : String(k.score).padStart(3)}  ${k.label}${k.units ? `  (${k.units - Math.min(k.units, k.bad)}/${k.units} ok)` : ''}`);
      if (report.fixes.length) { log('  Fix list (most valuable first):'); report.fixes.slice(0, 15).forEach((f, i) => log(`   ${i + 1}. ${f.message}`)); if (report.fixes.length > 15) log(`   … and ${report.fixes.length - 15} more in the JSON report`); }
      if (report.allowances.length) log(`  ${report.allowances.length} opt-out(s) used (−${report.allowancePenalty} points): ${report.allowances.map(a => `${a.check} (${a.reason})`).join('; ')}`);
      report.problems.forEach(p => log(`  ! ${p}`)); report.notMeasured.forEach(n => log(`  · ${n}`));
    }
  } finally { await browser.close(); }
  const scores = Object.values(result.versions).map(r => r.score); result.score = scores.length ? Math.min(...scores) : 0;
  result.seconds = (Date.now() - t0) / 1000;
  fs.writeFileSync(path.join(out, `${film.id}-craft.json`), JSON.stringify(result, null, 2));
  log(`\nCraft score ${result.score}/100 (${result.seconds.toFixed(0)} s). The score measures craft, not taste: look at the contact sheets too.`);
  return result;
}
export { craft };

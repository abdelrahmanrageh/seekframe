// seekframe sync <film> — checks the generated score against the picture:
//   * "sound without picture": a hit cue (boom/stamp/thud/kick/pluck) where nothing visibly changes within -4..+8 frames
//   * "picture without sound": a big sudden change in the picture (cut, object landing) with no cue within ±6 frames
//   * the score's length and loudness
// Picture changes are measured from low-resolution screenshots (every 2nd frame, source timeline), per saved version.
import type { FilmRef } from '../types';
import { ensureBrands, BROWSER_DIR } from '../core/workspace';
import { ffmpegPath } from '../core/ffmpeg';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { renderScore } from './score';
import { ROOT } from '../core/workspace';






const HIT = new Set(['boom', 'stamp', 'thud', 'kick', 'pluck']);

function changed(a, b) {                                  // fraction of pixels that changed noticeably
  let n = 0; const d = a.data, e = b.data, len = d.length / 4;
  for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - e[i]) + Math.abs(d[i + 1] - e[i + 1]) + Math.abs(d[i + 2] - e[i + 2]) > 60) n++;
  return n / len;
}
async function sync(film: FilmRef, o: { version?: string; log?: (line: string) => void } = {}) {
  ensureBrands();
  const log = o.log || (() => {}), pd = path.join(film.dir, 'projects');
  const versions = o.version ? [o.version] : (fs.existsSync(pd) && fs.readdirSync(pd).some(f => f.endsWith('.json')) ? fs.readdirSync(pd).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)) : ['default']);
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] }); let fail = 0, warn = 0;
  log(`Checking sound ↔ picture for ${film.id} (${versions.length} version${versions.length > 1 ? 's' : ''})`);
  for (const v of versions) {
    const pf = path.join(pd, v + '.json'), project = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {};
    const probe = await browser.newPage(); await probe.goto('file://' + path.join(film.dir, 'film.html')); await probe.evaluate(() => window.ready);
    const m0 = await probe.evaluate(() => ({ w: window.manifest.width, h: window.manifest.height })); await probe.close();
    const page = await browser.newPage({ viewport: { width: m0.w, height: m0.h }, deviceScaleFactor: .2 }); await page.goto('file://' + path.join(film.dir, 'film.html')); await page.evaluate(() => window.ready);
    await page.addScriptTag({ path: path.join(BROWSER_DIR, 'timeline.js') });
    const manifest = await page.evaluate(p => JSON.parse(JSON.stringify(Timeline.applyToFilm(window, p))), project.params || {});
    const cues = manifest.cues || [];
    if (!cues.length) { log(`  [${v}] no cues declared`); await page.close(); continue; }
    // audio: length + loudness
    const tmp = path.join(os.tmpdir(), `sf-sync-${process.pid}.wav`);
    await renderScore({ manifest, theme: (manifest.soundtrack && manifest.soundtrack.theme) || 'deep', out: tmp, rtl: !!(manifest.lang && manifest.lang.rtl) });
    const ff = ffmpegPath();
    const probeA = spawnSync(ff, ['-hide_banner', '-i', tmp, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
    const lufs = +(/\n\s*I:\s+(-?[\d.]+) LUFS/.exec(probeA.slice(probeA.lastIndexOf('Summary'))) || [])[1], dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(probeA);
    const secs = dur ? (+dur[1]) * 3600 + (+dur[2]) * 60 + (+dur[3]) : NaN; fs.rmSync(tmp, { force: true });
    const want = manifest.duration / manifest.fps;
    if (Math.abs(secs - want) > .1) { fail++; log(`  \x1b[31m✘\x1b[0m [${v}] score is ${secs.toFixed(2)} s but the film is ${want.toFixed(2)} s`); }
    // picture activity series
    const step = 2, series = []; let prev = null;
    for (let f = 0; f < manifest.duration; f += step) { await page.evaluate(x => window.seek(x), f); const png = PNG.sync.read(await page.screenshot({ type: 'png' })); series.push(prev ? changed(prev, png) : 0); prev = png; }
    await page.close();
    const act = (a, b) => { let mx = 0; for (let f = Math.max(0, a); f <= Math.min(manifest.duration - 1, b); f += step) mx = Math.max(mx, series[Math.floor(f / step)] || 0); return mx; };
    const issues = [];
    for (const c of cues) if (HIT.has(c.kind) && act(c.f - 4, c.f + 8) < .004) issues.push(`sound without picture: ${c.kind} at frame ${Math.round(c.f)} (${(c.f / manifest.fps).toFixed(2)} s) — nothing visibly changes there`);
    const times = cues.filter(c => HIT.has(c.kind) || c.kind === 'silence').map(c => c.f), events = [];
    for (let k = 1; k < series.length - 1; k++) if (series[k] > .18 && series[k] >= series[k - 1] && series[k] >= series[k + 1]) events.push(k * step);
    for (const f of events) if (!times.some(t => Math.abs(t - f) <= 6) && !cues.some(c => Math.abs(c.f - f) <= 6)) issues.push(`picture without sound: big change at frame ${f} (${(f / manifest.fps).toFixed(2)} s) has no cue within ±6 frames`);
    const uniq = [...new Set(issues)];
    for (const i of uniq) { warn++; log(`  \x1b[33m!\x1b[0m [${v}] ${i}`); }
    const loud = Number.isFinite(lufs) && Math.abs(lufs + 16) > 1.5 ? ` (loudness ${lufs} LUFS)` : '';
    log(`  ${uniq.length ? '' : '\x1b[32m✔\x1b[0m '}[${v}] ${cues.length} cues, ${events.length} big picture events, ${uniq.length} mismatch(es)${loud}`);
  }
  await browser.close();
  log(`\n${fail ? '\x1b[31mFAILED\x1b[0m' : '\x1b[32mdone\x1b[0m'} — ${fail} failure(s), ${warn} warning(s)`);
  return { fail, warn };
}
export { sync };

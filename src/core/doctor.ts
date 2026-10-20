// seekframe doctor — is this machine ready to render? (also shown in the editor)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PKG_ROOT, BROWSER_DIR } from './workspace';
import { ffmpegPath } from './ffmpeg';

export interface Check { name: string; ok: boolean; detail: string; fix?: string }
export interface DoctorReport { ok: boolean; checks: Check[] }

export async function doctor(): Promise<DoctorReport> {
  const checks: Check[] = [];
  const major = +process.versions.node.split('.')[0];
  checks.push({ name: 'Node.js', ok: major >= 20, detail: `v${process.versions.node}`, fix: major >= 20 ? undefined : 'Install Node 20 or newer (https://nodejs.org).' });
  try {
    const { chromium } = await import('playwright'); const exe = chromium.executablePath();
    checks.push({ name: 'Chromium (renders the frames)', ok: fs.existsSync(exe), detail: fs.existsSync(exe) ? exe.replace(process.env.HOME || '', '~') : 'not installed', fix: fs.existsSync(exe) ? undefined : 'Run: npx playwright install chromium' });
  } catch (e: any) { checks.push({ name: 'Playwright', ok: false, detail: e.message, fix: 'Run: npm install' }); }
  try { const f = ffmpegPath(); const v = spawnSync(f, ['-version']).stdout?.toString().split('\n')[0] || ''; checks.push({ name: 'ffmpeg (encodes MP4, mixes sound)', ok: true, detail: `${process.env.SEEKFRAME_FFMPEG ? 'custom' : f === 'ffmpeg' ? 'system' : 'bundled'}: ${v.replace('ffmpeg version ', '').slice(0, 40)}` }); }
  catch (e: any) { checks.push({ name: 'ffmpeg', ok: false, detail: 'not found', fix: 'Install ffmpeg (e.g. brew install ffmpeg), or run `npm rebuild ffmpeg-static`, or set SEEKFRAME_FFMPEG to a binary.' }); }
  checks.push({ name: 'Browser bundles (dist/)', ok: fs.existsSync(path.join(BROWSER_DIR, 'runtime.js')), detail: fs.existsSync(path.join(BROWSER_DIR, 'runtime.js')) ? 'built' : 'missing', fix: 'Run: npm run build (inside the seekframe folder)' });
  let writable = true; try { fs.mkdirSync(path.join(ROOT, 'output'), { recursive: true }); fs.accessSync(path.join(ROOT, 'output'), fs.constants.W_OK); } catch { writable = false; }
  checks.push({ name: 'Workspace', ok: writable, detail: ROOT === PKG_ROOT ? `${ROOT} (this clone)` : ROOT, fix: writable ? undefined : 'The folder is not writable.' });
  checks.push({ name: 'Brand kit', ok: fs.existsSync(path.join(ROOT, 'brand', 'brand.json')) || ROOT === PKG_ROOT, detail: fs.existsSync(path.join(ROOT, 'brand', 'brand.json')) ? 'brand/brand.json found' : 'none yet (optional)', fix: 'Set it up in the editor (Brand tab) or: seekframe brand init' });
  return { ok: checks.filter(c => !/Brand kit/.test(c.name)).every(c => c.ok), checks };
}
export function printDoctor(r: DoctorReport, log: (m: string) => void = console.log): void {
  for (const c of r.checks) log(`  ${c.ok ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m'} ${c.name}: ${c.detail}${c.ok || !c.fix ? '' : `\n      → ${c.fix}`}`);
  log(r.ok ? '\nReady to make films.' : '\nFix the items marked ✘ above, then run `seekframe doctor` again.');
}

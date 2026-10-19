// Palette extraction (k-means over pixels) + WCAG contrast helpers.
import { ffmpegPath } from '../core/ffmpeg';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';



import { hex, unhex, lum, contrast } from '../core/color';

// any raster format -> {width,height,data(RGBA)} (png natively, others via ffmpeg)
function loadImage(file) {
  if (/\.png$/i.test(file)) return PNG.sync.read(fs.readFileSync(file));
  const ff = ffmpegPath();
  const tmp = path.join(os.tmpdir(), 'sf-img-' + process.pid + '.png');
  const r = spawnSync(ff, ['-v', 'error', '-y', '-i', file, '-frames:v', '1', tmp]); if (r.status) throw new Error('cannot read image: ' + file);
  const p = PNG.sync.read(fs.readFileSync(tmp)); fs.rmSync(tmp); return p;
}

function kmeans(px: number[][], k: number, iters = 12): Array<{ rgb: number[]; n: number }> {
  let seed = 3; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const cen: number[][] = [px[Math.floor(rnd() * px.length)].slice()];            // k-means++ init
  while (cen.length < k) {
    const d = px.map(p => Math.min(...cen.map(c => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2))), sum = d.reduce((a, b) => a + b, 0); let t = rnd() * sum, i = 0;
    while (i < d.length - 1 && (t -= d[i]) > 0) i++; cen.push(px[i].slice());
  }
  let cnt = new Array(k).fill(0);
  for (let it = 0; it < iters; it++) {
    const acc: number[][] = cen.map(() => [0, 0, 0, 0]); cnt = new Array(k).fill(0);
    for (const p of px) { let b = 0, bd = 1e18; for (let j = 0; j < k; j++) { const d = (p[0] - cen[j][0]) ** 2 + (p[1] - cen[j][1]) ** 2 + (p[2] - cen[j][2]) ** 2; if (d < bd) { bd = d; b = j; } } acc[b][0] += p[0]; acc[b][1] += p[1]; acc[b][2] += p[2]; acc[b][3]++; cnt[b]++; }
    for (let j = 0; j < k; j++) if (acc[j][3]) cen[j] = [acc[j][0] / acc[j][3], acc[j][1] / acc[j][3], acc[j][2] / acc[j][3]];
  }
  return cen.map((c, j) => ({ rgb: c, n: cnt[j] })).sort((a, b) => b.n - a.n);
}
function palette(file, k = 5) {
  const img = loadImage(file), px: number[][] = []; const step = Math.max(1, Math.floor(Math.sqrt(img.width * img.height / 40000)));
  for (let y = 0; y < img.height; y += step) for (let x = 0; x < img.width; x += step) { const i = (y * img.width + x) * 4; if (img.data[i + 3] > 200) px.push([img.data[i], img.data[i + 1], img.data[i + 2]]); }
  const total = px.length, cl = kmeans(px, Math.min(k, 8)).filter(c => c.n / total > .003);
  return cl.map(c => ({ hex: hex(c.rgb), share: +(c.n / total).toFixed(3), rgb: c.rgb.map(Math.round) }));
}
// pick roles: paper = lightest large cluster, ink = darkest, accent = most saturated (non-grey), muted = mid grey
/** Pick brand roles from palette clusters {hex, rgb, share}:
 *  paper = the biggest light cluster, ink = the biggest dark one, accent = the most saturated colour (it must not be paper or ink),
 *  muted = a grey from the logo that reads on paper (>= 4.5:1) and is clearly not paper itself, otherwise a mix of ink and paper tuned to ~4.6:1. */
function roles(cols: Array<{ hex: string; rgb: number[]; share?: number }>) {
  const sat = (c: { rgb: number[] }) => { const m = Math.max(...c.rgb), n = Math.min(...c.rgb); return m ? (m - n) / m : 0; };
  const L = (c: { rgb: number[] }) => lum(c.rgb), share = (c: { share?: number }) => c.share ?? 0;
  const bySharePick = (list: typeof cols, fallback: typeof cols[number]) => [...list].sort((a, b) => share(b) - share(a))[0] || fallback;
  const lightest = [...cols].sort((a, b) => L(b) - L(a))[0], darkest = [...cols].sort((a, b) => L(a) - L(b))[0];
  const paper = bySharePick(cols.filter(c => L(c) > .45 && sat(c) < .35), lightest), ink = bySharePick(cols.filter(c => L(c) < .2 && c !== paper), darkest);
  const accent = [...cols.filter(c => c !== paper && c !== ink)].sort((a, b) => sat(b) - sat(a))[0] || [...cols].sort((a, b) => sat(b) - sat(a))[0];
  const readable = (c: { rgb: number[] }) => contrast(c.rgb, paper.rgb) >= 4.5;
  const greys = cols.filter(c => c !== paper && c !== ink && c !== accent && sat(c) < .3 && readable(c) && contrast(c.rgb, ink.rgb) >= 2);
  let muted: string;
  if (greys.length) muted = greys.sort((a, b) => contrast(a.rgb, paper.rgb) - contrast(b.rgb, paper.rgb))[0].hex;   // closest to 4.5:1: the softest readable grey
  else { let lo = 0, hi = 1; for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2, m = paper.rgb.map((v, k) => v + (ink.rgb[k] - v) * mid); if (contrast(m, paper.rgb) >= 4.6) hi = mid; else lo = mid; } muted = hex(paper.rgb.map((v, k) => v + (ink.rgb[k] - v) * hi)); }
  return { accent: accent.hex, ink: ink.hex, paper: paper.hex, muted };
}
export { palette, roles, contrast, hex, unhex, lum, loadImage };

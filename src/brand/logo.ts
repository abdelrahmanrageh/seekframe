// Logo tools: raster -> SVG (imagetracerjs, public domain) and raster -> animatable centre-line strokes.
//   seekframe brand import-logo logo.png [--strokes] [--colors 3] [--out brand/assets]
import fs from 'node:fs';
import path from 'node:path';
import { loadImage, hex } from './palette';
import ImageTracer from 'imagetracerjs';
import * as km from './palette';
type PixelPath = number[];
type StrokeRecord = { color: string; width: number; d: string; length: number };



/* ---------- helpers ---------- */
function downscale(img, maxSize) {
  const s = Math.min(1, maxSize / Math.max(img.width, img.height)); if (s === 1) return { w: img.width, h: img.height, data: img.data, s };
  const w = Math.round(img.width * s), h = Math.round(img.height * s), d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.floor(x / s), x1 = Math.max(x0 + 1, Math.floor((x + 1) / s)), y0 = Math.floor(y / s), y1 = Math.max(y0 + 1, Math.floor((y + 1) / s)); let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = y0; yy < y1 && yy < img.height; yy++) for (let xx = x0; xx < x1 && xx < img.width; xx++) { const i = (yy * img.width + xx) * 4; r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; a += img.data[i + 3]; n++; }
    const o = (y * w + x) * 4; d[o] = r / n; d[o + 1] = g / n; d[o + 2] = b / n; d[o + 3] = a / n;
  }
  return { w, h, data: d, s };
}
// flatten alpha onto white
function flatten(im) { const d = new Uint8ClampedArray(im.data); for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; for (let c = 0; c < 3; c++) d[i + c] = d[i + c] * a + 255 * (1 - a); d[i + 3] = 255; } return { ...im, data: d }; }
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/* ---------- raster -> svg ---------- */
function toSVG(file, { colors = 6 } = {}) {
  const im = loadImage(file);
  const flat = flatten({ w: im.width, h: im.height, data: im.data });
  return ImageTracer.imagedataToSVG({ width: im.width, height: im.height, data: flat.data }, { numberofcolors: colors, ltres: 1, qtres: 1, pathomit: 12, colorquantcycles: 3, strokewidth: 0, roundcoords: 1, viewbox: true, desc: false });
}

/* ---------- raster -> centre-line strokes ---------- */
function backgroundColor(im) {
  const m = new Map(); const add = (x, y) => { const i = (y * im.w + x) * 4, k = [im.data[i] >> 4, im.data[i + 1] >> 4, im.data[i + 2] >> 4].join(); m.set(k, (m.get(k) || 0) + 1); };
  for (let x = 0; x < im.w; x++) { add(x, 0); add(x, im.h - 1); } for (let y = 0; y < im.h; y++) { add(0, y); add(im.w - 1, y); }
  const k = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(v => v * 16 + 8); return k;
}
function components(mask, w, h, minArea) {          // 8-connected labelling, removes small blobs
  const lab = new Int32Array(w * h), sizes: number[] = []; let n = 0; const stack: number[] = [];
  for (let i = 0; i < w * h; i++) if (mask[i] && !lab[i]) {
    n++; let sz = 0; stack.push(i); lab[i] = n;
    while (stack.length) { const p = stack.pop()!; sz++; const x = p % w, y = (p / w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const q = yy * w + xx; if (mask[q] && !lab[q]) { lab[q] = n; stack.push(q); } } }
    sizes[n] = sz;
  }
  const out = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) if (lab[i] && sizes[lab[i]] >= minArea) out[i] = 1; return out;
}
function thin(mask, w, h) {                         // Zhang-Suen thinning
  const m = Uint8Array.from(mask); let changed = true;
  const P = i => [m[i - w], m[i - w + 1], m[i + 1], m[i + w + 1], m[i + w], m[i + w - 1], m[i - 1], m[i - w - 1]];   // p2..p9 clockwise
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      const del: number[] = [];
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x; if (!m[i]) continue; const p = P(i); const B = p.reduce((a, b) => a + b, 0); if (B < 2 || B > 6) continue;
        let A = 0; for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) A++; if (A !== 1) continue;
        if (pass === 0 ? (p[0] * p[2] * p[4] || p[2] * p[4] * p[6]) : (p[0] * p[2] * p[6] || p[0] * p[4] * p[6])) continue;
        del.push(i);
      }
      if (del.length) { changed = true; for (const i of del) m[i] = 0; }
    }
  }
  return m;
}
function distanceTransform(mask, w, h) {            // two-pass chamfer (3-4)
  const d = new Float32Array(w * h).fill(1e9); for (let i = 0; i < w * h; i++) if (!mask[i]) d[i] = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!d[i]) continue; let v = d[i]; if (x) v = Math.min(v, d[i - 1] + 1); if (y) { v = Math.min(v, d[i - w] + 1); if (x) v = Math.min(v, d[i - w - 1] + 1.414); if (x < w - 1) v = Math.min(v, d[i - w + 1] + 1.414); } d[i] = v; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; let v = d[i]; if (x < w - 1) v = Math.min(v, d[i + 1] + 1); if (y < h - 1) { v = Math.min(v, d[i + w] + 1); if (x < w - 1) v = Math.min(v, d[i + w + 1] + 1.414); if (x) v = Math.min(v, d[i + w - 1] + 1.414); } d[i] = v; }
  return d;
}
function tracePaths(sk, w, h) {                     // skeleton pixels -> ordered pixel paths
  const vis = new Uint8Array(w * h), N8: number[][] = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
  const nb = (i: number): number[] => { const x = i % w, y = (i / w) | 0, o: number[] = []; for (const [dx, dy] of N8) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && sk[yy * w + xx]) o.push(yy * w + xx); } return o; };
  const deg = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) if (sk[i]) deg[i] = nb(i).length;
  const starts: number[] = []; for (let i = 0; i < w * h; i++) if (sk[i] && deg[i] === 1) starts.push(i);
  for (let i = 0; i < w * h; i++) if (sk[i] && deg[i] > 1) starts.push(i);
  const paths: PixelPath[] = [];
  for (const s of starts) {
    if (vis[s]) continue; const path: PixelPath = [s]; vis[s] = 1; let cur = s;
    for (;;) { const c = nb(cur).filter(q => !vis[q]); if (!c.length) break; c.sort((a, b) => Number(deg[a] > 2) - Number(deg[b] > 2)); const nx = c[0]; vis[nx] = 1; path.push(nx); cur = nx; }
    if (path.length > 1) paths.push(path);
  }
  return paths;
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts; let dmax = 0, idx = 0; const [a, b] = [pts[0], pts[pts.length - 1]], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > dmax) { dmax = d; idx = i; } }
  if (dmax > eps) { const l = rdp(pts.slice(0, idx + 1), eps), r = rdp(pts.slice(idx), eps); return l.slice(0, -1).concat(r); }
  return [a, b];
}
function smoothPath(p) {                            // Catmull-Rom -> cubic bezier
  const f = n => +n.toFixed(1); let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  if (p.length === 2) return d + ` L${f(p[1][0])} ${f(p[1][1])}`;
  for (let i = 0; i < p.length - 1; i++) { const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2; d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`; }
  return d;
}

function strokes(file, { colors = 3, maxSize = 720, minArea = 150 } = {}) {
  const orig = loadImage(file), im = flatten(downscale(orig, maxSize)), { w, h, s } = im;
  const bg = backgroundColor(im), fg: number[] = [];
  for (let i = 0; i < w * h; i++) { const p = [im.data[i * 4], im.data[i * 4 + 1], im.data[i * 4 + 2]]; if (dist(p, bg) > 90) fg.push(i); }
  if (!fg.length) throw new Error('no foreground found (is the logo on a plain background?)');
  // cluster foreground colours with a tiny k-means
  const px: number[][] = fg.map(i => [im.data[i * 4], im.data[i * 4 + 1], im.data[i * 4 + 2]]);
  
  let cen: number[][] = []; { // reuse palette k-means through a fake image: simple farthest-point seeding is enough here
    cen.push(px[0].slice()); while (cen.length < colors) { let best: number[] | null = null, bd = -1; for (const p of px.filter((_, i) => i % 7 === 0)) { const d = Math.min(...cen.map(c => dist(p, c))); if (d > bd) { bd = d; best = p; } } if (bd < 60 || !best) break; cen.push(best.slice()); }
    for (let it = 0; it < 8; it++) { const acc: number[][] = cen.map(() => [0, 0, 0, 0]); for (const p of px) { let b = 0, bdd = 1e18; cen.forEach((c, j) => { const d = dist(p, c); if (d < bdd) { bdd = d; b = j; } }); acc[b][0] += p[0]; acc[b][1] += p[1]; acc[b][2] += p[2]; acc[b][3]++; } cen = cen.map((c, j) => acc[j][3] ? [acc[j][0] / acc[j][3], acc[j][1] / acc[j][3], acc[j][2] / acc[j][3]] : c); }
  }
  const result: StrokeRecord[] = [];
  cen.forEach(c => {
    let mask = new Uint8Array(w * h); fg.forEach((i, k) => { let b = 0, bd = 1e18; cen.forEach((cc, j) => { const d = dist(px[k], cc); if (d < bd) { bd = d; b = j; } }); if (cen[b] === c) mask[i] = 1; });
    mask = components(mask, w, h, minArea); if (!mask.some(Boolean)) return;
    const dt = distanceTransform(mask, w, h), sk = thin(mask, w, h), paths = tracePaths(sk, w, h);
    for (const pp of paths) {
      const len = pp.length, widths = pp.map(i => dt[i] * 2), wAvg = widths.reduce((a, b) => a + b, 0) / len;
      if (len < Math.max(10, wAvg * .8)) continue;                                 // spur of the skeleton, not a stroke
      const pts = rdp(pp.map(i => [(i % w) / s, ((i / w) | 0) / s]), 2.4 / s);
      result.push({ color: hex(c), width: +(wAvg / s).toFixed(1), d: smoothPath(pts), length: +(len / s).toFixed(0) });
    }
  });
  // largest strokes first: the main shape draws before the details
  result.sort((a, b) => b.length * b.width - a.length * a.width);
  const bgHex = bg.every(v => v > 235) ? '#ffffff' : hex(bg);
  return { viewBox: [0, 0, orig.width, orig.height], background: bgHex, strokes: result };
}
const strokesSVG = (j, { bg = false } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${j.viewBox.join(' ')}">${bg ? `<rect width="100%" height="100%" fill="${j.background}"/>` : ''}${j.strokes.map(s => `<path d="${s.d}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;

export { toSVG, strokes, strokesSVG };

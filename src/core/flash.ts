// Photosensitivity check (WCAG 2.3.1 "three flashes or below threshold").
// A flash = a pair of opposing changes in relative luminance of >= 0.10 where the darker state is < 0.80.
// We measure the mean relative luminance of the whole frame (conservative: assumes the changing area is large)
// at 15 fps and count flashes in every 1-second window.
import { PNG } from 'pngjs';

const lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
const LUT = Array.from({ length: 256 }, (_, i) => lin(i));
function meanLuminance(png) {
  const d = png.data; let s = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { s += .2126 * LUT[d[i]] + .7152 * LUT[d[i + 1]] + .0722 * LUT[d[i + 2]]; n++; }
  return s / n;
}
// swings: alternating luminance moves of >= h (zig-zag over the series). A move only counts when its darker end is < 0.8.
function swings(L, h = .1) {
  const out: number[] = []; let ext = L[0] ?? 0, dir = 0;
  for (let k = 1; k < L.length; k++) {
    const v = L[k];
    if (dir === 0) { if (Math.abs(v - ext) >= h) { if (Math.min(v, ext) < .8) out.push(k); dir = Math.sign(v - ext); ext = v; } }
    else if (dir > 0) { if (v > ext) ext = v; else if (ext - v >= h) { if (Math.min(v, ext) < .8) out.push(k); dir = -1; ext = v; } }
    else { if (v < ext) ext = v; else if (v - ext >= h) { if (Math.min(v, ext) < .8) out.push(k); dir = 1; ext = v; } }
  }
  return out;
}
/* Samples the film (source timeline) through `seekFor(i)` and returns {maxFlashes, at, series}.
   page must have been opened with a small deviceScaleFactor so the screenshots are cheap. */
async function flashScan(page, total, fps, { rate = 15, from = 0, to = total, seekFor = f => f } = {}) {
  const step = fps / rate, L: number[] = [], T: number[] = [];
  for (let f = from; f < to; f += step) {
    await page.evaluate(x => window.seek(x), seekFor(f));
    L.push(meanLuminance(PNG.sync.read(await page.screenshot({ type: 'png' })))); T.push(f / fps);
  }
  const sw = swings(L), times = sw.map(k => T[k]);
  let max = 0, at = 0;
  for (let i = 0; i < times.length; i++) { const c = times.filter(t => t >= times[i] && t < times[i] + 1).length, fl = Math.floor(c / 2); if (fl > max || (fl === max && fl && !at)) { max = fl; at = times[i]; } }
  return { maxFlashes: max, at, series: L, swings: times };
}
export { flashScan, swings, meanLuminance };

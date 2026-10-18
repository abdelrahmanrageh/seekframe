#!/usr/bin/env node
// Frame renderer (one worker). Renders output frames a..z of a project to numbered JPEGs.
//   node src/core/render.js --film examples/akked-tick --project p.json --out dir --fps 60 --range 0:600 [--size 1080x1920]
//   node src/core/render.js --film examples/akked-tick --project p.json --out dir --frames 0,300,900   (PNG stills, edited-timeline frames @ film fps)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const Timeline = require('./timeline.js');

function args() {
  const a = {}; const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i += 2) a[v[i].replace(/^--/, '')] = v[i + 1];
  return a;
}

// opens the film page and returns { browser, page, manifest } with the project's params applied
async function openFilm(filmDir, project, size, browser) {
  const file = path.resolve(filmDir, 'film.html');
  const b = browser || await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const probe = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await probe.goto('file://' + file); await probe.evaluate(() => window.ready);
  const m0 = await probe.evaluate(() => JSON.parse(JSON.stringify(window.manifest)));
  await probe.close();
  const [w, h] = size ? size.split('x').map(Number) : [m0.width, m0.height];
  const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + file); await page.evaluate(() => window.ready);
  await page.addScriptTag({ path: path.join(__dirname, 'timeline.js') });
  const manifest = await page.evaluate(p => JSON.parse(JSON.stringify(Timeline.applyToFilm(window, p))), (project && project.params) || {});
  return { browser: b, page, manifest, errs };
}

async function main() {
  const a = args(); const fps = +(a.fps || 30);
  const project = a.project ? JSON.parse(fs.readFileSync(a.project, 'utf8')) : {};
  const { browser, page, manifest, errs } = await openFilm(a.film, project, a.size);
  const tl = Timeline.build(manifest, project);
  const k = manifest.fps / fps;                      // film frames per output frame
  fs.mkdirSync(a.out, { recursive: true });
  const stills = !!a.frames;
  const list = stills ? a.frames.split(',').map(Number) : (() => { const [x, z] = a.range.split(':').map(Number); const r = []; for (let i = x; i < z; i++) r.push(i); return r; })();
  for (const i of list) {
    const f = stills ? i : i * k;                     // edited-timeline position in film frames
    const { src } = Timeline.sourceFrame(tl, f);
    await page.evaluate(f => window.seek(f), src);
    const name = stills ? `f${i}.png` : String(i).padStart(5, '0') + '.jpg';
    await page.screenshot(stills ? { path: path.join(a.out, name) } : { path: path.join(a.out, name), type: 'jpeg', quality: 94 });
    if (errs.length) { console.error(errs.join('\n')); errs.length = 0; }
  }
  await browser.close();
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { openFilm };

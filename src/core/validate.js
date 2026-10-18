// Film contract validator.   seekframe validate <film> [--fast] [--stills dir] [--no-flash]
// Loads the film in headless Chromium and checks everything the editor and renderer rely on.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const Ajv = require('ajv');
const { chromium } = require('playwright');
const { openFilm } = require('./render.js');
const Timeline = require('./timeline.js');

const { PNG } = require('pngjs');
// number of pixels that differ by more than 16/255 in any channel (ignores 1-level rasteriser noise)
function diffPx(a, b) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b); if (A.width !== B.width || A.height !== B.height) return Infinity;
  let n = 0; for (let i = 0; i < A.data.length; i += 4) if (Math.abs(A.data[i] - B.data[i]) > 16 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 16 || Math.abs(A.data[i + 2] - B.data[i + 2]) > 16) n++;
  return n;
}
const NOISE = 40;                          // pixels allowed to differ between two renders of the same frame
const same = (a, b) => diffPx(a, b) <= NOISE, differs = (a, b) => diffPx(a, b) > NOISE;

async function validate(dirArg, opts = {}) {
  const dir = path.resolve(dirArg), FAST = !!opts.fast, STILLS = opts.stills ? path.resolve(opts.stills) : null, FLASH = opts.flash !== false;
  const res = { fail: [], warn: [], ok: [] }, out = opts.log || (m => console.log(m)), C = opts.color === false ? ['', '', '', ''] : ['\x1b[32m', '\x1b[33m', '\x1b[31m', '\x1b[0m'];
  const ok = m => { res.ok.push(m); out(`  ${C[0]}✔${C[3]} ${m}`); };
  const warn = m => { res.warn.push(m); out(`  ${C[1]}!${C[3]} ${m}`); };
  const fail = m => { res.fail.push(m); out(`  ${C[2]}✘${C[3]} ${m}`); };
  const Abort = new Error('abort');
  require('./workspace.js').ensureBrands();
  if (!fs.existsSync(path.join(dir, 'film.html'))) { fail('No film.html in ' + dir); return res; }
  out(`Validating ${path.relative(process.cwd(), dir) || '.'}`);
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  let page, manifest, errs;
  const external = new Set();
  try {
    let timer = null;
    ({ page, manifest, errs } = await (async () => {
      const b2 = browser; const file = 'file://' + path.join(dir, 'film.html');
      const p = await b2.newPage({ viewport: { width: 1280, height: 720 } });
      const e = []; p.on('pageerror', x => e.push('pageerror: ' + x)); p.on('console', m => { if (m.type() === 'error') e.push('console.error: ' + m.text()); });
      p.on('request', r => { const u = r.url(); if (!/^(file:|data:|blob:|about:)/.test(u)) external.add(u); });
      await p.goto(file); await Promise.race([p.evaluate(() => window.ready), new Promise((_, no) => { timer = setTimeout(() => { fail('window.ready did not resolve within 30 s'); no(Abort); }, 30000); })]);
      const hasApi = await p.evaluate(() => ({ seek: typeof window.seek, manifest: typeof window.manifest, ap: typeof window.applyParams }));
      if (hasApi.seek !== 'function') { fail('window.seek is not a function'); throw Abort; }
      if (hasApi.manifest !== 'object') { fail('window.manifest is missing'); throw Abort; }
      await p.addScriptTag({ path: path.join(__dirname, 'timeline.js') });
      return { page: p, manifest: await p.evaluate(() => JSON.parse(JSON.stringify(window.manifest))), errs: e };
    })());
    clearTimeout(timer);
    ok('page loads, window.ready resolves, seek() and manifest exist');

    /* ----- manifest ----- */
    const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'film.schema.json'), 'utf8'));
    const ajv = new Ajv({ allErrors: true, strict: false }); const valid = ajv.compile(schema);
    if (valid(manifest)) ok(`manifest matches film.schema.json (${manifest.scenes.length} scenes, ${(manifest.params || []).length} params, ${(manifest.audio || []).length} audio tracks)`);
    else { valid.errors.slice(0, 12).forEach(e => fail(`manifest ${e.instancePath || '/'} ${e.message}`)); throw Abort; }

    const ids = new Set();
    manifest.scenes.forEach(s => { if (ids.has(s.id)) fail(`duplicate scene id "${s.id}"`); ids.add(s.id); if (s.start >= s.end) fail(`scene "${s.id}" has start >= end`); if (s.end > manifest.duration) fail(`scene "${s.id}" ends at ${s.end}, after the film's duration ${manifest.duration}`); });
    const sorted = [...manifest.scenes].sort((a, b) => a.start - b.start); let gaps = 0;
    sorted.forEach((s, i) => { const prev = i ? sorted[i - 1].end : 0; if (s.start !== prev) gaps++; });
    if (sorted[sorted.length - 1].end !== manifest.duration) gaps++;
    gaps ? warn('scenes do not tile the timeline exactly (gaps or overlaps) — the editor assumes they are contiguous') : ok('scenes tile the timeline [0, duration) exactly');

    const pids = new Set();
    for (const p of manifest.params || []) {
      if (pids.has(p.id)) fail(`duplicate param id "${p.id}"`); pids.add(p.id);
      if (p.scene && !ids.has(p.scene)) fail(`param "${p.id}" refers to unknown scene "${p.scene}"`);
      if (p.type === 'number' && (p.default < p.min || p.default > p.max)) fail(`param "${p.id}" default ${p.default} is outside ${p.min}..${p.max}`);
      if (p.type === 'select' && !p.options.map(o => typeof o === 'object' ? o.value : o).includes(p.default)) fail(`param "${p.id}" default is not one of its options`);
      if (p.type === 'image' && p.default && !fs.existsSync(path.join(dir, p.default))) fail(`param "${p.id}" default image missing: ${p.default}`);
      if (!p.label) warn(`param "${p.id}" has no label`);
    }
    if (!(manifest.params || []).length) warn('no params: the editor can only reorder/retime this film');
    const aids = new Set();
    for (const a of manifest.audio || []) { if (aids.has(a.id)) fail(`duplicate audio id "${a.id}"`); aids.add(a.id); if (a.generated) { (manifest.cues || []).length ? ok(`audio "${a.id}": generated from ${manifest.cues.length} cues`) : fail(`audio "${a.id}" is generated but the film declares no cues`); continue; } if (!a.src) { fail(`audio "${a.id}" needs a src or generated`); continue; } const f = path.resolve(dir, a.src); fs.existsSync(f) ? ok(`audio "${a.id}": ${path.relative(process.cwd(), f)} (${(fs.statSync(f).size / 1e6).toFixed(1)} MB)`) : fail(`audio "${a.id}" file not found: ${a.src}`); }
    if (!res.fail.length) ok('manifest semantics are consistent');

    /* ----- rendering behaviour ----- */
    await page.setViewportSize({ width: manifest.width, height: manifest.height });
    await page.evaluate(() => window.applyParams && window.applyParams({}));          // responsive films lay out from the viewport: rebuild at the real size
    const shot = async f => { await page.evaluate(f => window.seek(f), f); return page.screenshot({ type: 'png' }); };
    const mids = manifest.scenes.map(s => Math.floor((s.start + s.end) / 2));
    const probes = [...new Set([0, ...mids, manifest.duration - 1])];
    const base = {}; for (const f of probes) base[f] = await shot(f);
    // pure-function check: jump around, come back
    let bad = [];
    for (const f of probes.slice().reverse()) if (!same(await shot(f), base[f])) bad.push(f);
    if (probes.length > 2) { const x = probes[Math.floor(probes.length / 2)]; await shot(probes[1]); await shot(0); if (!same(await shot(x), base[x])) bad.push(x); }
    bad.length ? fail(`seek() is not a pure function of the frame: frame(s) ${[...new Set(bad)].join(', ')} look different when revisited. No Date.now/Math.random/CSS animations/mutable state that survives between seeks.`) : ok('seek() is deterministic when frames are visited in any order');
    // fresh page: first call must equal the sequential one (no dependence on earlier calls)
    const fresh = await browser.newPage({ viewport: { width: manifest.width, height: manifest.height } }); await fresh.goto('file://' + path.join(dir, 'film.html')); await fresh.evaluate(() => window.ready);
    const fx = mids[Math.floor(mids.length / 2)]; await fresh.evaluate(f => window.seek(f), fx);
    same(await fresh.screenshot({ type: 'png' }), base[fx]) ? ok('a freshly loaded page renders the same frame identically') : fail(`frame ${fx} differs between a fresh page and one that has seeked elsewhere first`);
    await fresh.close();
    await page.evaluate(() => { window.seek(10.5); window.seek(0.25); });
    ok('fractional frames are accepted');
    const blank = probes.filter(f => base[f].length < 4000); blank.length ? warn(`frame(s) ${blank.join(', ')} look blank (tiny PNG)`) : ok('sampled frames are not blank');
    for (const s of manifest.scenes) {
      if (s.end - s.start < 12) continue;
      const a = await shot(s.start + 1), b = await shot(Math.floor((s.start + s.end) / 2)), c = await shot(s.end - 2);
      if (same(a, b) && same(b, c)) warn(`scene "${s.id}" looks static (frames at start/middle/end are identical)`);
    }
    ok('motion check done');

    /* ----- params actually do something ----- */
    if (!FAST) {
      // scene params: 8 frames across their scene; film-wide params: the middle of every scene
      const sample = p => { const sc = manifest.scenes.find(x => x.id === p.scene); if (!sc) return manifest.scenes.map(x => Math.floor((x.start + x.end) / 2)); return [.06, .18, .3, .42, .54, .66, .78, .9].map(t => Math.floor(sc.start + (sc.end - sc.start) * t)); };
      const vals = p => p.type === 'text' ? p.default + ' ✓' : p.type === 'number' ? (p.default + (p.max - p.min) * 0.3 <= p.max ? p.default + (p.max - p.min) * 0.3 : p.min) : p.type === 'color' ? (p.default.toLowerCase() === '#ff00aa' ? '#00ffaa' : '#ff00aa') : p.type === 'boolean' ? !p.default : p.type === 'select' ? (p.options.map(o => typeof o === 'object' ? o.value : o).find(v => v !== p.default) ?? p.default) : null;
      const testable = (manifest.params || []).filter(p => vals(p) != null && vals(p) !== p.default);
      const baseH = {};                                       // baseline hashes with default params
      await page.evaluate(() => Timeline.applyToFilm(window, {}));
      for (const p of testable) for (const f of sample(p)) if (!(f in baseH)) baseH[f] = await shot(f);
      const noEffect = [];
      for (const p of testable) {
        await page.evaluate(([id, v]) => Timeline.applyToFilm(window, { [id]: v }), [p.id, vals(p)]);
        let changed = false; for (const f of sample(p)) if (differs(await shot(f), baseH[f])) { changed = true; break; }
        if (!changed) noEffect.push(p.id);
      }
      await page.evaluate(() => Timeline.applyToFilm(window, {}));
      noEffect.length ? warn(`${noEffect.length} param(s) showed no visible change at the sampled frames: ${noEffect.slice(0, 12).join(', ')}${noEffect.length > 12 ? ', …' : ''} (they may only act on other frames, or be wired incorrectly)`) : ok(`all ${testable.length} testable params change the picture`);
    } else warn('param effect check skipped (--fast)');

    /* ----- cues (generated sound) ----- */
    if (manifest.cues) {
      const bad = manifest.cues.filter(c => !c || typeof c.kind !== 'string' || !Number.isFinite(c.f) || c.f < 0 || c.f > manifest.duration);
      bad.length ? fail(`${bad.length} cue(s) are malformed or outside 0..${manifest.duration}: ${JSON.stringify(bad[0])}`) : ok(`${manifest.cues.length} sound cues, all inside the timeline`);
    }

    /* ----- photosensitivity ----- */
    if (FLASH) {
      const fp = await browser.newPage({ viewport: { width: manifest.width, height: manifest.height }, deviceScaleFactor: .25 });
      await fp.goto('file://' + path.join(dir, 'film.html')); await fp.evaluate(() => window.ready);
      const { flashScan } = require('./flash.js'); const fr = await flashScan(fp, manifest.duration, manifest.fps); await fp.close();
      if (fr.maxFlashes > 3) fail(`photosensitivity: ${fr.maxFlashes} full-frame luminance flashes within one second at ${fr.at.toFixed(1)} s (WCAG 2.3.1 allows 3). Use longer cuts, dissolves or colours of similar brightness.`);
      else if (fr.maxFlashes >= 2) warn(`photosensitivity: up to ${fr.maxFlashes} full-frame luminance flashes per second at ${fr.at.toFixed(1)} s (limit is 3). Consider softer cuts there.`);
      else ok('photosensitivity: no rapid full-frame flashing');
    }

    /* ----- stills for the author to look at ----- */
    if (STILLS) {
      fs.mkdirSync(STILLS, { recursive: true });
      for (const s of manifest.scenes) { await page.evaluate(f => window.seek(f), Math.floor((s.start + s.end) / 2)); await page.screenshot({ path: path.join(STILLS, `${s.id}.png`) }); }
      ok(`wrote one still per scene to ${path.relative(process.cwd(), STILLS)}`);
    }

    errs.length ? fail('errors in the page: ' + [...new Set(errs)].slice(0, 5).join(' | ')) : ok('no console errors or exceptions');
    external.size ? fail('film requests network resources (must be fully local): ' + [...external].slice(0, 4).join(', ')) : ok('no network requests (fully local)');
  } catch (e) {
    if (e !== Abort) fail('validator crashed: ' + (e.stack || e.message));
  }
  await browser.close();
  out(`\n${res.fail.length ? C[2] + 'FAILED' : C[0] + 'PASSED'}${C[3]} — ${res.ok.length} ok, ${res.warn.length} warnings, ${res.fail.length} failures`);
  return res;
}
module.exports = { validate, diffPx };

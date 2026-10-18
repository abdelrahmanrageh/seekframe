// seekframe review <film> — what a human reviewer would check, automated, for every saved version of a film:
//   * stills + a contact sheet (one frame per scene) to LOOK at
//   * text that leaves the frame (overflow) and text with too little contrast (WCAG 2.1 AA, measured from pixels)
//   * photosensitivity (flashes per second) for that version's colours and cuts
// Writes <out>/<film>-<version>-sheet.jpg, stills, and <out>/<film>-review.json. Returns {fail, warn, report}.
const fs = require('fs'), path = require('path');
const { PNG } = require('pngjs');
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const Timeline = require('./timeline.js');
const { flashScan } = require('./flash.js');
const { ROOT } = require('./workspace.js');

const lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
const lum = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05); };
const parseColor = s => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };

// everything the page can tell us about visible text at the current frame
const PROBE = () => {
  const out = [], W = innerWidth, H = innerHeight;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.nodeValue.trim(); if (!t) continue; const e = n.parentElement; if (!e || seen.has(e) || ['SCRIPT', 'STYLE'].includes(e.tagName)) continue; seen.add(e);
    let op = 1, vis = true; for (let x = e; x; x = x.parentElement) { const cs = getComputedStyle(x); op *= parseFloat(cs.opacity); if (cs.display === 'none' || cs.visibility === 'hidden' || x.hasAttribute('data-sf-decorative') || x.getAttribute('aria-hidden') === 'true') vis = false; }   // mock UI marked data-sf-decorative is illustration, not copy
    if (!vis || op < .6) continue;
    const range = document.createRange(); range.selectNodeContents(e); const r = range.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
    const cs = getComputedStyle(e);
    out.push({ text: t.slice(0, 40), x: r.left, y: r.top, w: r.width, h: r.height, color: cs.color, fill: cs.webkitTextFillColor, size: parseFloat(cs.fontSize), weight: +cs.fontWeight || 400, op });
  }
  return { items: out, W, H };
};
const HIDE_TEXT = '* { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }';

async function review(film, o = {}) {
  require('./workspace.js').ensureBrands();
  const log = o.log || (() => {}), out = path.resolve(o.out || path.join(ROOT, 'output', 'review'));
  fs.mkdirSync(out, { recursive: true });
  const pd = path.join(film.dir, 'projects'), saved = fs.existsSync(pd) ? fs.readdirSync(pd).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)) : [];
  const versions = o.version ? [o.version] : (o.all || saved.length ? (saved.length ? saved : ['default']) : ['default']);
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const report = { film: film.id, versions: {} }; let fail = 0, warn = 0;
  const F = (v, m) => { fail++; (report.versions[v].fail = report.versions[v].fail || []).push(m); log(`  \x1b[31m✘\x1b[0m [${v}] ${m}`); };
  const Wn = (v, m) => { warn++; (report.versions[v].warn = report.versions[v].warn || []).push(m); log(`  \x1b[33m!\x1b[0m [${v}] ${m}`); };
  log(`Reviewing ${film.id} (${versions.length} version${versions.length > 1 ? 's' : ''}) → ${path.relative(process.cwd(), out)}/`);
  for (const v of versions) {
    report.versions[v] = {};
    const pf = path.join(pd, v + '.json'), project = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {};
    // probe page to learn the manifest, then the real page at the right size
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); await page.goto('file://' + path.join(film.dir, 'film.html')); await page.evaluate(() => window.ready);
    const m0 = await page.evaluate(() => JSON.parse(JSON.stringify(window.manifest))); await page.close();
    const pg = await browser.newPage({ viewport: { width: m0.width, height: m0.height } }); await pg.goto('file://' + path.join(film.dir, 'film.html')); await pg.evaluate(() => window.ready);
    await pg.addScriptTag({ path: path.join(__dirname, 'timeline.js') });
    const manifest = await pg.evaluate(p => JSON.parse(JSON.stringify(Timeline.applyToFilm(window, p))), project.params || {});
    const tl = Timeline.build(manifest, project), seekTo = async f => { const { src } = Timeline.sourceFrame(tl, f); await pg.evaluate(x => window.seek(x), src); };
    const stills = [], issues = new Map();
    for (const c of tl.clips) {
      const sc = manifest.scenes.find(s => s.id === c.scene), len = c.t1 - c.t0;
      for (const [k, t] of [['mid', .5], ['late', .85]]) {
        const f = c.t0 + len * t; await seekTo(f);
        const png = await pg.screenshot({ type: 'png' }), file = path.join(out, `${film.id}-${v}-${c.i + 1}-${c.scene}-${k}.png`); fs.writeFileSync(file, png);
        if (k === 'mid') stills.push(file);
        const info = await pg.evaluate(PROBE);
        // text-hidden screenshot -> background under each text box
        await pg.addStyleTag({ content: HIDE_TEXT }).then(async h => { const bgPng = PNG.sync.read(await pg.screenshot({ type: 'png' })); await h.evaluate(n => n.remove());
          for (const it of info.items) {
            const key = c.scene + '|' + it.text;
            // overflow: text box leaves the frame
            const over = Math.max(-it.x, -it.y, it.x + it.w - info.W, it.y + it.h - info.H);
            if (over > 6 && !issues.has('o' + key)) issues.set('o' + key, `text leaves the frame by ${Math.round(over)}px in scene "${c.scene}": “${it.text}”`);
            // contrast: mean background under the box vs text colour
            const col = parseColor(it.fill && !/rgba\(0, 0, 0, 0\)/.test(it.fill) ? it.fill : it.color); if (!col || col.a < .2 || /rgba\(0, 0, 0, 0\)/.test(it.fill)) continue;
            let r = 0, g = 0, b = 0, n = 0; const x0 = Math.max(0, Math.floor(it.x)), x1 = Math.min(bgPng.width - 1, Math.ceil(it.x + it.w)), y0 = Math.max(0, Math.floor(it.y)), y1 = Math.min(bgPng.height - 1, Math.ceil(it.y + it.h));
            for (let y = y0; y <= y1; y += 3) for (let x = x0; x <= x1; x += 3) { const i = (y * bgPng.width + x) * 4; r += bgPng.data[i]; g += bgPng.data[i + 1]; b += bgPng.data[i + 2]; n++; }
            if (!n) continue; const bg = [r / n, g / n, b / n], fg = col.rgb.map((c, i) => c * col.a * it.op + bg[i] * (1 - col.a * it.op));
            const cr = ratio(fg, bg), large = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700), need = large ? 3 : 4.5;
            if (cr < need && !issues.has('c' + key)) issues.set('c' + key, `low contrast ${cr.toFixed(2)}:1 (needs ${need}:1) in scene "${c.scene}": “${it.text}” (${Math.round(it.size)}px)`);
          } });
      }
    }
    for (const [k, msg] of issues) (k[0] === 'o' ? F : Wn)(v, msg);
    report.versions[v].issues = [...issues.values()];
    await pg.close();
    // flashes for this version's colours/cuts (edited timeline)
    const fp = await browser.newPage({ viewport: { width: manifest.width, height: manifest.height }, deviceScaleFactor: .25 }); await fp.goto('file://' + path.join(film.dir, 'film.html')); await fp.evaluate(() => window.ready);
    await fp.addScriptTag({ path: path.join(__dirname, 'timeline.js') }); await fp.evaluate(p => Timeline.applyToFilm(window, p), project.params || {});
    const fr = await flashScan(fp, tl.total, manifest.fps, { seekFor: f => Timeline.sourceFrame(tl, f).src }); await fp.close();
    report.versions[v].maxFlashesPerSecond = fr.maxFlashes;
    if (fr.maxFlashes > 3) F(v, `photosensitivity: ${fr.maxFlashes} flashes within one second at ${fr.at.toFixed(1)} s (WCAG 2.3.1 allows 3)`);
    else if (fr.maxFlashes >= 2) Wn(v, `photosensitivity: up to ${fr.maxFlashes} full-frame flashes per second at ${fr.at.toFixed(1)} s (limit 3). Fine for most viewers; soften if your audience is broad.`);
    else log(`  \x1b[32m✔\x1b[0m [${v}] no rapid flashing`);
    // contact sheet
    const ff = require('./ffmpeg.js').ffmpegPath();
    const cols = manifest.width >= manifest.height ? 4 : 5, tw = manifest.width >= manifest.height ? 480 : 270, th = Math.round(tw * manifest.height / manifest.width);
    const args = ['-v', 'error', '-y']; stills.forEach(s => args.push('-i', s));
    const filt = stills.map((_, i) => `[${i}:v]scale=${tw}:${th}[v${i}]`).join(';') + ';' + stills.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${stills.length}:layout=${stills.map((_, i) => `${(i % cols) * tw}_${Math.floor(i / cols) * th}`).join('|')}:fill=black`;
    const sheet = path.join(out, `${film.id}-${v}-sheet.jpg`); const r = spawnSync(ff, [...args, '-filter_complex', filt, '-frames:v', '1', sheet]);
    if (!r.status) { report.versions[v].sheet = path.relative(ROOT, sheet); log(`    contact sheet: ${path.relative(process.cwd(), sheet)}`); }
  }
  await browser.close();
  fs.writeFileSync(path.join(out, `${film.id}-review.json`), JSON.stringify(report, null, 2));
  log(`\n${fail ? '\x1b[31mISSUES\x1b[0m' : '\x1b[32mOK\x1b[0m'} — ${fail} failure(s), ${warn} warning(s). Open the contact sheets and look at them: this tool cannot judge taste.`);
  return { fail, warn, report };
}
module.exports = { review };

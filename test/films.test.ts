// End-to-end checks: need Chromium (npx playwright install chromium). Slower (~1 min).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { validate } from '../src/core/validate';
import { resolveFilm } from '../src/core/workspace';
import { scaffoldFilm } from '../src/core/scaffold';
import { exportFilm } from '../src/core/export';
import { renderScore } from '../src/sound/score';
import { craft } from '../src/core/craft';
import { sync } from '../src/sound/sync';





const ROOT = path.resolve(__dirname, '..');

// the launch film is validated and reviewed by the CI workflow instead (it is heavy: 960 frames of blur and gradients)
for (const rel of ['templates/blank', 'examples/seekframe-feature-tour', 'examples/seekframe-kit-demo']) {
  test(`validate ${rel}`, { timeout: 240000 }, async () => {
    const r = await validate(path.join(ROOT, rel), { fast: true, color: false, log: () => {} });
    assert.deepEqual(r.fail, [], r.fail.join('\n'));
  });
}
test('scaffold + render a 1080x1920 film with a generated score', { timeout: 240000 }, async () => {
  const f = scaffoldFilm({ name: 'ci-smoke', width: 1080, height: 1920 });
  try {
    const out = path.join(os.tmpdir(), 'ci-smoke.mp4');
    const r = await exportFilm({ film: resolveFilm('ci-smoke')!, project: { params: { title: 'CI' } }, fps: 24, out, generateScore: async (t, m) => { const w = path.join(os.tmpdir(), 'ci-smoke.wav'); await renderScore({ manifest: m, out: w }); return w; } });
    assert.equal(r.seconds, 10); assert.ok(fs.statSync(out).size > 20000);
  } finally { fs.rmSync(f.dir, { recursive: true, force: true }); }
});

test('craft review: a deliberately weak film scores low and says why', { timeout: 300000 }, async () => {
  const f = scaffoldFilm({ name: 'ci-craft-weak' });
  try {
    const js = path.join(f.dir, 'film.js'), html = path.join(f.dir, 'film.html');
    fs.writeFileSync(js, fs.readFileSync(js, 'utf8').replace('return c.list;', 'return [];'));
    fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace('</style>', 'h1{font-size:18px!important}h2{font-size:12px!important}.big{font-size:20px!important}.cards{width:25%!important}</style>'));
    const r = await craft(resolveFilm('ci-craft-weak')!, { out: path.join(os.tmpdir(), 'ci-craft-out'), log: () => {} });
    const rep = r.versions.default, by = Object.fromEntries(rep.categories.map(c => [c.check, c.score]));
    assert.ok(r.score < 70, 'score ' + r.score);
    assert.ok((by.readability as number) < 50, 'readability ' + by.readability);
    assert.ok((by.silence as number) < 50, 'sound coverage ' + by.silence);
    assert.ok(rep.fixes.some(x => /declares no sound cues/.test(x.message)));
    assert.ok(rep.fixes.some(x => /make the headline at least/.test(x.message)));
  } finally { fs.rmSync(f.dir, { recursive: true, force: true }); }
});
test('craft review: the blank template reports every measured category', { timeout: 300000 }, async () => {
  const r = await craft(resolveFilm('templates/blank') || { id: 'blank', root: 'templates', dir: path.join(ROOT, 'templates/blank') }, { out: path.join(os.tmpdir(), 'ci-craft-out'), log: () => {} });
  const ids = r.versions.default.categories.map(c => c.check);
  for (const id of ['readability', 'occupancy', 'hierarchy', 'pacing', 'motion', 'entrance', 'transition', 'silence', 'loudness']) assert.ok(ids.includes(id as any), id);
  assert.ok(r.score >= 0 && r.score <= 100);
});

test('motion kit demo: sound and picture agree (no sync warnings) and the craft score is high', { timeout: 300000 }, async () => {
  const film = { id: 'seekframe-kit-demo', root: 'examples', dir: path.join(ROOT, 'examples/seekframe-kit-demo') };
  const sr = await sync(film, { version: 'default' }); assert.deepEqual(sr.versions.default.issues, [], 'kit films are in sync by construction');
  const r = await craft(film, { out: path.join(os.tmpdir(), 'ci-craft-out'), version: 'default', log: () => {} });
  assert.ok(r.score >= 85, 'craft score ' + r.score);
});

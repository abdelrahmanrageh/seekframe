// End-to-end checks: need Chromium (npx playwright install chromium). Slower (~1 min).
const test = require('node:test'), assert = require('node:assert/strict');
const path = require('path'), fs = require('fs'), os = require('os');
const { validate } = require('../src/core/validate.js');
const { resolveFilm } = require('../src/core/workspace.js');
const { scaffoldFilm } = require('../src/core/scaffold.js');
const ROOT = path.resolve(__dirname, '..');

for (const rel of ['templates/blank', 'examples/akked-tick', 'examples/akked-tick-ar']) {
  test(`validate ${rel}`, { timeout: 240000 }, async () => {
    const r = await validate(path.join(ROOT, rel), { fast: true, color: false, log: () => {} });
    assert.deepEqual(r.fail, [], r.fail.join('\n'));
  });
}
test('scaffold + render a 1080x1920 film with a generated score', { timeout: 240000 }, async () => {
  const f = scaffoldFilm({ name: 'ci-smoke', width: 1080, height: 1920 });
  try {
    const { exportFilm } = require('../src/core/export.js'), { renderScore } = require('../src/sound/score.js'), out = path.join(os.tmpdir(), 'ci-smoke.mp4');
    const r = await exportFilm({ film: resolveFilm('ci-smoke'), project: { params: { title: 'CI' } }, fps: 24, out, generateScore: async (t, m) => { const w = path.join(os.tmpdir(), 'ci-smoke.wav'); await renderScore({ manifest: m, out: w }); return w; } });
    assert.equal(r.seconds, 10); assert.ok(fs.statSync(out).size > 20000);
  } finally { fs.rmSync(f.dir, { recursive: true, force: true }); }
});

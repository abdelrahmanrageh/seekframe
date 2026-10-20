import test from 'node:test';
import assert from 'node:assert/strict';
import * as Timeline from '../src/core/timeline';
import { swings } from '../src/core/flash';
import * as P from '../src/brand/palette';
import { mix, THEMES, KINDS } from '../src/sound/engine';
import { parseParams } from '../src/core/matrix';
import Ajv from 'ajv';
import * as schema from '../src/core/film.schema.json';
import * as K from '../src/core/craft-checks';








const manifest: any = { fps: 30, duration: 300, scenes: [{ id: 'a', name: 'A', start: 0, end: 100 }, { id: 'b', name: 'B', start: 100, end: 300 }] };

test('timeline: defaults tile the film and map frames 1:1', () => {
  const tl = Timeline.build(manifest, {}); assert.equal(tl.total, 300); assert.equal(tl.clips.length, 2);
  assert.equal(Timeline.sourceFrame(tl, 150).src, 150);
});
test('timeline: stretching a clip scales time and reports the rate', () => {
  const tl = Timeline.build(manifest, { clips: [{ scene: 'a', frames: 200 }, { scene: 'b' }] });
  assert.equal(tl.total, 400); const r = Timeline.sourceFrame(tl, 100); assert.equal(r.src, 50); assert.equal(r.rate, .5);
});
test('timeline: duplicate, reorder and trim', () => {
  const tl = Timeline.build(manifest, { clips: [{ scene: 'b', in: 150, out: 250 }, { scene: 'a' }, { scene: 'a' }] });
  assert.equal(tl.total, 100 + 100 + 100); assert.equal(Timeline.sourceFrame(tl, 0).src, 150); assert.equal(Timeline.sourceFrame(tl, 100).src, 0);
  assert.notEqual(tl.clips[1].id, tl.clips[2].id);
});
test('timeline: unknown scenes are dropped, minimum length enforced', () => {
  const p = Timeline.normalize(manifest, { clips: [{ scene: 'zzz' }, { scene: 'a', frames: 1 }] }); assert.equal(p.clips.length, 1); assert.equal(p.clips[0].frames, Timeline.MIN_FRAMES);
});
test('timeline: tempo chain covers 0.25x-4x', () => {
  assert.equal(Timeline.tempoChain(1.5), 'atempo=1.50000'); assert.match(Timeline.tempoChain(4), /atempo=2,atempo=2/); assert.match(Timeline.tempoChain(.25), /atempo=0\.5,atempo=0\.5/);
});
test('timeline: audio filter graph has one segment per clip and a mix for several tracks', () => {
  const tl = Timeline.build(manifest, {}), g = Timeline.audioFilter(tl, 30, [{ index: 1, track: { sync: 'timeline' } }, { index: 2, track: { sync: 'free', offset: 1 } }]);
  assert.match(g, /concat=n=2/); assert.match(g, /amix=inputs=2/); assert.match(g, /adelay=1000/); assert.match(g, /\[aout\]$/);
});
test('flash: counts alternating swings, ignores fades and bright-only changes', () => {
  const alt = n => Array.from({ length: 30 }, (_, i) => i < n ? (i % 2 ? .9 : .05) : .05);
  assert.equal(swings(alt(7)).length, 6); assert.equal(swings(Array.from({ length: 30 }, (_, i) => i / 30)).length, 1);
  assert.equal(swings(Array.from({ length: 30 }, (_, i) => i % 2 ? .95 : .85)).length, 0);
});
test('palette: WCAG contrast and role picking', () => {
  assert.ok(Math.abs(P.contrast([0, 0, 0], [255, 255, 255]) - 21) < .01);
  const r = P.roles([{ hex: '#ffffff', rgb: [255, 255, 255] }, { hex: '#000000', rgb: [0, 0, 0] }, { hex: '#7fff00', rgb: [127, 255, 0] }]);
  assert.equal(r.accent, '#7fff00'); assert.equal(r.ink, '#000000'); assert.equal(r.paper, '#ffffff'); assert.match(r.muted, /^#[0-9a-f]{6}$/);
});
test('sound: engine renders the right length; rtl mirrors the panning; themes and silence work', () => {
  const cues = [{ kind: 'tick', f: 15, pan: -1, gain: .5 }, { kind: 'boom', f: 30 }, { kind: 'silence', f: 45, to: 60 }, { kind: 'tick', f: 50, gain: .5 }];
  const a = mix(cues, { fps: 30, seconds: 3 }).m, b = mix(cues, { fps: 30, seconds: 3, rtl: true }).m; assert.equal(a.N, 144000);
  const e = (x, from, to) => { let s = 0; for (let i = from; i < to; i++) s += x[i] * x[i]; return s; };
  const win: [number, number] = [Math.round(.5 * 48000), Math.round(.55 * 48000)];
  assert.ok(e(a.L, ...win) > 5 * e(a.R, ...win)); assert.ok(e(b.R, ...win) > 5 * e(b.L, ...win));
  assert.equal(e(a.L, Math.round(1.55 * 48000), Math.round(1.95 * 48000)), 0, 'silence region is silent');
  for (const t of Object.keys(THEMES)) assert.doesNotThrow(() => mix(cues, { fps: 30, seconds: 3, theme: t }));
  assert.ok(KINDS.includes('boom') && KINDS.includes('slide'));
});
test('matrix: CLI params are coerced to the param type', () => {
  const m = { params: [{ id: 'n', type: 'number' }, { id: 'b', type: 'boolean' }, { id: 's', type: 'text' }] };
  assert.deepEqual(parseParams('n=3,b=true,s=hello world', m), { n: 3, b: true, s: 'hello world' });
});
test('schema: accepts a good manifest, rejects a bad one', () => {
  const v = new Ajv({ allErrors: true, strict: false }).compile(schema);
  const good = { schema: 1, title: 't', width: 1280, height: 720, fps: 30, duration: 100, scenes: [{ id: 'a', name: 'A', start: 0, end: 100 }], params: [{ id: 'x', type: 'number', default: 1, min: 0, max: 5 }], audio: [{ id: 's', label: 'S', generated: 'cues' }] };
  assert.ok(v(good), JSON.stringify(v.errors)); assert.ok(!v({ ...good, params: [{ id: 'x', type: 'number', default: 1 }] }), 'number params need min/max'); assert.ok(!v({ ...good, scenes: [{ id: 'A!', name: 'A', start: 0, end: 1 }] }));
});

test('timeline: timelineFrame maps a source frame back onto the edit', () => {
  const tl = Timeline.build(manifest, { clips: [{ scene: 'b', frames: 100 }, { scene: 'a', frames: 50 }] });
  assert.equal(Timeline.timelineFrame(tl, 150), 25);       // scene b (100..300) squeezed into 100 frames
  assert.equal(Timeline.timelineFrame(tl, 50), 125);       // scene a (0..100) squeezed into 50 frames
});

test('sound: music instruments render finite audio, and minimal drops the groove', () => {
  const cues = [{ kind: 'hat', f: 1 }, { kind: 'clap', f: 5 }, { kind: 'bass', f: 0, to: 30, note: 'D2', beat: .5 }, { kind: 'chord', f: 0, to: 45, notes: ['D3', 'F3', 'A3'], beat: .5, cut0: 400, cut1: 2000 },
    { kind: 'keys', f: 10, note: 'A4' }, { kind: 'impact', f: 20 }, { kind: 'reverse', f: 30, to: 45 }, { kind: 'glitch', f: 40 }, { kind: 'key', f: 50 }];
  for (const theme of Object.keys(THEMES)) {
    const { m } = mix(cues, { fps: 30, seconds: 3, theme }); let pk = 0;
    for (let i = 0; i < m.N; i++) { assert.ok(Number.isFinite(m.L[i]) && Number.isFinite(m.R[i])); pk = Math.max(pk, Math.abs(m.L[i])); }
    assert.ok(pk > 0, theme + ' is not silent');
  }
  assert.equal(THEMES.minimal.map({ kind: 'chord', f: 0 }), null);
  assert.ok(['hat', 'clap', 'bass', 'chord', 'keys', 'impact', 'reverse', 'glitch', 'key'].every(k => KINDS.includes(k)));
});

/* ----- craft checks (pure) ----- */
const tb = (text: string, size: number, extra: any = {}): any => ({ text, x: 0, y: 0, w: 100, h: size, color: '', fill: '', size, weight: 400, op: 1, words: text.length / 6, allow: [], ...extra });
const sc = (id: string, text: any[], extra: any = {}): any => ({ id, name: id, t0: 0, t1: 90, text, boxes: [], allow: [], ...extra });
test('craft: readability flags a small headline and small body text, relative to the short side', () => {
  const r = K.checkReadability([sc('a', [tb('Big idea here', 30), tb('tiny note', 14)]), sc('b', [tb('Fine headline', 90), tb('fine body text', 40)])], 1080);
  assert.equal(r.units, 2); assert.equal(r.bad, 1); assert.match(r.findings[0].message, /Scene a: the largest text is 30 px; make the headline at least 49 px/);
  const v = K.checkReadability([sc('a', [tb('Big idea here', 30)])], 400); assert.equal(v.bad, 0, 'the same 30 px is fine on a small canvas');
});
test('craft: symbols and ticker text are not copy', () => {
  const r = K.checkReadability([sc('a', [tb('Headline text', 90), tb('✓', 12), tb('scrolling…', 12, { ticker: true })])], 1080); assert.equal(r.bad, 0);
});
test('craft: occupancy measures the span of the content over the safe area', () => {
  assert.ok(K.extent([{ x: 0, y: 0, w: 1920, h: 1080 }], 1920, 1080) > .99);
  const card = K.extent([{ x: 640, y: 360, w: 640, h: 360 }], 1920, 1080); assert.ok(card > .1 && card < .15, String(card));
  const r = K.checkOccupancy([{ ...sc('a', []), coverage: .2 }, { ...sc('b', []), coverage: .8 }]); assert.equal(r.bad, 1);
});
test('craft: hierarchy wants one text 1.6x the next; a single size tier passes', () => {
  assert.equal(K.checkHierarchy([sc('a', [tb('Headline', 100), tb('Card text', 80)])]).bad, 1);
  assert.equal(K.checkHierarchy([sc('a', [tb('Headline', 100), tb('Sub text', 50)])]).bad, 0);
  assert.equal(K.checkHierarchy([sc('a', [tb('What', 140), tb('if your', 140), tb('AI', 140)])]).bad, 0);
});
test('craft: pacing checks scene length and reading time', () => {
  const r = K.checkPacing([sc('fast', [], { t0: 0, t1: 30 }), sc('dense', [tb('x'.repeat(240), 40)], { t0: 30, t1: 120 }), sc('ok', [tb('Short line', 60)], { t0: 120, t1: 210 })], 30, 1080);
  assert.deepEqual(r.findings.map(f => f.scene), ['fast', 'dense']);
});
test('craft: motion finds a still stretch, entrances and transitions need movement', () => {
  const n = 120, mk = (f: (i: number) => number) => Array.from({ length: n }, (_, i) => f(i));
  const series: any = { fps: 30, step: 2, lag: mk(i => (i > 20 && i < 60 ? 0 : .05)), adj: mk(i => (i > 20 && i < 60 ? 0 : .05)), lum: mk(() => .4), fromStart: mk(i => (i % 45 > 12 ? .05 : 0)) };
  const scenes = [sc('a', [], { t0: 0, t1: 90 }), sc('b', [], { t0: 90, t1: 180 }), sc('c', [], { t0: 180, t1: 240 })];
  const m = K.checkMotion(series, scenes); assert.equal(m.bad, 1); assert.match(m.findings[0].message, /Nothing moves for/);
  assert.equal(K.checkEntrances(series, scenes).bad, 3, 'each scene starts static for 12 samples = 24 frames');
  const t = K.checkTransitions(series, scenes); assert.equal(t.units, 2);
  const dip = K.checkTransitions({ ...series, lum: mk(i => (i === 45 ? .01 : .5)), lag: series.lag, adj: mk(() => .05) }, scenes); assert.equal(dip.bad, 1); assert.match(dip.findings[0].message, /dips to black/);
});
test('craft: sound coverage, pauses and loudness', () => {
  const base: any = { seconds: 20, silences: [[4, 9]], lufs: -16, truePeak: -1.5, target: -16, cueCount: 40, pauses: [], hasCues: true };
  const scenes = [sc('a', [], { t0: 0, t1: 600 })];
  assert.match(K.checkSilence(base, scenes, 30).findings[0].message, /No sound from 4\.0 s to 9\.0 s/);
  assert.equal(K.checkSilence({ ...base, pauses: [[3.9, 9.1]] }, scenes, 30).findings.length, 0, 'a silence cue marks a deliberate pause');
  assert.equal(K.checkSilence({ ...base, hasCues: false }, scenes, 30).bad > 0, true);
  assert.equal(K.checkLoudness(base).bad, 0);
  assert.match(K.checkLoudness({ ...base, lufs: -22 }).findings[0].message, /6\.0 LU under/);
  assert.equal(K.checkLoudness({ ...base, truePeak: 0 }).bad, 1);
});
test('craft: opt-outs need a reason, cost points and are listed', () => {
  const a = K.parseAllow(['motion: logo end card holds', 'occupancy', 'nonsense: whatever it is'], 'scene logo');
  assert.equal(a.ok.length, 1); assert.equal(a.problems.length, 2);
  const res: any = { check: 'motion', units: 10, bad: 0, findings: [] };
  const clean = K.buildReport([res], []), used = K.buildReport([res], a.ok);
  assert.equal(clean.score, 100); assert.equal(used.score, Math.round(100 - K.ALLOW_COST)); assert.equal(used.allowances.length, 1);
  const cap = K.buildReport([res], Array.from({ length: 30 }, () => a.ok[0])); assert.equal(cap.score, 100 - K.ALLOW_CAP, 'opt-outs cost at most 10 points');
});
test('craft: the score is the weighted mean and the fix list is ranked by value', () => {
  const r = K.buildReport([{ check: 'readability', units: 4, bad: 1, findings: [{ check: 'readability', message: 'small' }] }, { check: 'motion', units: 40, bad: 1, findings: [{ check: 'motion', message: 'still' }] }, { check: 'entrance', units: 0, bad: 0, findings: [] }], []);
  assert.deepEqual(r.fixes.map(f => f.message), ['small', 'still']);
  assert.equal(r.categories.find(c => c.check === 'entrance')!.score, null);
  assert.equal(r.score, Math.round((12 * 75 + 14 * 98) / 26));
});

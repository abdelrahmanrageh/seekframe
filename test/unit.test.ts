import test from 'node:test';
import assert from 'node:assert/strict';
import * as Timeline from '../src/core/timeline';
import { swings } from '../src/core/flash';
import * as P from '../src/brand/palette';
import { mix, THEMES, KINDS } from '../src/sound/engine';
import { parseParams } from '../src/core/matrix';
import Ajv from 'ajv';
import * as schema from '../src/core/film.schema.json';








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

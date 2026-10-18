// @ts-check
/// <reference path="../../dist/types/browser/film-globals.d.ts" />
/* Seekframe launch film — an editable demo of the brief → edit → render workflow.
   Contract: docs/FILM_SPEC.md · runtime helpers: docs/RUNTIME.md.
   Golden rule: seek(frame) is a PURE FUNCTION of the frame number — no Date.now(), Math.random(), timers or CSS animation. */
'use strict';
const { el, css, E, rng, lerp, clamp } = SF;

/* 1. scenes: contiguous, start inclusive, end exclusive, in frames at `fps` */
const SCENES = [
  { id: 'title', name: 'Brand films as code', start: 0, end: 90 },
  { id: 'workflow', name: 'Write, edit, render', start: 90, end: 270 },
  { id: 'outro', name: 'Seekframe', start: 270, end: 360 },
];

/* 2. params: everything the editor may change. `scene` = shows on that scene's card; none = Style tab.
      `cssVar` params need no code (the editor sets the CSS variable). Brand colours come from brand/brand.json. */
const PARAMS = [
  ...SF.brandParams(),
  { id: 'align', type: 'select', label: 'Text alignment', default: 'center', options: [{ value: 'center', label: 'Centred' }, { value: 'start', label: 'Start (left / right in RTL)' }] },
  { id: 'logo', type: 'image', label: 'Logo (top corner)', default: '', help: 'PNG/SVG with transparent background works best.' },
  { id: 'title', type: 'text', label: 'Headline', scene: 'title', default: 'Brand films as code.', multiline: true },
  { id: 'title-size', type: 'number', label: 'Headline size', scene: 'title', default: 92, min: 40, max: 160, step: 2, unit: '', cssVar: '--title-size' },
  { id: 'subtitle', type: 'text', label: 'Subtitle', scene: 'title', default: 'Your agent writes. You direct.' },
  { id: 'badge', type: 'boolean', label: 'Show “NEW” badge', scene: 'title', default: true },
  { id: 'f1', type: 'text', label: 'Workflow 1', scene: 'workflow', default: 'Write the film in HTML' },
  { id: 'f2', type: 'text', label: 'Workflow 2', scene: 'workflow', default: 'Edit every beat in the browser' },
  { id: 'f3', type: 'text', label: 'Workflow 3', scene: 'workflow', default: 'Render versions to MP4' },
  { id: 'outro', type: 'text', label: 'Closing line', scene: 'outro', default: 'Seekframe' },
];
const D = Object.fromEntries(PARAMS.map(p => [p.id, p.default]));
const V = id => SF.value(id, D[id]);

/* 3. sound cues: events for the generated score (docs/SOUND.md). They use the SAME frame numbers as the animation. */
function cues() {
  const c = SF.cues();
  c.boom(8, { gain: .6 });                                   // headline lands
  c.tick(34); c.tick(40);
  [0, 12, 24].forEach((f, i) => c.pluck(108 + f, { note: 'D2 F2 A2'.split(' ')[i] }));       // workflow cards
  c.whoosh(286, { dur: .4 });
  c.boom(300, { gain: .9, decay: 2.8 });                     // closing line
  return c.list;
}

/* 4. build + seek */
let R = {};
SF.define({
  title: 'Seekframe Launch', width: 1280, height: 720, fps: 30, duration: 360, scenes: SCENES,
  params: PARAMS, cues, soundtrack: { theme: 'deep' },
  audio: [{ id: 'score', label: 'Generated score', generated: 'cues', default: true }],
  build() {
    const L = SF.layout(), st = document.getElementById('stage'); st.innerHTML = '';
    document.documentElement.style.setProperty('--u', L.unit + 'px'); document.documentElement.style.setProperty('--sx', L.safe.x * 1.4 + 'px');
    document.body.dataset.align = V('align') === 'start' ? 'start' : 'center';
    R = {};
    R.logo = el('img', '', st); R.logo.id = 'logo'; if (V('logo')) { R.logo.src = V('logo'); R.logo.style.display = 'block'; }
    R.title = el('section', 'scene', st, `<div class="col"><div class="badge" style="${V('badge') ? '' : 'display:none'}">NEW</div><h1>${SF.esc(V('title'))}</h1><div class="bar"></div><h2>${SF.esc(V('subtitle'))}</h2></div>`);
    R.workflow = el('section', 'scene', st, `<div class="col"><div class="cards">${['f1', 'f2', 'f3'].map(k => `<div class="card"><i></i>${SF.esc(V(k))}</div>`).join('')}</div></div>`);
    R.outro = el('section', 'scene', st, `<div class="col"><div class="big">${SF.esc(V('outro'))}</div><div class="bar" style="width:${260 * L.unit}px"></div></div>`);
  },
  seek(f) {
    const sc = SCENES.find(s => f >= s.start && f < s.end) || SCENES[SCENES.length - 1];
    for (const s of SCENES) R[s.id].style.display = s === sc ? 'block' : 'none';
    const lf = f - sc.start, len = sc.end - sc.start, node = R[sc.id];
    node.style.opacity = Math.min(rng(lf, 0, 10), 1 - rng(lf, len - 10, len));
    if (sc.id === 'title') {
      const t = E.out(rng(lf, 0, 24)), h1 = node.querySelector('h1'), bar = node.querySelector('.bar'), h2 = node.querySelector('h2');
      h1.style.transform = `translateY(${(1 - t) * 40}px)`; bar.style.width = lerp(0, 360, E.out(rng(lf, 10, 40))) * SF.layout().unit + 'px';
      const s = E.out(rng(lf, 20, 44)); h2.style.opacity = s * .8; h2.style.transform = `translateY(${(1 - s) * 20}px)`;
    } else if (sc.id === 'workflow') {
      node.querySelectorAll('.card').forEach((c, i) => { const t = E.out(rng(lf, i * 12, i * 12 + 26)); c.style.opacity = t; c.style.transform = `translateY(${(1 - t) * 60}px) scale(${.94 + .06 * t})`; });
    } else {
      const t = E.out(rng(lf, 0, 22)), b = node.querySelector('.big'); b.style.transform = `scale(${.85 + .15 * t})`; b.style.opacity = t;
      node.querySelector('.bar').style.transform = `scaleX(${E.out(rng(lf, 14, 40))})`;
    }
  },
});

// @ts-check
/// <reference path="../../dist/types/browser/film-globals.d.ts" />
/* Motion kit demo: a 18 s product film built with SF.timeline (picture + sound declared once), SF.ui and SF.canvas.
   Read it next to docs/MOTION.md. Every animation line below also registers its sound on the same frame. */
'use strict';
const { el } = SF;

const SCENES = [
  { id: 'hook', name: 'Hook', start: 0, end: 120 },
  { id: 'prompt', name: 'Prompt', start: 120, end: 270 },
  { id: 'answer', name: 'Answer', start: 270, end: 420 },
  { id: 'outro', name: 'Outro', start: 420, end: 540, allow: ['occupancy: end card, the wordmark is the hero', 'motion: the end card holds on the logo'] },
];
const PARAMS = [
  ...SF.brandParams(),
  { id: 'title', type: 'text', label: 'Headline', scene: 'hook', default: 'Ask. Watch. [Ship.]' },
  { id: 'title-size', type: 'number', label: 'Headline size', scene: 'hook', default: 190, min: 90, max: 240, step: 2, cssVar: '--title-size' },
  { id: 'sub', type: 'text', label: 'Subtitle', scene: 'hook', default: 'A film from one sentence' },
  { id: 'badge', type: 'text', label: 'Badge', scene: 'hook', default: 'NEW' },
  { id: 'prompt', type: 'text', label: 'Prompt', scene: 'prompt', default: 'Make a 20 second launch film for our app', multiline: true },
  { id: 'a-title', type: 'text', label: 'Result headline', scene: 'answer', default: 'Then it checks its own work.' },
  { id: 'a-card', type: 'text', label: 'Result card', scene: 'answer', default: 'Ready in 41 seconds' },
  { id: 'a-label', type: 'text', label: 'Counter label', scene: 'answer', default: 'films made' },
  { id: 'a-count', type: 'number', label: 'Counter value', scene: 'answer', default: 15850, min: 0, max: 999999, step: 50 },
  { id: 'end-word', type: 'text', label: 'Wordmark', scene: 'outro', default: 'Your brand' },
  { id: 'end-tag', type: 'text', label: 'Tagline', scene: 'outro', default: 'Films as code' },
];
const D = Object.fromEntries(PARAMS.map(p => [p.id, p.default]));
const V = id => SF.value(id, D[id]);
const CHIPS = ['review', 'critique', 'render'];

let R = {};
SF.define({
  title: 'Motion kit demo', width: 1920, height: 1080, fps: 30, duration: 540, scenes: SCENES, poster: 400,
  params: PARAMS, soundtrack: { theme: 'bright', loudness: -14 },
  audio: [{ id: 'score', label: 'Generated score', generated: 'cues', default: true }],
  sizes: [{ width: 1080, height: 1920, label: '9:16' }, { width: 1080, height: 1080, label: '1:1' }],
  variants: { thumbFrame: 400 },

  build() {
    const st = document.getElementById('stage'); st.innerHTML = '';
    const cv = SF.canvas(st, { design: { '16x9': [1920, 1080], '9x16': [1080, 1920], '1x1': [1080, 1080] } });
    R = { cv, portrait: cv.portrait, w: cv.w };
    R.bg = SF.ui.blobs(cv.root, { colors: ['var(--acc)', 'color-mix(in srgb, var(--acc) 35%, var(--bg))'], count: 5 });
    R.view = el('div', '', cv.root); Object.assign(R.view.style, { position: 'absolute', inset: '0' });   // the camera moves this
    R.sc = Object.fromEntries(SCENES.map(s => [s.id, el('section', 'sc', R.view, '<div class="col"></div>')]));
    const col = id => R.sc[id].querySelector('.col');
    const small = cv.w < 1500;                                    // narrow canvases (9:16, 1:1) use smaller type and stack everything

    // 1 hook
    // narrow canvases (9:16, 1:1): smaller type, same code
    R.h1 = el('h1', '', col('hook')); if (small) R.h1.style.fontSize = `calc(var(--title-size) * .52px)`;
    R.words = SF.words(R.h1, V('title'));
    R.sub = el('h2', '', col('hook'), SF.esc(V('sub')));
    R.badge = SF.ui.pill(col('hook'), V('badge'), { accent: true });
    // 2 prompt
    const br = SF.ui.browser(col('prompt'), { url: 'app.example.com', width: small ? 880 : 1560, height: small ? 720 : 760 }); R.browser = br.el;
    Object.assign(br.screen.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' });
    R.comp = SF.ui.composer(br.screen, { width: small ? 780 : 1360 });
    // 3 answer
    R.ah = el('div', 'big2', col('answer'), SF.esc(V('a-title'))); if (small) R.ah.style.fontSize = '72px';
    const row = el('div', 'row', col('answer'));
    R.card = SF.ui.card(row, { title: V('a-card'), body: 'Text, motion, sound' });
    R.counter = SF.ui.counter(row, { label: V('a-label') });
    R.chips = SF.ui.chips(col('answer'), CHIPS).chips;
    // 4 outro
    R.logo = SF.ui.logo(col('outro'), { word: V('end-word'), tagline: V('end-tag') });
    R.hl = R.words.find(w => w.classList.contains('hl'));
  },

  timeline(T, v) {
    const { fast, base, slow } = T.tokens, small = R.cv.w < 1500;
    // 1 hook: words rise one after the other, the keyword highlight wipes in, the badge pops, then a zoom-through exit
    T.scene(R.sc.hook, 0, 120).rise(R.words, 2, { stagger: 6, dur: base }).rise(R.sub, 34).pop(R.badge, 44);
    T.on(f => { if (R.hl) SF.wipe(R.hl, SF.rng(f, 30, 50)); });
    T.exit([R.h1, R.sub, R.badge], 104, { to: 'zoom', dur: fast + 4 });
    // 2 prompt: the browser rises, the prompt types with real keystrokes, send is pressed, the camera pushes to the box
    T.scene(R.sc.prompt, 120, 270).rise(R.browser, 122, { dur: slow, dist: 70 });
    T.type(R.comp.input, String(v['prompt'] ?? D['prompt']), 146, 206, { caret: true });
    T.press(R.comp.send, 220);
    T.camera(R.view).push(0, 112, { scale: 1.07 }).reset(114, 126).push(130, 226, { scale: small ? 1.05 : 1.12, x: R.cv.w / 2, y: R.cv.h / 2 }).reset(256, 268).push(290, 408, { scale: 1.06 }).reset(410, 420);
    T.exit(R.browser, 252, { to: 'above', dur: fast + 6 });
    // 3 answer: headline rises, card and counter follow, the counter rolls with ticks, chips pop one by one
    T.scene(R.sc.answer, 270, 420).rise(R.ah, 272).rise(R.card, 290).rise(R.counter.el, 298);
    T.count(R.counter.value, 0, +(v['a-count'] ?? D['a-count']), 306, 366, { format: n => Math.round(n).toLocaleString('en-US') });
    T.pop(R.chips, 330, { stagger: 8 });
    T.exit([R.ah, R.card, R.counter.el, ...R.chips], 404, { to: 'fade', dur: fast, stagger: 0 });
    // 4 outro: silence before, iris reveal with an impact on the frame, tagline follows
    T.scene(R.sc.outro, 420, 540).reveal(R.logo.el, 426, { style: 'iris', dur: 26, lead: 4 }).rise(R.logo.tag, 458);
    // a soft bed under everything so no stretch is silent
    T.cue('roomtone', 0, { to: 540, gain: .08 });
    T.on(f => R.bg.draw(f));
  },
});

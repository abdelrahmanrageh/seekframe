// @ts-check
/// <reference path="../../dist/types/browser/film-globals.d.ts" />
/* Motion kit demo: "Lumen", a made-up shop-support AI, in 18 s. Built with SF.timeline (picture and sound declared once),
   SF.ui and SF.canvas. Read it next to docs/MOTION.md: every animation line also registers its sound on the same frame.
   Sound is kept sparse on purpose: one swipe per group, typing thinned to human speed, no noise bed. */
'use strict';
const { el } = SF;

const SCENES = [
  { id: 'hook', name: 'Hook', start: 0, end: 105 },
  { id: 'chat', name: 'Chat', start: 105, end: 285 },
  { id: 'proof', name: 'Numbers', start: 285, end: 405 },
  { id: 'outro', name: 'Outro', start: 405, end: 540, allow: ['occupancy: end card, the wordmark is the hero', 'motion: the end card holds on the logo'] },
];
const PARAMS = [
  ...SF.brandParams(),
  { id: 'label', type: 'text', label: 'Hook label', scene: 'hook', default: 'Average support reply' },
  { id: 'wait', type: 'number', label: 'Wait (minutes)', scene: 'hook', default: 47, min: 1, max: 999, step: 1 },
  { id: 'hook-line', type: 'text', label: 'Hook line', scene: 'hook', default: 'Customers don’t wait that long.' },
  { id: 'meet', type: 'text', label: 'Chat headline', scene: 'chat', default: 'Meet Lumen.' },
  { id: 'meet-sub', type: 'text', label: 'Chat subtitle', scene: 'chat', default: 'Answers in seconds.' },
  { id: 'question', type: 'text', label: 'Customer question', scene: 'chat', default: 'Is the blue jacket in stock in M?' },
  { id: 'answer', type: 'text', label: 'Lumen’s answer', scene: 'chat', default: 'Yes, 3 left in M. Free delivery by Friday.' },
  { id: 'cta', type: 'text', label: 'Button', scene: 'chat', default: 'Add to cart' },
  { id: 'proof-title', type: 'text', label: 'Numbers headline', scene: 'proof', default: 'Lumen, by the numbers' },
  { id: 'end-word', type: 'text', label: 'Wordmark', scene: 'outro', default: 'lumen' },
  { id: 'end-tag', type: 'text', label: 'Tagline', scene: 'outro', default: 'Answers before they ask.' },
];
const D = Object.fromEntries(PARAMS.map(p => [p.id, p.default]));
const V = id => SF.value(id, D[id]);
const STATS = [{ v: 8, fmt: n => Math.round(n) + ' s', l: 'average reply' }, { v: 92, fmt: n => Math.round(n) + '%', l: 'solved by Lumen' }, { v: 4.8, fmt: n => n.toFixed(1) + '/5', l: 'customer rating' }];

let R = {};
SF.define({
  title: 'Lumen: motion kit demo', width: 1920, height: 1080, fps: 30, duration: 540, scenes: SCENES, poster: 200,
  params: PARAMS, soundtrack: { theme: 'deep' },
  audio: [{ id: 'score', label: 'Generated score', generated: 'cues', default: true }],
  sizes: [{ width: 1080, height: 1920, label: '9:16' }, { width: 1080, height: 1080, label: '1:1' }],
  variants: { thumbFrame: 200 },

  build() {
    const st = document.getElementById('stage'); st.innerHTML = '';
    const cv = SF.canvas(st, { design: { '16x9': [1920, 1080], '9x16': [1080, 1920], '1x1': [1080, 1080] } }), small = cv.w < 1500;
    R = { cv, small };
    // flat shapes behind everything (background, not content): slow drift keeps the frame alive
    R.s1 = el('div', 'shape', cv.root); R.s1.setAttribute('data-sf-bg', ''); Object.assign(R.s1.style, { width: '900px', height: '900px', background: 'var(--acc)', opacity: '.16' });
    R.s2 = el('div', 'shape', cv.root); R.s2.setAttribute('data-sf-bg', ''); Object.assign(R.s2.style, { width: '640px', height: '640px', border: '36px solid var(--fg)', opacity: '.07' });
    R.view = el('div', '', cv.root); Object.assign(R.view.style, { position: 'absolute', inset: '0' });
    R.sc = Object.fromEntries(SCENES.map(s => [s.id, el('section', 'sc', R.view, '<div class="col"></div>')]));
    const col = id => R.sc[id].querySelector('.col');
    const big = small ? .62 : 1;

    // 1 hook: a big number is the picture
    R.lbl = el('div', 'lbl', col('hook'), SF.esc(V('label')));
    R.num = el('div', 'huge', col('hook'), `<span class="n">0</span><small>min</small>`); R.num.style.fontSize = 520 * big + 'px'; R.numV = R.num.querySelector('.n');
    R.hline = el('div', 'line', col('hook'), SF.esc(V('hook-line'))); R.hline.style.fontSize = (small ? 64 : 88) + 'px';

    // 2 chat: headline beside a phone (above it on 9:16)
    const split = el('div', 'split', col('chat')); if (small) Object.assign(split.style, { flexDirection: 'column', gap: '56px', padding: '0 60px' });
    const txt = el('div', 'txt', split); if (small) txt.style.alignItems = 'center', txt.style.textAlign = 'center';
    R.meet = el('div', 'line', txt, SF.esc(V('meet'))); if (small) R.meet.style.fontSize = '104px';
    R.meetSub = el('p', '', txt, SF.esc(V('meet-sub'))); if (small) R.meetSub.style.fontSize = '44px';
    const ph = SF.ui.phone(split, { width: small ? 620 : 640, height: small ? 1010 : 980 }); R.phone = ph.el;
    Object.assign(ph.screen.style, { display: 'flex', flexDirection: 'column' });
    el('div', 'hd', ph.screen, '<i></i>Lumen · online');
    const msgs = el('div', 'msgs', ph.screen); msgs.style.flex = '1'; msgs.style.justifyContent = 'flex-start';
    R.me = el('div', 'bub me', msgs, SF.esc(V('question')));
    const stack = el('div', '', msgs); stack.style.display = 'grid';          // "typing…" dots and the answer share one slot
    R.dots = el('div', 'bub ai dots', stack, '•••'); R.ai = el('div', 'bub ai', stack, '&nbsp;'); R.dots.style.gridArea = R.ai.style.gridArea = '1 / 1';
    R.cta = SF.ui.pill(msgs, V('cta'), { accent: true }); R.cta.style.alignSelf = 'flex-start';
    R.comp = SF.ui.composer(ph.screen, {});
    R.comp.input.style.minHeight = '48px';

    // 3 numbers
    R.ptitle = el('div', 'line', col('proof'), SF.esc(V('proof-title'))); R.ptitle.style.fontSize = (small ? 72 : 96) + 'px';
    const row = el('div', 'cardrow', col('proof')); if (small) Object.assign(row.style, { flexDirection: 'column', gap: '28px' });
    R.stats = STATS.map(s => { const c = el('div', 'stat', row, `<div class="v">0</div><div class="l">${SF.esc(s.l)}</div>`); if (small) { c.style.width = '860px'; c.style.padding = '30px 44px'; c.querySelector('.v').style.fontSize = '150px'; } return c; });

    // 4 outro
    R.logo = SF.ui.logo(col('outro'), { word: V('end-word'), tagline: V('end-tag') }); if (small) R.logo.el.querySelector('.word').style.fontSize = '250px';
    R.panel = el('div', 'panel', R.view); R.panel.setAttribute('data-sf-bg', '');
  },

  timeline(T, v) {
    const { fast, base, slow } = T.tokens, small = R.small, cam = T.camera(R.view);
    const cut = at => {      // transition: an accent panel wipes across the cut and fades away; the camera resets behind it
      T.reveal(R.panel, at - 12, { style: 'wipe', dur: 12, sound: false }).exit(R.panel, at + 2, { to: 'fade', dur: 10, sound: false });
      T.cue('whoosh', at - 12, { dur: .45, gain: .16, p0: -.5, p1: .5 });
      cam.reset(at - 1, at + 2);
    };
    // 1 hook: the label, then the number counts up with ticks, then the line
    T.scene(R.sc.hook, 0, 105).rise(R.lbl, 2).rise(R.num, 6, { dur: slow });
    T.count(R.numV, 0, +(v['wait'] ?? D['wait']), 8, 62, { format: n => String(Math.round(n)) });
    T.rise(R.hline, 66, { dur: base });
    cam.push(0, 100, { scale: 1.05 }); cut(105);
    // 2 chat: headline and phone arrive, the question types, send is pressed, Lumen thinks and answers, the button pops
    T.scene(R.sc.chat, 105, 285).rise([R.meet, R.meetSub], 109, { stagger: 8 }).rise(R.phone, 113, { from: small ? 'below' : 'end', dur: slow, dist: 110 });
    T.type(R.comp.input, String(v['question'] ?? D['question']), 126, 190, { caret: true });
    T.press(R.comp.send, 198);
    T.on(f => { if (f >= 204) R.comp.input.textContent = ''; });
    T.rise(R.me, 204, { dur: base, dist: 40 });
    T.rise(R.dots, 218, { dur: fast, dist: 20, sound: false }).exit(R.dots, 238, { dur: fast, sound: false });
    T.rise(R.ai, 240, { dur: fast, dist: 20 }); T.type(R.ai, String(v['answer'] ?? D['answer']), 244, 262, { keys: false });
    T.pop(R.cta, 266, { stagger: 0 });
    T.on(f => { R.dots.textContent = ['•', '••', '•••'][Math.floor(f / 6) % 3]; });
    cam.push(108, 280, { scale: 1.05 }); cut(285);
    // 3 numbers: the headline, then three cards pop and their numbers roll
    T.scene(R.sc.proof, 285, 405).rise(R.ptitle, 288).pop(R.stats, 298, { stagger: 10 });
    STATS.forEach((s, i) => T.count(R.stats[i].querySelector('.v'), 0, s.v, 302 + i * 10, 352 + i * 10, { format: s.fmt, sound: i === 0 }));
    cam.push(288, 400, { scale: 1.05 }); cut(405);
    // 4 outro: silence, then the wordmark irises in with an impact on the frame
    T.scene(R.sc.outro, 405, 540).reveal(R.logo.el, 410, { style: 'iris', dur: 24, lead: 6 }).rise(R.logo.tag, 442);
    cam.push(408, 538, { scale: 1.04 });
    // a very quiet musical pad under everything (no noise), and a slow drift of the background shapes
    T.cue('pad', 0, { to: 540, gain: .035 });
    T.on(f => { const t = f / 540; R.s1.style.transform = `translate(${R.cv.w * .62 + Math.sin(t * 9) * 120}px, ${-260 + Math.cos(t * 7) * 90}px)`; R.s2.style.transform = `translate(${-180 + Math.cos(t * 6) * 100}px, ${R.cv.h * .6 + Math.sin(t * 8) * 90}px)`; });
  },
});


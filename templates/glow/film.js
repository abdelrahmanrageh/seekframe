// @ts-check
/// <reference path="../../dist/types/browser/film-globals.d.ts" />
/* Glow template: a dark, cinematic product film (hook, logo, three numbered chapters, end card) built on glow.js.
   Read STYLE.md before changing the look. Lays itself out for 16:9 and 9:16 (SF.layout()); colours come from brand/brand.json.
   Golden rule: seek(frame) is a pure function of the frame number. */
'use strict';
const { E, rng, lerp, clamp, esc } = SF;
const { focusIn, show, tf, op, blur } = Glow;
const el = (tag, cls, html, parent) => SF.el(tag, cls, parent, html == null || html === '' ? undefined : html);
const RTL = SF.lang.rtl, DS = RTL ? -1 : 1;

const SCENES = [
  { id: 'hook', name: 'Hook', start: 0, end: 110 },
  { id: 'bridge', name: 'Logo', start: 110, end: 180 },
  { id: 'c1', name: 'Chapter 1', start: 180, end: 350 },
  { id: 'c2', name: 'Chapter 2', start: 350, end: 520 },
  { id: 'c3', name: 'Chapter 3', start: 520, end: 690 },
  { id: 'outro', name: 'End card', start: 690, end: 870 },
];
const S0 = Object.fromEntries(SCENES.map(s => [s.id, s.start]));
// how each cut is covered: 'flash' | 'zoom' | 'streak' | 'leak' (see STYLE.md)
const CUTS = [[110, 'flash'], [180, 'zoom'], [350, 'streak'], [520, 'leak'], [690, 'flash']];
// light per scene: three blooms [x, y (fractions), size (x the long side), colour 'acc' | 'deep' | 'soft', alpha]
const LIGHT = {
  default: [[.5, .5, .85, 'deep', .65], [.8, .2, .55, 'soft', .2], [.15, .85, .6, 'acc', .12]],
  bridge: [[.5, .45, .9, 'acc', .4], [.2, .75, .65, 'deep', .7], [.8, .2, .55, 'soft', .3]],
  c1: [[.68, .5, .85, 'deep', .6], [.86, .25, .5, 'acc', .25], [.15, .9, .65, 'deep', .7]],
  c2: [[.68, .5, .9, 'acc', .3], [.2, .3, .65, 'deep', .6], [.88, .9, .55, 'soft', .2]],
  c3: [[.66, .48, .9, 'acc', .28], [.15, .3, .65, 'deep', .6], [.9, .92, .55, 'soft', .2]],
  outro: [[.5, .44, .9, 'acc', .36], [.26, .74, .65, 'deep', .65], [.76, .24, .55, 'soft', .24]],
};
const SWIRL = { hook: .5, bridge: 1, c1: .6, c2: .5, c3: .45, outro: 1 };

const PARAMS = [
  ...SF.brandParams(),
  { id: 'hookA', type: 'text', label: 'Hook, big line', scene: 'hook', default: 'Every week,' },
  { id: 'hookB', type: 'text', label: 'Hook, second line ([..] = highlight)', scene: 'hook', default: '[12 hours] lost to busywork.' },
  { id: 'logo', type: 'image', label: 'Logo (flat, transparent PNG/SVG)', scene: 'bridge', default: '' },
  { id: 'logoTile', type: 'boolean', label: 'Logo on a light tile (for logos with their own background)', scene: 'bridge', default: false },
  { id: 'name', type: 'text', label: 'Product name (shown when there is no logo)', scene: 'bridge', default: 'Product' },
  { id: 'promise', type: 'text', label: 'Promise', scene: 'bridge', default: 'One place for [all of it.]' },
  { id: 'c1t', type: 'text', label: 'Chapter 1 label', scene: 'c1', default: 'Capture' },
  { id: 'c1h', type: 'text', label: 'Chapter 1 headline', scene: 'c1', default: 'Every request, [in one place.]' },
  { id: 'c1s', type: 'text', label: 'Chapter 1 line', scene: 'c1', default: 'Email, chat and forms land together, sorted for you.', multiline: true },
  { id: 'cards', type: 'text', label: 'Chapter 1 cards (a|b|c)', scene: 'c1', default: 'New request|Assigned to Sara|Done' },
  { id: 'c2t', type: 'text', label: 'Chapter 2 label', scene: 'c2', default: 'Answer' },
  { id: 'c2h', type: 'text', label: 'Chapter 2 headline', scene: 'c2', default: 'Answers in [seconds.]', },
  { id: 'c2s', type: 'text', label: 'Chapter 2 line', scene: 'c2', default: 'An assistant that knows your product and never sleeps.', multiline: true },
  { id: 'chips', type: 'text', label: 'Chapter 2 chips (a|b|c…)', scene: 'c2', default: 'Pricing?|Refunds?|Shipping?|Sizes?|Hours?|Invoices?' },
  { id: 'c3t', type: 'text', label: 'Chapter 3 label', scene: 'c3', default: 'Measure' },
  { id: 'c3h', type: 'text', label: 'Chapter 3 headline', scene: 'c3', default: 'Every number, [live.]' },
  { id: 'c3s', type: 'text', label: 'Chapter 3 line', scene: 'c3', default: 'See what is working the moment it happens.', multiline: true },
  { id: 'kpis', type: 'text', label: 'Chapter 3 numbers (label:value|…)', scene: 'c3', default: 'Requests:1284|Answered:1052|Saved hours:312' },
  { id: 'tag', type: 'text', label: 'Closing line', scene: 'outro', default: 'Less busywork. [More work.]' },
  { id: 'url', type: 'text', label: 'URL', scene: 'outro', default: 'product.com' },
  { id: 'with', type: 'text', label: 'Logos row label', scene: 'outro', default: 'Works with' },
  { id: 'logo1', type: 'image', label: 'Partner logo 1', scene: 'outro', default: '' },
  { id: 'logo2', type: 'image', label: 'Partner logo 2', scene: 'outro', default: '' },
  { id: 'logo3', type: 'image', label: 'Partner logo 3', scene: 'outro', default: '' },
  { id: 'logo4', type: 'image', label: 'Partner logo 4', scene: 'outro', default: '' },
  { id: 'title-size', type: 'number', label: 'Text size', default: 100, min: 80, max: 120, step: 1, cssVar: '--title-size' },
  { id: 'grain', type: 'number', label: 'Film grain', default: 100, min: 0, max: 200, step: 10 },
  { id: 'sfx', type: 'select', label: 'Sound', group: 'sound', default: 'generated', options: [{ value: 'generated', label: 'Generated (built in)' }, { value: 'pack', label: 'Sound pack (assets/sfx)' }],
    help: 'Pack: drop your own files in assets/sfx with the names in assets/sfx/README.md.' },
];
const D = Object.fromEntries(PARAMS.map(p => [p.id, p.default]));
const V = id => SF.value(id, D[id]);
const list = id => String(V(id)).split('|').map(s => s.trim()).filter(Boolean);

/* ---------- sound: one vocabulary, two sources (generated cues or a sample pack) ---------- */
// file and its peak level, so every sound lands at the same loudness whatever the file
const PEAK = { whoosh: .79, swoosh: .8, fast: 1, sharp: 1, soft: .2, shine: .73, tap: .7, pop: .94, success: .58 };
const PACK = { whoosh: 'whoosh.mp3', swoosh: 'swoosh.mp3', fast: 'whoosh-fast.mp3', sharp: 'sharp-pop.mp3', soft: 'soft-pop.mp3', shine: 'shine.mp3', tap: 'tap.mp3', pop: 'pop.mp3', success: 'success.mp3' };
const BEAT = { hookB: 40, cards: [40, 56, 72], chips: [40, 46, 52, 58, 64, 70], count: [40, 90] };
function cues() {
  const c = SF.cues(), pack = SF.value('sfx', 'generated') === 'pack';
  const s = (f, k, g = 1, o = {}) => {
    if (pack) return c.sample(f, { src: 'assets/sfx/' + PACK[k], gain: .2 * g / PEAK[k], ...(k === 'fast' ? { dur: 1.3, fadeOut: .4 } : k === 'shine' || k === 'success' ? { dur: 1.8, fadeOut: .6 } : {}), ...o });
    const G = { whoosh: () => c.whoosh(f, { dur: .45, gain: .5 * g, ...o }), swoosh: () => c.swipe(f, { dur: .35, gain: .45 * g, ...o }), fast: () => c.whoosh(f, { dur: .8, gain: .55 * g, ...o }),
      sharp: () => c.tick(f, { gain: .6 * g, ...o }), soft: () => c.blip(f, { gain: .18 * g, freq: 1400, ...o }), shine: () => c.keys(f, { note: 'A5', gain: .25 * g, ...o }),
      tap: () => c.dtick(f, { gain: .4 * g, ...o }), pop: () => c.blip(f, { gain: .3 * g, freq: 900, ...o }), success: () => c.pluck(f, { note: 'E4', gain: .5 * g, ...o }) };
    return G[k]();
  };
  const words = (at, n, step = 4) => { for (let i = 0; i < n; i++) s(at + i * step, 'soft', 1, { rate: 1 + i * .05, min: true }); };
  for (const [f, k] of CUTS) { if (k === 'zoom') s(f - 8, 'whoosh'); if (k === 'leak') { s(f - 12, 'fast'); s(f + 2, 'shine', .4); } if (k === 'flash') { s(f - 12, 'fast'); s(f, 'sharp', .7); } if (k === 'streak') s(f - 6, 'swoosh'); }
  s(6, 'sharp'); words(BEAT.hookB, 4);
  s(S0.bridge + 2, 'shine', .8); words(S0.bridge + 24, 4);
  for (const id of ['c1', 'c2', 'c3']) { s(S0[id] + 6, 'tap', .6); words(S0[id] + 14, 4); }
  BEAT.cards.forEach((d, i) => s(S0.c1 + d, 'pop', .6, { rate: 1 + i * .06 }));
  BEAT.chips.forEach((d, i) => s(S0.c2 + d, 'pop', .35, { rate: 1 + i * .07 }));
  for (let f = BEAT.count[0]; f < BEAT.count[1]; f += 3) s(S0.c3 + f, 'soft', .6, { rate: 1 + (f - 40) * .012 });
  s(S0.c3 + BEAT.count[1], 'success', .7);
  const O = S0.outro; s(O + 4, 'shine', .8); words(O + 40, 4); s(O + 76, 'tap', .7); [104, 110, 116, 122].forEach((d, i) => s(O + d, 'pop', .4, { rate: 1 + i * .06 }));
  return c.list;
}

/* ---------- build ---------- */
/** @type {Record<string, any>} */ let R = {}, G;
const place = (e, x, y) => { e.style.left = x + 'px'; e.style.top = y + 'px'; };
const centre = (e, x, y) => place(e, x - e.offsetWidth / 2, y - e.offsetHeight / 2);
const hd = (s, text, cls) => { const l = el('div', 'g-hd ' + cls, '', s); return { l, w: SF.words(l, text) }; };
const fmt = n => Math.round(n).toLocaleString('en-US');

SF.define({
  title: 'Glow film', width: 1920, height: 1080, fps: 30, duration: 870, scenes: SCENES, params: PARAMS, cues, poster: 760,
  sizes: [{ width: 1920, height: 1080, label: '16:9' }, { width: 1080, height: 1920, label: '9:16' }],
  soundtrack: () => ({ theme: 'deep', loudness: -14 }),
  audio: [{ id: 'sfx', label: 'Sound effects', generated: 'cues', default: true }],
  build(values) {
    const L = SF.layout(), W = L.W, H = L.H, P = L.portrait, st = document.getElementById('stage'); st.innerHTML = ''; R = { W, H, P };
    G = Glow.install(st, { scenes: SCENES, cuts: CUTS, light: LIGHT, swirl: SWIRL });
    const sec = id => { const s = el('section', 'sc', '', st); R[id] = s; const cam = el('div', 'cam', '', s); R[id + 'Cam'] = cam; return cam; };
    // the text column: beside the visual on 16:9, above it on 9:16
    const colW = P ? W - 140 : 780, colX = P ? 70 : (RTL ? W - 150 - colW : 150), VX = P ? W / 2 : (RTL ? W * .32 : W * .68), VY = P ? H * .64 : H / 2;
    R.VX = VX; R.VY = VY;
    const column = (s, n, t, h, sub) => {
      const c = el('div', 'g-chap', `<b>0${n}</b><span>${esc(V(t))}</span>`, s), hh = hd(s, V(h), 'side'), su = el('div', 'g-sub', esc(V(sub)), s);
      for (const e of [c, hh.l, su]) { e.style.width = colW + 'px'; place(e, colX, 0); } c.style.justifyContent = 'flex-start';
      return { c, h: hh, s: su };
    };

    /* hook */
    let s = sec('hook');
    R.hkA = el('div', 'g-big', esc(V('hookA')), s); R.hkA.style.fontSize = (P ? 150 : 190) + 'px';
    R.hkB = hd(s, V('hookB'), 'c'); R.hkB.l.style.fontSize = `calc(var(--T) * ${P ? 1.05 : 1.25})`;

    /* bridge */
    s = sec('bridge');
    R.brLogo = V('logo') ? el('img', 'abs', '', s) : el('div', 'g-big', esc(V('name')), s);
    // the logo stays flat: as it is, or on a light tile when it has its own background
    const logoStyle = (img, h) => { img.src = V('logo'); img.style.height = h + 'px'; if (V('logoTile')) img.style.cssText += ';padding:18px;border-radius:28px;background:var(--paper);box-shadow:0 30px 80px rgba(0,0,0,.5)'; };
    if (V('logo')) logoStyle(R.brLogo, 300); else R.brLogo.style.fontSize = '170px';
    R.br = hd(s, V('promise'), 'c');

    /* 01: cards fan out in depth */
    s = sec('c1'); R.k1 = column(s, 1, 'c1t', 'c1h', 'c1s');
    R.cards = list('cards').slice(0, 3).map((t, i) => el('div', 'g-glass', `<div style="display:flex;align-items:center;gap:22px;padding:30px 36px;font-size:34px;font-weight:600;white-space:nowrap"><i style="width:52px;height:52px;border-radius:16px;flex:none;background:${i === 2 ? 'var(--acc)' : 'rgba(255,255,255,.12)'}"></i>${esc(t)}</div>`, s));

    /* 02: chips orbit an orb */
    s = sec('c2'); R.k2 = column(s, 2, 'c2t', 'c2h', 'c2s');
    R.orb = el('div', 'g-orb', V('logo') ? `<img alt="" src="${esc(V('logo'))}" style="max-width:60%;max-height:40%">` : `<b style="font-size:60px">${esc(String(V('name')).slice(0, 1))}</b>`, s);
    R.chips = list('chips').map(t => el('div', 'g-glass g-pill', esc(t), s));

    /* 03: a rim-lit panel of numbers */
    s = sec('c3'); R.k3 = column(s, 3, 'c3t', 'c3h', 'c3s');
    const kp = list('kpis').map(x => { const [k, v] = x.split(':'); return [k, +String(v).replace(/[^0-9.]/g, '') || 0]; });
    R.panel = el('div', 'g-glass', `<div style="padding:40px;display:grid;grid-template-columns:repeat(${Math.min(3, kp.length)},1fr);gap:24px;width:${P ? 860 : 740}px">
      ${kp.map(([k]) => `<div style="padding:26px;border-radius:24px;background:rgba(255,255,255,.06)"><div style="font-size:24px;opacity:.6">${esc(k)}</div><div class="kv" style="font:800 56px Inter,sans-serif;margin-top:8px">0</div></div>`).join('')}
      <div class="bars" style="grid-column:1/-1;height:220px;display:flex;align-items:flex-end;gap:10px;padding-top:20px">${Array.from({ length: 24 }, (_, i) => `<i style="flex:1;border-radius:6px 6px 2px 2px;background:${i % 5 === 4 ? 'var(--acc)' : 'rgba(255,255,255,.22)'};height:${20 + SF.hash(i * 3.7) * 80}%"></i>`).join('')}</div></div>`, s);
    R.kv = [...R.panel.querySelectorAll('.kv')].map((e, i) => ({ e, v: kp[i][1] })); R.bars = [...R.panel.querySelectorAll('.bars i')];
    R.rimEl = el('div', 'g-rim', '', s);

    /* outro */
    s = sec('outro');
    R.oLogo = V('logo') ? el('img', 'abs', '', s) : el('div', 'g-big', esc(V('name')), s);
    if (V('logo')) logoStyle(R.oLogo, 190); else R.oLogo.style.fontSize = '150px';
    R.tag = hd(s, V('tag'), 'c');
    R.url = el('div', 'g-url', esc(V('url')), s);
    const logos = ['logo1', 'logo2', 'logo3', 'logo4'].map(V).filter(Boolean);
    R.logos = el('div', 'g-logos', logos.length ? `<span class="lab">${esc(V('with'))}</span>${logos.map(src => `<span class="g-tile"><img alt="" src="${esc(src)}"></span>`).join('')}` : '', s);
    R.logoItems = [...R.logos.children];

    G.overlays((values.grain ?? 100) / 100);

    /* measured layout */
    for (const sc of SCENES) R[sc.id].style.display = 'block';
    // big lines shrink to fit the frame, whatever someone types
    for (const e of [R.hkA, R.brLogo, R.oLogo]) if (e.tagName !== 'IMG' && e.scrollWidth > W - 120) e.style.fontSize = (parseFloat(e.style.fontSize) * (W - 120) / e.scrollWidth) + 'px';
    R.hkA.style.top = (H / 2 - (P ? 260 : 230)) + 'px'; R.hkB.l.style.top = (H / 2 + 20) + 'px';
    centre(R.brLogo, W / 2, H / 2 - 150); R.br.l.style.top = (H / 2 + 60) + 'px';
    for (const k of [R.k1, R.k2, R.k3]) {
      const top = P ? 170 : H / 2 - 230; k.c.style.top = top + 'px'; k.h.l.style.top = (top + 84) + 'px'; k.s.style.top = (top + 84 + k.h.l.offsetHeight + 24) + 'px';
    }
    R.cards.forEach((c, i) => centre(c, VX + DS * (i - 1) * 60, VY + (i - 1) * 150));
    centre(R.orb, VX, VY);
    R.chipAt = R.chips.map((c, i) => { const a = i / R.chips.length * Math.PI * 2 + .4; return [VX + Math.cos(a) * (P ? 330 : 400) - c.offsetWidth / 2, VY + Math.sin(a) * (P ? 300 : 260) - c.offsetHeight / 2]; });
    R.chips.forEach((c, i) => place(c, ...R.chipAt[i]));
    centre(R.panel, VX, VY);
    centre(R.oLogo, W / 2, H / 2 - (P ? 300 : 230)); R.tag.l.style.top = (H / 2 - (P ? 60 : 20)) + 'px';
    R.url.style.top = (H / 2 + (P ? 140 : 130)) + 'px'; R.logos.style.top = (H / 2 + (P ? 300 : 290)) + 'px';
    for (const sc of SCENES) R[sc.id].style.display = '';
  },
  seek(f) {
    const sc = SCENES.find(s => f >= s.start && f < s.end) || SCENES[SCENES.length - 1], lf = f - sc.start, len = sc.end - sc.start;
    for (const s of SCENES) R[s.id].style.display = s === sc ? 'block' : 'none';
    G.atmosphere(f, RTL); G.camera(R[sc.id + 'Cam'], sc, lf, len);
    DRAW[sc.id](lf, len);
    G.cutFx(f, RTL);
  },
});

const chapterIn = (k, lf) => { show(k.c, lf, 4, 18, 20, 10); focusIn(k.h.w, lf, 12, 4); show(k.s, lf, 30, 46, 20, 10); };
const DRAW = {
  hook(lf) {
    const u = E.out(rng(lf, 4, 16)); op(R.hkA, u); blur(R.hkA, (1 - u) * 24); tf(R.hkA, `scale(${lerp(1.35, 1, u)})`);
    focusIn(R.hkB.w, lf, BEAT.hookB, 5);
  },
  bridge(lf) { show(R.brLogo, lf, 2, 24, 0, 18); focusIn(R.br.w, lf, 22, 4); },
  c1(lf) {
    chapterIn(R.k1, lf);
    R.cards.forEach((c, i) => { const t = BEAT.cards[i], u = E.out(rng(lf, t - 10, t + 12)); op(c, u); blur(c, (1 - u) * 16 + (2 - i) * .6); tf(c, `translateZ(${(1 - u) * -400 + i * 40}px) rotateY(${DS * (-18 + lf * .04)}deg) rotateX(8deg) translateY(${(1 - u) * 60}px)`); });
  },
  c2(lf) {
    chapterIn(R.k2, lf);
    const o = E.out(rng(lf, 8, 34)); op(R.orb, o); blur(R.orb, (1 - o) * 18); tf(R.orb, `scale(${lerp(.7, 1, o) * (1 + Math.sin(lf / 14) * .02)})`);
    R.chips.forEach((c, i) => { const t = BEAT.chips[i % BEAT.chips.length] + Math.floor(i / 6) * 4, u = E.out(rng(lf, t, t + 14)), a = lf * .006 + i, z = Math.sin(a) * 260;
      op(c, u); blur(c, (1 - u) * 14 + Math.max(0, -z) / 50); tf(c, `translate(${Math.cos(a) * 30}px, ${Math.sin(a * 1.3) * 20}px) translateZ(${z}px) scale(${lerp(.8, 1, u)})`); });
  },
  c3(lf) {
    chapterIn(R.k3, lf);
    const u = E.out(rng(lf, 4, 34));
    tf(R.panel, `translateX(${DS * (1 - u) * 200}px) translateZ(${-200 + u * 100}px) rotateY(${DS * (-16 + lf * .05)}deg) rotateX(7deg)`); op(R.panel, u); blur(R.panel, (1 - u) * 14);
    G.rim(R.rimEl, R.panel, lf, RTL ? 'right' : 'left');
    const k = E.out(rng(lf, BEAT.count[0], BEAT.count[1])); R.kv.forEach(({ e, v }) => { e.textContent = fmt(v * k); });
    R.bars.forEach((b, i) => { const t = 30 + i * 1.6; b.style.transformOrigin = '50% 100%'; b.style.transform = `scaleY(${E.out(rng(lf, t, t + 14))})`; });
  },
  outro(lf) {
    show(R.oLogo, lf, 6, 30, 0, 18); focusIn(R.tag.w, lf, 30, 5); show(R.url, lf, 70, 86, 20, 10);
    R.logoItems.forEach((e, i) => show(e, lf, 96 + i * 6, 112 + i * 6, 24, 12));
  },
};

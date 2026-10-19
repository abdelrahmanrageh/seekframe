// @ts-check
/// <reference path="../../dist/types/browser/film-globals.d.ts" />
/* Seekframe launch film: "Your LLM can write code. Can it see a film?" 1920x1080, 30 fps, 28 s.
   Made with Seekframe itself. Every wording and colour is an editable param; the score is generated from the cues below. */
'use strict';
const { E, rng, lerp, clamp, kf, hash, esc } = SF;
// el(tag, class, html, parent): local helper (SF.el takes (tag, cls, parent, html))
const el = (tag, cls, html, parent) => SF.el(tag, cls, parent, html || undefined);

const SCENES = [
  { id: 'hook', name: 'Hook', start: 0, end: 120 },
  { id: 'logo', name: 'Logo', start: 120, end: 210 },
  { id: 'prompt', name: 'Prompt', start: 210, end: 360 },
  { id: 'editor', name: 'Editor', start: 360, end: 510 },
  { id: 'variants', name: 'Variants', start: 510, end: 630 },
  { id: 'sound', name: 'Sound', start: 630, end: 720 },
  { id: 'end', name: 'End card', start: 720, end: 840 },
];
const S0 = Object.fromEntries(SCENES.map(s => [s.id, s.start]));

/* ---------- params ---------- */
const DEF = {
  'hook-1': 'Your LLM can write code.', 'hook-2': 'Can it [see] a film?',
  'logo-line': 'Brand films as code.',
  'prompt': 'Read docs/FILM_SPEC.md. Build a 20 s product reveal for Acme, with every wording and colour as an editable option. Then validate, review and fix.',
  'chk-1': 'validate: determinism, params, flashing', 'chk-2': 'review: overflow, contrast, contact sheets', 'chk-3': 'sync: sound lands on the picture',
  'ed-field': 'Spring sale', 'ed-label': 'Headline',
  'v-1': 'Doubt', 'v-2': 'Counter', 'v-3': 'Cash on delivery', 'v-4': 'عربي · RTL', 'v-5': 'Folded tiles', 'v-6': 'Chat bubbles',
  'sound-line': 'Sound that can’t drift: cues sit on the frames you animate.',
  'end-tag': 'Brand films as code.', 'end-url': 'github.com/abdelrahmanrageh/seekframe', 'end-note': 'Open source · MIT',
  'logo': 'brand/assets/logo.jpg', 'size': 100,
};
const T = (/** @type {string} */ id) => SF.value(id, DEF[id]);
const TXT = (id, label, scene, extra = {}) => ({ id, type: 'text', label, scene, default: DEF[id], ...extra });
const PARAMS = [
  ...SF.brandParams(),
  { id: 'logo', type: 'image', label: 'Logo image', default: DEF.logo, help: 'Shown on the logo and end scenes.' },
  { id: 'size', type: 'number', label: 'Headline size', scene: 'hook', default: 100, min: 70, max: 130, step: 2, unit: '', cssVar: '--title-size' },
  TXT('hook-1', 'Line 1', 'hook'), TXT('hook-2', 'Line 2 ([word] = highlighted)', 'hook'),
  TXT('logo-line', 'Tagline', 'logo'),
  TXT('prompt', 'Prompt', 'prompt', { multiline: true }), TXT('chk-1', 'Check 1', 'prompt'), TXT('chk-2', 'Check 2', 'prompt'), TXT('chk-3', 'Check 3', 'prompt'),
  TXT('ed-label', 'Field label', 'editor'), TXT('ed-field', 'Field text (typed live)', 'editor'),
  ...['v-1', 'v-2', 'v-3', 'v-4', 'v-5', 'v-6'].map((id, i) => TXT(id, `Tile ${i + 1}`, 'variants')),
  TXT('sound-line', 'Caption', 'sound', { multiline: true }),
  TXT('end-tag', 'Tagline', 'end'), TXT('end-url', 'URL', 'end'), TXT('end-note', 'Note', 'end'),
];

/* ---------- sound: cues on the same frames as the animation ---------- */
function cues() {
  const c = SF.cues();
  c.drone(0, 118, { gain: .03, open0: 240, open1: 700 });
  c.tick(34, { gain: .08, freq: 2000 }); c.boom(58, { gain: .55, decay: 1.6 });                         // "see" lands
  c.silence(116, 120);
  c.boom(S0.logo, { gain: .9, decay: 3.2 }); c.whoosh(S0.logo - 6, { dur: .6, gain: .2, p0: -.5, p1: .5 }); c.dtick(S0.logo + 34, { gain: .22 });
  for (let f = S0.prompt + 14; f < S0.prompt + 96; f += 3) c.tick(f, { gain: .035, freq: 1700 + (f % 5) * 90, pan: (f % 2 ? .2 : -.2) });   // typing
  [0, 1, 2].forEach(i => { c.pluck(S0.prompt + 104 + i * 12, { note: ['D2', 'F2', 'A2'][i], gain: .35 }); c.tick(S0.prompt + 104 + i * 12, { gain: .12, freq: 2300 + i * 160 }); });
  c.boom(S0.editor, { gain: .5, decay: 1.2 }); c.whoosh(S0.editor - 4, { dur: .5, gain: .14 });
  for (let f = S0.editor + 40; f < S0.editor + 84; f += 4) c.tick(f, { gain: .04, freq: 1900 + (f % 3) * 120, pan: .15 });
  c.dtick(S0.editor + 96, { gain: .2 }); c.boom(S0.editor + 112, { gain: .35, decay: .9, f0: 70, f1: 42 });
  [0, 1, 2, 3, 4, 5].forEach(i => { const f = S0.variants + 8 + i * 16; c.pluck(f, { note: ['D2', 'F2', 'A2', 'D3', 'F2', 'A2'][i], gain: .4 }); c.boom(f, { gain: .22, decay: .5, f0: 70, f1: 44 }); c.tick(f, { gain: .08, freq: 2100 + i * 100, pan: (i % 3 - 1) * .4 }); });
  c.kick(S0.sound, { gain: .4 }); for (let f = S0.sound; f < S0.sound + 88; f += 24) { c.kick(f, { gain: .26 }); c.shaker(f + 12, { gain: .04 }); }
  c.riser(S0.sound + 20, S0.end, { gain: .24 }); c.silence(S0.end - 3, S0.end);
  c.boom(S0.end, { gain: 1, decay: 4 }); c.dtick(S0.end + 32, { gain: .26 }); c.pad(S0.end + 20, 840, { gain: .02 });
  return c.list;
}

/* ---------- build ---------- */
/** @type {Record<string, any>} */ let R = {};
SF.define({
  title: 'Seekframe launch', width: 1920, height: 1080, fps: 30, duration: 840, scenes: SCENES, params: PARAMS, cues, soundtrack: { theme: 'deep' },
  audio: [{ id: 'score', label: 'Generated score', generated: 'cues', default: true }],
  variants: { thumbFrame: 60, presets: [{ id: 'default', label: 'Launch · cream', params: {} }, { id: 'night', label: 'Launch · night', params: { 'brand-paper': '#14140f', 'brand-ink': '#faf3e3' } }] },
  build() {
    const st = document.getElementById('stage'); st.innerHTML = ''; R = {};
    const sec = (id, cls) => { const s = el('section', 'sc ' + cls, '', st); s.id = 's-' + id; return s; };
    // 1 hook
    R.hook = sec('hook', 'B'); R.h1 = el('div', 'abs big', '', R.hook); R.h2 = el('div', 'abs big', '', R.hook);
    R.h1.style.cssText = 'left:150px;top:300px'; R.h2.style.cssText = 'left:150px;top:' + (300 + SF.layout().unit * 130) + 'px';
    R.hw1 = SF.words(R.h1, T('hook-1')); R.hw2 = SF.words(R.h2, T('hook-2'));
    R.eye = el('div', 'abs label', 'a film is a pure function of the frame number', R.hook); R.eye.style.cssText = 'left:150px;bottom:110px';
    // 2 logo
    R.logo = sec('logo', 'A'); R.tile = el('div', 'logotile', '<img alt="Seekframe logo">', R.logo); R.tile.style.cssText = 'left:150px;top:190px;width:700px;height:700px';
    R.tile.firstChild.src = T('logo'); R.tag = el('div', 'abs big', '', R.logo); R.tag.style.cssText = 'left:960px;top:360px;width:810px;font-size:96px'; R.tw = SF.words(R.tag, T('logo-line'));
    R.sub = el('div', 'abs label', 'LLM writes · you edit · it renders', R.logo); R.sub.style.cssText = 'left:960px;top:700px';
    // 3 prompt
    R.prompt = sec('prompt', 'A'); R.term = el('div', 'term', '<div class="bar"><i></i><i></i><i></i><span class="mono">agent · seekframe</span></div>', R.prompt);
    R.pre = el('pre', 'mono', '', R.term); R.ok = el('div', 'ok mono', [1, 2, 3].map(i => `<div><b>✓</b><span>${esc(T('chk-' + i))}</span></div>`).join(''), R.term);
    // 4 editor
    R.editor = sec('editor', 'B'); R.ed = el('div', 'ed', '<div class="top"><i></i><i></i><i></i><span style="margin-inline-start:18px">seekframe editor</span></div>', R.editor);
    R.stage = el('div', 'stage', '<div class="t"></div>', R.ed); R.stageT = R.stage.firstChild;
    R.panel = el('div', 'panel', `<div class="tabs"><span class="on">Scenes</span><span>Style</span><span>Variants</span><span>Brand</span><span>Audio</span><span>Export</span></div><div class="field"><label>${esc(T('ed-label'))}</label><div class="mod"></div></div><div class="field"><label>Length</label><div>3.00 s</div></div>`, R.ed);
    R.fieldBox = R.panel.querySelector('.field div'); R.tl = el('div', 'tl', '<div class="cues"></div>', R.ed);
    const segs = [['Hook', 90], ['Logo', 60], ['Prompt', 110], ['Editor', 100], ['Variants', 80], ['Sound', 60], ['End', 80]], total = segs.reduce((a, s) => a + s[1], 0), W = 1508; let x = 0; R.segs = [];
    segs.forEach(([n, w]) => { const wpx = Math.round(w / total * W); const s = el('div', 'seg', esc(n), R.tl); s.style.left = x + 'px'; s.style.width = (wpx - 6) + 'px'; x += wpx; R.segs.push(s); });
    R.head = el('div', 'head', '', R.tl); for (let i = 0; i < 24; i++) { const c = el('i', '', '', R.tl.querySelector('.cues')); c.style.left = Math.round(hash(i * 3.1) * W) + 'px'; }
    // 5 variants
    R.variants = sec('variants', 'B'); el('div', 'abs label', 'one film · every look', R.variants).style.cssText = 'left:150px;top:150px';
    R.vg = el('div', 'vg', '', R.variants); const mk = ['<mark>Doubt</mark>', 'Counter', '<mark>Cash</mark>', '<mark>عربي</mark>', 'Tiles', 'Bubbles'];
    R.tiles = [1, 2, 3, 4, 5, 6].map(i => el('div', 'tile t' + i, `<div class="nm">${esc(T('v-' + i))}</div><div class="sm">${mk[i - 1]}</div>`, R.vg));
    // 6 sound
    R.sound = sec('sound', 'A'); R.wb = el('div', 'wavebars', '', R.sound); R.bars = Array.from({ length: 64 }, () => el('i', '', '', R.wb));
    R.cr = el('div', 'cuerow', '', R.sound); R.cues = Array.from({ length: 14 }, (_, i) => { const c = el('i', '', '', R.cr); c.style.left = Math.round(i / 13 * 1600) + 'px'; return c; });
    R.cap = el('div', 'abs big', esc(T('sound-line')), R.sound); R.cap.style.cssText = 'left:150px;top:790px;width:1620px;font-size:58px';
    // 7 end
    R.end = sec('end', 'B'); R.t2 = el('div', 'logotile', '<img alt="Seekframe logo">', R.end); R.t2.style.cssText = 'left:660px;top:90px;width:600px;height:600px'; R.t2.firstChild.src = T('logo');
    R.etag = el('div', 'abs big', '', R.end); R.etag.style.cssText = 'left:0;right:0;top:730px;text-align:center;font-size:84px'; R.ew = SF.words(R.etag, T('end-tag'));
    R.url = el('div', 'abs mono', esc(T('end-url')), R.end); R.url.style.cssText = 'left:0;right:0;top:860px;text-align:center;font-size:42px';
    R.note = el('div', 'abs label', esc(T('end-note')), R.end); R.note.style.cssText = 'left:0;right:0;top:940px;text-align:center';
    for (const s of SCENES) R[s.id].style.display = 'none';
  },

  seek(f) {
    const sc = SCENES.find(s => f >= s.start && f < s.end) || SCENES[SCENES.length - 1], lf = f - sc.start, len = sc.end - sc.start;
    for (const s of SCENES) R[s.id].style.display = s === sc ? 'block' : 'none';
    const fade = Math.min(rng(lf, 0, 6), 1 - rng(lf, len - 6, len));
    R[sc.id].style.opacity = String(fade);
    if (sc.id === 'hook') {
      SF.pop(R.hw1, lf, 4, 5, 10, 34); SF.pop(R.hw2, lf, 30, 6, 10, 34);
      R.hw2.forEach(w => { if (w.classList.contains('hl')) SF.wipe(w, E.expo(rng(lf, 50, 66))); });
      R.eye.style.opacity = String(rng(lf, 70, 90) * .8);
    } else if (sc.id === 'logo') {
      const t = E.expo(rng(lf, 0, 22)); R.tile.style.transform = `scale(${lerp(1.18, 1, t)}) rotate(${lerp(-3, 0, t)}deg)`; R.tile.style.clipPath = `inset(0 ${(1 - E.out(rng(lf, 0, 18))) * 100}% 0 0 round 30px)`;
      SF.pop(R.tw, lf, 22, 5, 10, 30); R.sub.style.opacity = String(rng(lf, 52, 70) * .8);
    } else if (sc.id === 'prompt') {
      const text = T('prompt'), shown = SF.typed(text, lf, 12, 100);
      R.pre.innerHTML = `${esc(shown)}<span class="caret" style="opacity:${lf < 112 && Math.floor(lf / 8) % 2 === 0 || lf < 100 ? 1 : 0}"></span>`;
      const kids = [...R.ok.children]; kids.forEach((c, i) => { const t = E.expo(rng(lf, 104 + i * 12, 116 + i * 12)); c.style.opacity = String(t); c.style.transform = `translateY(${(1 - t) * 24}px)`; });
      R.term.style.transform = `translateY(${lerp(60, 0, E.expo(rng(lf, 0, 20)))}px) scale(${lerp(.96, 1, E.expo(rng(lf, 0, 20)))})`;
    } else if (sc.id === 'editor') {
      const t = E.expo(rng(lf, 0, 22)); R.ed.style.transform = `translateY(${lerp(80, 0, t)}px) scale(${lerp(.95, 1, t)})`;
      const typed = SF.typed(T('ed-field'), lf, 40, 84), shown = lf < 40 ? 'Your headline here' : typed || '';
      R.fieldBox.textContent = shown; R.fieldBox.style.opacity = lf < 40 ? '.45' : '1';
      R.stageT.innerHTML = `${esc(lf < 40 ? 'Your headline here' : shown)}`;
      const play = rng(lf, 92, 150), W = 1508; R.head.style.left = lerp(40, W - 40, play) + 'px';
      R.segs.forEach((s, i) => s.classList.toggle('cur', play > 0 && play < 1 && i === Math.min(R.segs.length - 1, Math.floor(play * R.segs.length))));
      R.stage.style.boxShadow = lf > 92 ? `0 0 0 6px ${getComputedStyle(document.documentElement).getPropertyValue('--brand-accent') || '#b2be6d'}` : 'none';
    } else if (sc.id === 'variants') {
      R.tiles.forEach((tl, i) => { const t = E.expo(rng(lf, 4 + i * 11, 18 + i * 11)), b = E.back(rng(lf, 4 + i * 11, 20 + i * 11)); tl.style.opacity = String(clamp(t * 2)); tl.style.transform = `translateY(${(1 - t) * 50}px) scale(${lerp(.85, 1, b)})`; });
    } else if (sc.id === 'sound') {
      R.bars.forEach((b, i) => { const beat = Math.max(0, 1 - ((lf % 24) / 24)), amp = .25 + .55 * hash(i * 1.7 + Math.floor(lf / 3) * .3) * (.5 + .5 * beat) + .2 * Math.sin(i * .35 + lf * .12); b.style.height = (clamp(amp, 0.05, 1) * 330) + 'px'; b.style.opacity = String(.35 + .65 * beat); });
      R.cues.forEach((c, i) => { c.style.opacity = String(rng(lf, 4 + i * 3, 10 + i * 3)); c.style.transform = `scaleY(${E.back(rng(lf, 4 + i * 3, 14 + i * 3))})`; });
      SF.pop([R.cap], lf, 26, 4, 14, 30);
    } else {
      const t = E.expo(rng(lf, 0, 24)); R.t2.style.transform = `scale(${lerp(.9, 1, t)})`; R.t2.style.opacity = String(t);
      SF.pop(R.ew, lf, 24, 6, 12, 28); R.url.style.opacity = String(rng(lf, 52, 70)); R.note.style.opacity = String(rng(lf, 66, 84) * .8);
    }
  },
});

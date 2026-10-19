// @ts-check
/// <reference path="../../dist/types/browser/film-globals.d.ts" />
/* Seekframe launch film. 1920x1080, 30 fps, 32 s, made with Seekframe itself.
   Variants: hook (3 stories) x look (4 colourways) x sound style (deep / bright / minimal). Every text and colour is a param.
   Sound design is effects only (no music): whooshes, hits, clicks, typing and the logo reveal, each cued on the frame it belongs to. */
'use strict';
const { E, rng, lerp, clamp, hash, esc } = SF;
// el(tag, class, html, parent); SF.el takes (tag, cls, parent, html)
const el = (tag, cls, html, parent) => SF.el(tag, cls, parent, html == null || html === '' ? undefined : html);

const SCENES = [
  { id: 'hook', name: 'Hook', start: 0, end: 120 },
  { id: 'agents', name: 'Your agent', start: 120, end: 240 },
  { id: 'prompt', name: 'Prompt', start: 240, end: 360 },
  { id: 'generate', name: 'Generate + check', start: 360, end: 480 },
  { id: 'editor', name: 'Editor', start: 480, end: 600 },
  { id: 'variants', name: 'Variants', start: 600, end: 720 },
  { id: 'sound', name: 'Sound', start: 720, end: 795 },
  { id: 'logo', name: 'Logo reveal', start: 795, end: 960 },
];
const S0 = Object.fromEntries(SCENES.map(s => [s.id, s.start]));
const BEAT = 15;

/* ---------- looks ---------- */
const LOOKS = {
  night: { label: 'Night · lime glow', bg: '#0c0c0b', fg: '#f5f2e9', acc: '#c9f23d', glow: '#7fa313', glow2: '#22300a', theme: 'deep',
    blobs: [{ c: 'glow', x: .5, y: 1.12, r: 820, amp: 70, o: .95 }, { c: 'glow2', x: .12, y: .9, r: 640, amp: 140, o: .9 }, { c: 'glow2', x: .9, y: .85, r: 560, amp: 140, o: .8 }] },
  cream: { label: 'Cream · editorial', bg: '#f4ecda', fg: '#141411', acc: '#b4cf3a', glow: '#e7d9a9', glow2: '#ffffff', theme: 'deep',
    blobs: [{ c: 'glow', x: .86, y: .08, r: 720, amp: 120, o: .9 }, { c: 'glow2', x: .18, y: .9, r: 720, amp: 140, o: .9 }, { c: '#d7e59a', x: .55, y: 1.15, r: 520, amp: 120, o: .55 }] },
  electric: { label: 'Electric · blue gradient', bg: '#1733e6', fg: '#ffffff', acc: '#dcff4f', glow: '#6e8cff', glow2: '#0a17a6', theme: 'bright',
    blobs: [{ c: 'glow', x: .22, y: .28, r: 820, amp: 220, o: 1 }, { c: '#a9bfff', x: .82, y: .72, r: 700, amp: 240, o: .85 }, { c: 'glow2', x: .62, y: .05, r: 640, amp: 200, o: 1 }] },
  sunset: { label: 'Sunset · warm gradient', bg: '#1a0c12', fg: '#fff3ea', acc: '#ffb547', glow: '#ff4f6d', glow2: '#6f2bd0', theme: 'bright',
    blobs: [{ c: 'glow', x: .18, y: .82, r: 800, amp: 190, o: .9 }, { c: 'glow2', x: .86, y: .22, r: 700, amp: 210, o: .85 }, { c: '#ffb547', x: .55, y: 1.15, r: 560, amp: 120, o: .6 }] },
};
const LOOK_IDS = Object.keys(LOOKS);
const HOOKS = [
  { value: 'whatif', label: 'What if: kinetic type' },
  { value: 'clock', label: 'Clock: every frame is code' },
  { value: 'scale', label: 'Scale: one prompt, hundreds of films' },
];
const lumOf = hex => { const n = parseInt(String(hex).slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const inkOn = hex => lumOf(hex) > .38 ? '#0c0c0b' : '#ffffff';

/* ---------- params ---------- */
const DEF = {
  hook: 'whatif', look: 'night', sound: 'auto', size: 100, logo: '', shot: '',
  'a-img-1': '', 'a-img-2': '', 'a-img-3': '', 'a-img-4': '', 'a-img-5': '', 'a-img-6': '',
  'w-1': 'What if your AI', 'w-2': 'could make [films]?',
  'c-1': 'Every frame', 'c-2': 'is a line of [code].', 'c-unit': 'frame',
  's-1': 'One prompt.', 's-p': 'make a launch film for my brand', 's-2': '[Hundreds] of films.',
  'a-label': 'Works with your agent', 'a-1': 'Write it with', 'a-list': 'Claude Code, Codex, Cursor, opencode, Gemini CLI, Copilot', 'a-2': 'or any agent with MCP.',
  'a-sub': 'AGENTS.md · CLAUDE.md · Cursor rules · MCP server · prompt library',
  'p-tool': 'Seekframe MCP', 'p-text': 'Make a 30-second launch film for Seekframe. Three hooks, four looks, and sound that hits on every cut.', 'p-file': 'brand/ · logo, colours, fonts',
  'g-1': 'It writes the film.', 'g-2': 'Then it [checks] its own work.', 'g-steps': 'validate, review, sync, render',
  'e-1': 'You take the last 10%.', 'e-2': '[Edit] it like a doc.', 'e-field': 'Spring sale',
  'v-1': 'One film.', 'v-2': '[Every] variant.', 'v-chips': 'English, عربي RTL, 16:9, 9:16, 1:1, 4 looks, 3 hooks, MP4 at 60 fps',
  'snd-1': 'Sound that lands', 'snd-2': 'on the [frame].',
  'end-word': 'seekframe', 'end-tag': 'Brand films as code', 'end-url': 'npm create seekframe@latest', 'end-note': 'Open source · MIT',
};
const V = id => SF.value(id, DEF[id]);
const lookOf = v => LOOKS[v.look] || LOOKS[DEF.look];
const HOOK_LINE = { whatif: 'w-1', clock: 'c-1', scale: 's-1' };

function params(v) {
  const L = lookOf(v), hook = v.hook || DEF.hook;
  const T = (id, label, scene, extra = {}) => ({ id, type: 'text', label, scene, default: DEF[id], ...extra });
  const out = [
    { id: 'hook', type: 'select', label: 'Hook (story)', default: DEF.hook, options: HOOKS },
    { id: 'look', type: 'select', label: 'Look', default: DEF.look, options: LOOK_IDS.map(id => ({ value: id, label: LOOKS[id].label })) },
    { id: 'sound', type: 'select', label: 'Style', group: 'sound', default: DEF.sound, options: Object.entries(THEMES).map(([value, label]) => ({ value, label })) },
    { id: 'c-bg', type: 'color', label: 'Background', default: L.bg },
    { id: 'c-fg', type: 'color', label: 'Text', default: L.fg },
    { id: 'c-acc', type: 'color', label: 'Accent', default: L.acc },
    { id: 'c-glow', type: 'color', label: 'Glow', default: L.glow },
    { id: 'size', type: 'number', label: 'Headline size', default: DEF.size, min: 70, max: 120, step: 2, cssVar: '--title-size' },
  ];
  if (hook === 'whatif') out.push(T('w-1', 'Line 1', 'hook'), T('w-2', 'Line 2 ([word] = highlighted)', 'hook'));
  if (hook === 'clock') out.push(T('c-1', 'Line 1', 'hook'), T('c-2', 'Line 2 ([word] = highlighted)', 'hook'), T('c-unit', 'Counter label', 'hook'));
  if (hook === 'scale') out.push(T('s-1', 'Line 1', 'hook'), T('s-p', 'Prompt in the pill', 'hook'), T('s-2', 'Line 2 ([word] = highlighted)', 'hook'));
  out.push(
    T('a-label', 'Label', 'agents'), T('a-1', 'Before the logos', 'agents'), T('a-list', 'Agents (comma separated)', 'agents'), T('a-2', 'After the logos', 'agents'), T('a-sub', 'Second line', 'agents'),
    ...[1, 2, 3, 4, 5, 6].map(i => ({ id: 'a-img-' + i, type: 'image', label: `Logo for agent ${i} (empty = simple glyph)`, scene: 'agents', default: '', help: 'Upload the real logo (SVG or PNG with a transparent background) to use it instead of the glyph.' })),
    T('p-tool', 'Tool name', 'prompt'), T('p-text', 'Prompt', 'prompt', { multiline: true }), T('p-file', 'Attachment', 'prompt'),
    T('g-1', 'Line 1', 'generate'), T('g-2', 'Line 2', 'generate'), T('g-steps', 'Steps (comma separated)', 'generate'),
    T('e-1', 'Line 1', 'editor'), T('e-2', 'Line 2', 'editor'), T('e-field', 'Text typed in the editor', 'editor'),
    { id: 'shot', type: 'image', label: 'Your own image in the preview (empty = looks)', scene: 'editor', default: '', help: 'A product shot or photo shown in the editor preview; the headline is typed over it.' },
    T('v-1', 'Line 1', 'variants'), T('v-2', 'Line 2', 'variants'), T('v-chips', 'Chips (comma separated)', 'variants'),
    T('snd-1', 'Line 1', 'sound'), T('snd-2', 'Line 2', 'sound'),
    T('end-word', 'Wordmark', 'logo'), T('end-tag', 'Tagline', 'logo'), T('end-url', 'URL', 'logo'), T('end-note', 'Note', 'logo'),
    { id: 'logo', type: 'image', label: 'Logo (empty = animated Seekframe mark)', scene: 'logo', default: '' },
  );
  return out;
}

/* ---------- sound design: sound effects only (no music), each one on the frame it belongs to ---------- */
const PROMPT_START = 40, PROMPT_END = 92;
const THEMES = { auto: 'Matches the look', deep: 'Deep: sub hits, soft clicks', bright: 'Bright: crisp, punchy', minimal: 'Minimal: clicks and soft hits only' };
// keystrokes for text typed between frames a and b: about 11 keys a second, a little uneven, spaces sound like a space bar
function typing(c, at, text, a, b, o = {}) {
  const chars = [...String(text)];
  for (let f = a, k = 0; f < b; f += 2.2 + hash(at + f * 1.7) * 1.4, k++) {
    const ch = chars[Math.min(chars.length - 1, Math.floor((f - a) / (b - a) * chars.length))];
    c.key(at + f, { seed: at * 31 + k, space: ch === ' ', gain: (o.gain ?? .09) * (ch === ' ' ? 1.15 : 1), pan: (o.pan ?? 0) + (hash(k * 2.3) - .5) * .3 });
  }
}
function cues(v) {
  const c = SF.cues(), hook = v.hook || DEF.hook;

  /* hook */
  const H = S0.hook;
  c.roomtone(H, H + 120, { gain: .0015 });
  if (hook === 'whatif') {
    [4, 12, 20, 28, 44, 52].forEach((f, i) => { c.swipe(H + f - 2, { dur: .18, gain: .05, p0: -.2, p1: .2 }); c.tick(H + f + 2, { gain: .07, freq: 1800 + i * 90 }); });
    c.boom(H + 60, { gain: .55, decay: 1.4 }); c.stamp(H + 60, { gain: .2 }); c.dtick(H + 62, { gain: .2 });
    c.whoosh(H + 62, { dur: .8, gain: .16, p0: -.1, p1: .1 });
  } else if (hook === 'clock') {
    c.thud(H + 2, { gain: .3 }); c.whoosh(H, { dur: .35, gain: .1, p0: -.6, p1: -.3 });
    for (let f = 8; f < 98; f += 7.5) c.tick(H + f, { gain: .075, freq: Math.round(f / 7.5) % 2 ? 1800 : 2500, pan: -.35 + Math.sin(f / 120 * 4 * Math.PI) * .2 });
    c.swipe(H + 12, { dur: .25, gain: .05, p0: .2, p1: .5 }); c.swipe(H + 32, { dur: .25, gain: .05, p0: .2, p1: .5 });
    c.stamp(H + 50, { gain: .26, pan: .4 }); c.dtick(H + 52, { gain: .18, pan: .4 });
    c.riser(H + 84, H + 118, { gain: .2 }); c.whoosh(H + 98, { dur: .7, gain: .24, p0: -.4, p1: .2 });
  } else {
    c.thud(H + 2, { gain: .2 }); typing(c, H, V('s-p'), 8, 38, { gain: .08 });
    c.swipe(H + 42, { dur: .3, gain: .09, p0: .3, p1: 0 });
    [48, 63, 78, 93].forEach((f, i) => { c.glitch(H + f, { gain: .045 + i * .01, seed: i }); c.stamp(H + f, { gain: .14 + i * .05 }); c.whoosh(H + f - 3, { dur: .3, gain: .05 + i * .02, p0: 0, p1: 0 }); });
    c.dtick(H + 72, { gain: .2 });
  }
  c.reverse(H + 100, H + 120, { gain: .35 });

  /* agents: the wipe lands with a hit, chips tick past as the ticker slides */
  const A = S0.agents;
  c.impact(A, { gain: .8, tail: 2.2 });
  c.slide(A + 4, A + 112, { gain: .05, p0: .7, p1: -.7, cut: 900 });
  for (let i = 0; i < 6; i++) c.dtick(A + 18 + i * 15, { gain: .1, pan: .3 - i * .1 });
  c.swipe(A + 110, { dur: .35, gain: .14, p0: 0, p1: 0 });

  /* prompt: switch, menu, box, real typing, attachment, cursor, click */
  const P = S0.prompt;
  c.roomtone(P, P + 120, { gain: .0015 });
  c.blip(P + 14, { freq: 560, gain: .07 }); c.tick(P + 15, { gain: .12, freq: 2600 });
  [20, 26, 32, 38].forEach((f, i) => c.tick(P + f, { gain: .06, freq: 2100 + i * 150, pan: -.3 + i * .2 }));
  c.whoosh(P + 22, { dur: .5, gain: .12, p0: 0, p1: 0 });
  typing(c, P, V('p-text'), PROMPT_START, PROMPT_END);
  c.thud(P + 62, { gain: .2, pan: -.4 }); c.tick(P + 64, { gain: .08, pan: -.4 });
  c.swipe(P + 84, { dur: .5, gain: .05, p0: .5, p1: .35 });
  c.key(P + 104, { seed: 7, space: true, gain: .16, pan: .35 }); c.blip(P + 105, { freq: 700, gain: .06, pan: .35 });
  c.whoosh(P + 106, { dur: .5, gain: .16, p0: .35, p1: -.2 });

  /* generate: the code types, frames fly in from where they start, the checks stamp */
  const G = S0.generate;
  [0, 8].forEach(f => c.swipe(G + f, { dur: .2, gain: .05 }));
  for (let i = 0; i < 7; i++) typing(c, G, 'SF.define', 6 + i * 6, 11 + i * 6, { gain: .05, pan: -.5 });
  for (let i = 0; i < 9; i++) { const at = 8 + i * 5, p0 = clamp((hash(i * 3) - .5) * 2.4, -1, 1); c.whoosh(G + at, { dur: .4, gain: .06, p0, p1: .3 + (i % 3) * .2 }); c.tick(G + at + 13, { gain: .07, freq: 1900 + i * 70, pan: .3 + (i % 3) * .2 }); }
  [60, 75, 90, 105].forEach((f, i) => { c.stamp(G + f, { gain: .26, pan: -.3 + i * .2 }); c.dtick(G + f + 1, { gain: .1, pan: -.3 + i * .2 }); });

  /* editor */
  const D = S0.editor;
  c.whoosh(D, { dur: .5, gain: .16, p0: 0, p1: 0 }); c.thud(D + 14, { gain: .14 });
  for (let r = 0; r < 5; r++) c.slide(D + 4 + r * 3, D + 24 + r * 3, { gain: .025, p0: -.8, p1: .8, cut: 1200 });
  c.tick(D + 26, { gain: .1, freq: 2600, pan: .4 });
  typing(c, D, V('e-field'), 32, 58, { pan: .4 });
  [70, 84, 98].forEach((f, i) => { c.blip(D + f, { freq: 500 + i * 120, gain: .07, pan: .35 }); c.tick(D + f, { gain: .08, pan: .35 }); });

  /* variants: every tile glitches in, the chips slide past */
  const VV = S0.variants;
  for (let i = 0; i < 9; i++) { c.glitch(VV + 6 + i * 7, { gain: .045, seed: i, pan: ((i % 3) - 1) * .5 }); c.thud(VV + 8 + i * 7, { gain: .1, pan: ((i % 3) - 1) * .5 }); }
  c.slide(VV + 30, VV + 118, { gain: .04, p0: .8, p1: -.8 });

  /* sound: the markers play what they say (boom, tick, whoosh, boom), then everything collapses into a reverse swell */
  const N = S0.sound;
  c.boom(N, { gain: .6, decay: 1.1 }); c.tick(N + 15, { gain: .22, freq: 2400 }); c.whoosh(N + 28, { dur: .6, gain: .26, p0: -.6, p1: .6 }); c.boom(N + 45, { gain: .7, decay: 1.4 });
  c.swipe(N + 56, { dur: .3, gain: .14, p0: .5, p1: 0 });
  c.reverse(N + 61, N + 75, { gain: .45 });

  /* logo: the iris opens with a hit, the dots shimmer in, the wordmark types itself */
  const L = S0.logo;
  c.impact(L, { gain: 1, tail: 4 }); c.whoosh(L, { dur: .9, gain: .18, p0: 0, p1: 0 });
  for (let f = 6; f < 64; f += 1.5) c.tick(L + f, { gain: .016 + .022 * hash(f), freq: 3200 + Math.round(hash(f * 7) * 2600), pan: (hash(f * 3) - .5) * 1.4 });
  c.thud(L + 72, { gain: .1 }); c.whoosh(L + 72, { dur: .9, gain: .1, p0: 0, p1: 0 });
  [...V('end-word')].forEach((_, i) => c.key(L + 92 + i * 3, { seed: 100 + i, gain: .07 }));
  c.boom(L + 116, { gain: .4, decay: 2.2 }); c.dtick(L + 118, { gain: .24 }); c.tick(L + 132, { gain: .08 }); c.tick(L + 142, { gain: .05 });
  return c.list;
}

/* ---------- small drawing helpers ---------- */
// neutral glyphs for the agent chips (not the vendors' marks)
const ICONS = [
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M12 2l8.7 5v10L12 22l-8.7-5V7z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M12 3l9 17H3z" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M8 4C5 4 6 10 3 12c3 2 2 8 5 8M16 4c3 0 2 6 5 8-3 2-2 8-5 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M12 1c1 6 5 10 11 11-6 1-10 5-11 11-1-6-5-10-11-11 6-1 10-5 11-11z" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
];
const ARROW = '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CURSOR = '<svg viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L16 20l-3 1.4-3.4-7.3L4 18z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>';
// the background of a little film frame in a given look
const lookBg = (L, a = 0) => `radial-gradient(120% 90% at ${30 + a * 40}% 110%, ${L.glow} 0%, transparent 60%), radial-gradient(80% 70% at ${90 - a * 30}% 0%, ${L.glow2} 0%, transparent 70%), ${L.bg}`;
const list = s => String(s).split(',').map(x => x.trim()).filter(Boolean);
const pad3 = n => String(Math.max(0, Math.floor(n))).padStart(3, '0');

/* ---------- build ---------- */
/** @type {Record<string, any>} */ let R = {};
SF.define({
  title: 'Seekframe launch', width: 1920, height: 1080, fps: 30, duration: 960, scenes: SCENES, poster: 82,
  params, cues,
  soundtrack: v => ({ theme: !v.sound || v.sound === 'auto' ? lookOf(v).theme : v.sound, loudness: -14 }),
  audio: [{ id: 'sfx', label: 'Sound effects', generated: 'cues', default: true }],
  variants: {
    thumbFrame: 82,
    axes: [{ id: 'hook', label: 'Hook' }, { id: 'look', label: 'Look' }],
    presets: [
      { id: 'whatif-night', label: 'What if · night', params: {} },
      { id: 'clock-electric', label: 'Clock · electric', params: { hook: 'clock', look: 'electric' } },
      { id: 'scale-sunset', label: 'Scale · sunset', params: { hook: 'scale', look: 'sunset' } },
      { id: 'whatif-cream', label: 'What if · cream', params: { look: 'cream' } },
      { id: 'clock-night', label: 'Clock · night', params: { hook: 'clock' } },
      { id: 'scale-electric', label: 'Scale · electric', params: { hook: 'scale', look: 'electric' } },
    ],
  },

  build(v) {
    const L = lookOf(v), hook = v.hook || DEF.hook, col = k => SF.value('c-' + k, L[k]);
    const rs = document.documentElement.style;
    rs.setProperty('--bg', col('bg')); rs.setProperty('--fg', col('fg')); rs.setProperty('--acc', col('acc')); rs.setProperty('--accInk', inkOn(col('acc')));
    rs.setProperty('--glow', col('glow')); rs.setProperty('--glow2', L.glow2);
    const Tpx = 1.45 * V('size');
    const st = document.getElementById('stage'); st.innerHTML = ''; R = { hookId: hook };

    /* background: drifting blobs + grain */
    const bg = el('div', '', '', st); bg.id = 'bg';
    R.blobs = L.blobs.map((b, i) => { const d = el('div', 'blob', '', bg); d.style.width = d.style.height = b.r * 2 + 'px'; d.style.opacity = String(b.o); d.style.background = `radial-gradient(circle, ${b.c === 'glow' ? col('glow') : b.c === 'glow2' ? L.glow2 : b.c} 0%, transparent 68%)`; return { d, b, i }; });
    el('div', '', '<svg width="1920" height="1080"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>', st).id = 'grain';
    const sec = id => { const s = el('section', 'sc', '', st); s.id = 's-' + id; R[id] = s; return s; };

    /* 1 hook */
    const h = sec('hook');
    if (hook === 'whatif') {
      R.l1 = el('div', 'abs big center', '', h); R.l1.style.top = (540 - Tpx * 1.12) + 'px';
      R.l2 = el('div', 'abs big center', '', h); R.l2.style.top = (540 + Tpx * .02) + 'px';
      R.w1 = SF.words(R.l1, V('w-1')); R.w2 = SF.words(R.l2, V('w-2'));
      R.rings = [0, 1, 2].map(() => { const r = el('i', 'abs', '', h); r.style.cssText = 'left:960px;top:600px;width:200px;height:200px;margin:-100px 0 0 -100px;border-radius:50%;border:6px solid var(--acc)'; return r; });
      h.insertBefore(R.rings[0], h.firstChild); h.insertBefore(R.rings[1], h.firstChild); h.insertBefore(R.rings[2], h.firstChild);
    } else if (hook === 'clock') {
      R.clockWrap = el('div', 'abs', '', h); R.clockWrap.style.cssText = 'left:560px;top:540px;width:0;height:0';
      R.clock = el('div', 'clock', '', R.clockWrap); R.clock.style.cssText = 'left:-300px;top:-300px;width:600px;height:600px';
      R.ticks = Array.from({ length: 60 }, (_, i) => { const t = el('i', 'tickm', '', R.clockWrap); if (i % 5) { t.style.height = '14px'; t.style.marginTop = '-7px'; } return t; });
      R.hand = el('i', 'hand', '', R.clock); R.hand.style.height = '190px'; R.hand.style.top = '110px';
      el('i', '', '', R.clock).style.cssText = 'position:absolute;left:280px;top:280px;width:40px;height:40px;border-radius:50%;background:var(--accInk)';
      R.counter = el('div', 'counter', '', R.clock); R.counter.style.top = '462px'; R.counter.style.fontSize = '44px';
      R.c1 = el('div', 'abs big', '', h); R.c1.style.cssText = `left:1000px;top:${540 - Tpx * .8}px;font-size:${Tpx * .72}px`;
      R.c2 = el('div', 'abs big', '', h); R.c2.style.cssText = `left:1000px;top:${540 + Tpx * .02}px;font-size:${Tpx * .72}px`;
      R.cw1 = SF.words(R.c1, V('c-1')); R.cw2 = SF.words(R.c2, V('c-2'));
    } else {
      R.s1 = el('div', 'abs big center', '', h); R.s1.style.top = '200px'; R.sw1 = SF.words(R.s1, V('s-1'));
      R.grid = el('div', 'abs', '', h); R.grid.style.cssText = 'left:0;top:0;width:1920px;height:1080px';
      const cols = 14, rows = 8, w = 118, hh = 66, gx = 16, gy = 18, x0 = (1920 - cols * w - (cols - 1) * gx) / 2, y0 = (1080 - rows * hh - (rows - 1) * gy) / 2;
      const tiles = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = x0 + c * (w + gx), y = y0 + r * (hh + gy), d = Math.hypot(x + w / 2 - 960, (y + hh / 2 - 540) * 1.6);
        const Lk = LOOKS[LOOK_IDS[Math.floor(hash(r * 31 + c * 7) * 4)]], t = el('div', 'mini', '<i></i>', R.grid);
        t.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${hh}px;background:${lookBg(Lk, hash(c + r))}`; t.firstChild.style.background = Lk.acc;
        tiles.push({ t, d });
      }
      tiles.sort((a, b) => a.d - b.d); tiles.forEach((o, i) => { o.at = i < 1 ? 48 : i < 8 ? 63 : i < 32 ? 78 : 93 + (i - 32) * .06; });
      R.tiles = tiles;
      R.pill = el('div', 'ppill', '<span class="dot"></span><span></span>', h); R.pill.style.left = '0'; R.pill.style.top = '0'; R.pillT = R.pill.lastChild;
      R.s2 = el('div', 'abs big', '', h); R.s2.style.cssText = `left:50%;top:${540 - Tpx * .62}px;padding:.12em .3em .16em;border-radius:.28em;background:var(--bg);transform:translateX(-50%)`;
      R.sw2 = SF.words(R.s2, V('s-2'));
    }

    /* 2 agents: one long sentence with agent chips, scrolling like a ticker */
    const a = sec('agents'); a.style.background = 'var(--acc)'; a.style.color = 'var(--accInk)';
    el('div', 'lbl', esc(V('a-label')), a).style.cssText = 'position:absolute;left:120px;top:140px;font-size:34px;color:var(--accInk);opacity:.75';
    R.tr1 = el('div', 'track big', '', a); R.tr1.dataset.sfTicker = ''; R.tr1.style.top = (430 - Tpx * .4) + 'px'; R.tr1.style.fontSize = (Tpx * .86) + 'px';
    R.tr1.innerHTML = `<span>${esc(V('a-1'))}</span> ${list(V('a-list')).map((n, i) => { const img = V('a-img-' + (i + 1)); return `<span class="chip">${img ? `<img class="alogo" alt="" src="${esc(img)}">` : ICONS[i % ICONS.length]}${esc(n)}</span>`; }).join(' ')} <span>${esc(V('a-2'))}</span>`;
    R.tr2 = el('div', 'track sub', '', a); R.tr2.dataset.sfTicker = ''; R.tr2.style.top = '700px'; R.tr2.style.fontSize = '58px'; R.tr2.textContent = (V('a-sub') + '   ·   ').repeat(4);

    /* 3 prompt: MCP toggle, the prompt box, an attachment, the send click */
    const p = sec('prompt');
    R.mcp = el('div', 'mcp', `<span class="toggle"><i></i></span><span>${esc(V('p-tool'))}</span>`, p); R.tog = R.mcp.querySelector('.toggle'); R.knob = R.tog.firstChild;
    R.menu = el('div', 'menu', ['create_film', 'validate', 'review', 'render'].map(x => `<span>${x}</span>`).join(''), p);
    R.box = el('div', 'box', '<div class="txt"></div>', p); R.boxT = R.box.firstChild;
    R.att = el('div', 'attach', `<b>+</b><span>${esc(V('p-file'))}</span>`, R.box);
    R.send = el('div', 'send', ARROW, R.box);
    R.ring = el('div', 'ring', '', R.box);
    R.cur = el('div', 'cursor', CURSOR, p);

    /* 4 generate: code streams in, frames fly into a grid, checks light up */
    const g = sec('generate');
    R.g1 = el('div', 'abs big', '', g); R.g1.style.cssText = `left:110px;top:96px;font-size:${Tpx * .5}px`; R.gw1 = SF.words(R.g1, V('g-1'));
    R.g2 = el('div', 'abs big', '', g); R.g2.style.cssText = `left:110px;top:${96 + Tpx * .6}px;font-size:${Tpx * .5}px`; R.gw2 = SF.words(R.g2, V('g-2'));
    const CODE = ['<span class="k">SF.define</span>({', "  title: <span class=\"c\">'Launch'</span>, fps: 30,", '  scenes: [hook, agents, …],', "  params: [text(<span class=\"c\">'title'</span>)],", '  cues: c => c.<span class="k">boom</span>(120),', '  seek(f) { draw(f) }', '})   <span class="c">// pure: frame in, picture out</span>'];
    R.code = el('div', 'code', '', g); R.lines = CODE.map(t => el('div', '', t, R.code));
    const NAMES = ['What if', 'Spring sale', 'عربي', '50% off', 'New drop', 'Launch', 'Join us', 'Free trial', 'Now live'];
    R.cards = NAMES.map((n, i) => {
      const Lk = LOOKS[LOOK_IDS[i % 4]], cd = el('div', 'card', `<i class="b"></i><div class="t">${esc(n)}</div>`, g);
      cd.style.cssText = `left:0;top:0;width:280px;height:158px;background:${lookBg(Lk, (i % 3) / 2)};color:${Lk.fg}`;
      cd.firstChild.style.width = (60 + hash(i) * 90) + 'px'; cd.firstChild.style.background = Lk.acc;
      if (n === 'عربي') { cd.lastChild.style.left = 'auto'; cd.lastChild.style.right = '18px'; cd.lastChild.dir = 'rtl'; }
      const c = i % 3, r = Math.floor(i / 3);
      return { cd, x: 930 + c * 300, y: 300 + r * 182, sx: 960 + (hash(i * 3) - .5) * 2400, sy: 540 + (hash(i * 5) - .5) * 1600, rot: (hash(i * 9) - .5) * 70, at: 8 + i * 5 };
    });
    R.steps = el('div', 'steps', '', g);
    R.stepEls = list(V('g-steps')).map((s, i, arr) => { const e = el('div', 'step', `<span class="ok">✓</span><span>${esc(s)}</span>`, R.steps); if (i < arr.length - 1) el('span', 'arrow', '→', R.steps); return e; });

    /* 5 editor: preview, fields, swatches, tracks, playhead */
    const d = sec('editor');
    R.e1 = el('div', 'abs big', '', d); R.e1.style.cssText = `left:120px;top:44px;font-size:${Tpx * .5}px`; R.ew1 = SF.words(R.e1, V('e-1') + ' ' + V('e-2'));
    R.ed = el('div', 'ed', '', d);
    R.prev = el('div', 'prev', '<div class="s">preview · 16:9</div><div class="h"></div>', R.ed); R.prevH = R.prev.lastChild;
    R.panel = el('div', 'panel', `<div class="field"><label>Headline</label><div class="in"></div></div><div class="field"><label>Look</label><div class="sw">${LOOK_IDS.map(id => `<i style="background:${LOOKS[id].acc}"></i>`).join('')}</div></div><div class="field"><label>Length</label><div class="in">3.00 s</div></div>`, R.ed);
    R.fieldIn = R.panel.querySelector('.in'); R.sws = [...R.panel.querySelectorAll('.sw i')];
    R.before = V(HOOK_LINE[hook]).replace(/[[\]]/g, ''); R.shot = String(V('shot') || '');
    if (R.shot) { R.prev.style.backgroundImage = `linear-gradient(180deg, transparent 40%, rgba(0,0,0,.65)), url("${R.shot}")`; R.prev.style.backgroundSize = 'cover'; R.prev.style.backgroundPosition = 'center'; R.prev.style.color = '#fff'; }
    R.tracks = el('div', 'tracks', '', R.ed);
    const TC = ['var(--acc)', 'var(--glow)', '#ff7a59', '#6e8cff', 'color-mix(in srgb, var(--fg) 55%, transparent)'];
    R.bars = [];
    for (let row = 0; row < 5; row++) { let x = 0; for (let k = 0; x < 1560; k++) { const w = 120 + hash(row * 17 + k * 3) * 300, b = el('i', 'bar', '', R.tracks); b.style.left = x + 'px'; b.style.top = (row * 44) + 'px'; b.style.background = TC[row]; R.bars.push({ b, w: Math.min(w, 1600 - x), row, k }); x += w + 10; } }
    R.head = el('i', 'head', '', R.tracks);

    /* 6 variants: a 3x3 wall of looks, hooks, languages and sizes */
    const vv = sec('variants');
    R.v = el('div', 'abs big center', '', vv); R.v.style.top = '56px'; R.v.style.fontSize = (Tpx * .6) + 'px'; R.vw = SF.words(R.v, V('v-1') + ' ' + V('v-2'));
    R.wall = el('div', 'abs', '', vv); R.wall.style.cssText = 'left:0;top:0;width:1920px;height:1080px;transform-origin:960px 560px';
    const VT = [['night', 'What if your AI', '16:9'], ['electric', 'Frame = code', '16:9'], ['sunset', 'One prompt.', '9:16'], ['cream', 'Spring sale', '1:1'], ['night', 'عربي · RTL', '16:9'], ['electric', 'Now live', '9:16'], ['sunset', 'Hundreds of films', '16:9'], ['cream', 'What if your AI', '16:9'], ['night', 'Launch day', '1:1']];
    R.vts = VT.map(([lk, t, size], i) => {
      const Lk = LOOKS[lk], e = el('div', 'vt', `<div class="tag">${esc(Lk.label.split(' ·')[0])} · ${size}</div><div class="t">${esc(t)}</div>${size === '9:16' ? '<div class="phone"></div>' : ''}`, R.wall);
      const c = i % 3, r = Math.floor(i / 3);
      e.style.cssText = `left:${276 + c * 464}px;top:${196 + r * 266}px;width:440px;height:248px;background:${lookBg(Lk, (i % 3) / 2)};color:${Lk.fg}`;
      if (/[؀-ۿ]/.test(t)) { const tt = e.querySelector('.t'); tt.dir = 'rtl'; tt.style.left = 'auto'; tt.style.right = '30px'; }
      return e;
    });
    R.chips = el('div', 'chips', list(V('v-chips')).map(s => `<span>${esc(s)}</span>`).join('').repeat(2), vv); R.chips.dataset.sfTicker = '';

    /* 7 sound: a waveform that hits on the beat, cue markers dropping onto it */
    const n = sec('sound');
    R.n1 = el('div', 'abs big center', '', n); R.n1.style.top = '70px'; R.n1.style.fontSize = (Tpx * .6) + 'px'; R.nw = SF.words(R.n1, V('snd-1') + ' ' + V('snd-2'));
    R.wave = el('div', 'wave', '', n); R.wbars = Array.from({ length: 72 }, () => el('i', '', '', R.wave));
    R.cueEls = ['boom', 'tick', 'whoosh', 'boom'].map((t, i) => { const c = el('div', 'cue', `<span>${t}</span>`, n); c.style.left = (330 + i * 420) + 'px'; return c; });

    /* 8 logo: the halftone eye builds itself dot by dot, then the wordmark */
    const lo = sec('logo');
    el('div', 'paper', '', lo);
    const custom = String(V('logo') || '');
    if (custom) { R.ulogo = el('img', 'ulogo', '', lo); R.ulogo.src = custom; R.ulogo.alt = 'Logo'; }
    else { R.cv = el('canvas', '', '', lo); R.cv.id = 'dots'; R.cv.width = 1920; R.cv.height = 1080; R.ctx = R.cv.getContext('2d'); }
    R.word = el('div', 'word', '', lo); R.word.style.top = '590px';
    R.letters = [...V('end-word')].map(ch => el('span', 'w', ch, R.word));
    R.tag = el('div', 'tagl', esc(V('end-tag')), lo); R.tag.style.top = '800px';
    R.url = el('div', 'url', esc(V('end-url')), lo); R.url.style.top = '876px';
    R.note = el('div', 'url', esc(V('end-note')), lo); R.note.style.top = '930px'; R.note.style.fontSize = '24px';
    // dot field from logo-dots.js: radius per cell for the ink and lime layers
    const D = /** @type {any} */ (window).SEEKFRAME_DOTS;
    if (D && R.ctx) {
      const pcx = 45.7, pcy = 25.7, maxD = Math.hypot(D.cols, D.rows) * .62; R.dots = [];
      for (let r = 0; r < D.rows; r++) for (let c = 0; c < D.cols; c++) {
        const k = r * D.cols + c, ri = +D.ink[k], rl = +D.lime[k]; if (!ri && !rl) continue;
        R.dots.push({ c, r, ri, rl, d: clamp(Math.hypot(c - pcx, (r - pcy) * 1.1) / maxD) });
      }
      R.D = D;
    }
    for (const s of SCENES) R[s.id].style.display = 'none';
  },

  seek(f) {
    const sc = SCENES.find(s => f >= s.start && f < s.end) || SCENES[SCENES.length - 1], lf = f - sc.start, len = sc.end - sc.start;
    for (const s of SCENES) R[s.id].style.display = s === sc ? 'block' : 'none';
    for (const { d, b, i } of R.blobs) { const x = b.x * 1920 + SF.wob(i * 3 + 1, f * 2.2, b.amp), y = b.y * 1080 + SF.wob(i * 5 + 2, f * 1.9, b.amp * .7); d.style.transform = `translate(${x - b.r}px,${y - b.r}px) scale(${1 + .06 * Math.sin(f * .03 + i)})`; }
    SEEK[sc.id](lf, len);
  },
});

/* ---------- per-scene drawing ---------- */
const op = (e, v) => { e.style.opacity = String(clamp(v)); };
const tf = (e, s) => { e.style.transform = s; };
const plain = ws => ws.filter(w => !w.classList.contains('hl'));
// zoom-through exit: scale up + blur + fade over the last n frames
const exitZoom = (e, lf, len, n = 14, s = .22) => { const t = E.in2(rng(lf, len - n, len)); tf(e, `scale(${1 + t * s})`); e.style.filter = t > 0 ? `blur(${t * 14}px)` : ''; op(e, 1 - t); };
// [highlighted] words become an accent pill that springs in
const popHl = (ws, lf, at) => ws.forEach(w => {
  if (!w.classList.contains('hl')) return;
  const t = E.back(rng(lf, at, at + 12)), i = w.firstChild;
  w.style.background = 'var(--acc)'; w.style.borderRadius = '.2em'; w.style.padding = '0 .14em .04em'; i.style.color = 'var(--accInk)';
  w.style.transform = `scale(${lerp(.6, 1, t)}) rotate(${lerp(-4, 0, t)}deg)`; w.style.opacity = String(clamp(rng(lf, at, at + 5)));
});

const SEEK = {
  hook(lf, len) {
    const h = R.hook;
    if (R.w1) {
      SF.pop(R.w1, lf, 4, 8, 12, 50); SF.pop(plain(R.w2), lf, 44, 8, 12, 50); popHl(R.w2, lf, 60);
      R.rings.forEach((r, i) => { const t = rng(lf, 60 + i * 5, 90 + i * 5); tf(r, `scale(${1 + E.out(t) * (9 + i * 3)})`); op(r, t > 0 ? (1 - t) * .9 : 0); r.style.borderWidth = (8 - t * 6) + 'px'; });
      const push = 1 + .08 * E.io(rng(lf, 0, 98)); tf(R.l1, `scale(${push})`); tf(R.l2, `scale(${push})`);
      exitZoom(h, lf, len, 22, .3);
    } else if (R.clock) {
      const t0 = E.back(rng(lf, 0, 16)), grow = E.in(rng(lf, 98, 120));
      tf(R.clock, `scale(${t0 * (1 + grow * 6)})`);
      R.ticks.forEach((t, i) => { const on = rng(lf, 6 + i * .55, 10 + i * .55); t.style.transform = `rotate(${i * 6}deg) translateY(-340px) scaleY(${on})`; op(t, on * (1 - grow * 3)); });
      tf(R.hand, `rotate(${(lf / 120) * 720}deg)`);
      R.counter.textContent = `${V('c-unit')} ${pad3(lf)}`;
      SF.pop(R.cw1, lf, 14, 6, 12, 40); SF.pop(plain(R.cw2), lf, 34, 6, 12, 40); popHl(R.cw2, lf, 50);
      op(R.c1, 1 - grow * 3); op(R.c2, 1 - grow * 3);
    } else {
      SF.pop(R.sw1, lf, 2, 6, 12, 40);
      const pin = E.back(rng(lf, 0, 14)), shrink = E.io(rng(lf, 42, 50));
      R.pillT.textContent = SF.typed(V('s-p'), lf, 8, 38) + (lf < 44 && Math.floor(lf / 6) % 2 === 0 ? '|' : '');
      const pw = R.pill.offsetWidth || 700;
      tf(R.pill, `translate(${960 - pw / 2}px, ${470 - 52}px) scale(${Math.max(.001, pin * (1 - shrink * .9))})`); op(R.pill, 1 - shrink);
      op(R.s1, 1 - rng(lf, 44, 52));
      R.tiles.forEach(o => { const t = rng(lf, o.at, o.at + 8); tf(o.t, `scale(${E.back(t)})`); op(o.t, t * (1 - rng(lf, 66, 72) * .55)); });
      SF.pop(plain(R.sw2), lf, 74, 6, 12, 40); popHl(R.sw2, lf, 70);
      op(R.s2, rng(lf, 68, 74));
      exitZoom(h, lf, len, 16, 1.4);
    }
  },
  agents(lf, len) {
    const a = R.agents, open = E.expo(rng(lf, 0, 12)), out = E.in2(rng(lf, len - 10, len));
    a.style.clipPath = out > 0 ? `inset(0 0 ${out * 100}% 0)` : `circle(${open * 1250}px at ${R.hookId === 'clock' ? 560 : 960}px 540px)`;
    const W1 = R.tr1.scrollWidth, W2 = R.tr2.scrollWidth;
    tf(R.tr1, `translateX(${W1 > 1540 ? lerp(220, 1700 - W1, rng(lf, 4, 112)) : 220}px)`);
    tf(R.tr2, `translateX(${lerp(-W2 / 4, 0, rng(lf, 0, len))}px)`);
  },
  prompt(lf, len) {
    const on = E.out(rng(lf, 12, 18));
    tf(R.knob, `translateX(${on * 42}px)`); R.tog.style.background = on > .5 ? 'var(--acc)' : 'var(--line)';
    op(R.mcp, rng(lf, 0, 8)); tf(R.mcp, `translateY(${(1 - E.expo(rng(lf, 0, 12))) * 30}px)`);
    [...R.menu.children].forEach((m, i) => { const t = E.back(rng(lf, 20 + i * 6, 30 + i * 6)); op(m, t); tf(m, `translateY(${(1 - t) * 16}px) scale(${lerp(.8, 1, t)})`); });
    const bin = E.expo(rng(lf, 22, 40)), bout = E.in2(rng(lf, 110, 120));
    op(R.box, bin * (1 - bout)); tf(R.box, `translateY(${(1 - bin) * 80 - bout * 40}px) scale(${lerp(.96, 1, bin) - bout * .04})`);
    const typed = SF.typed(V('p-text'), lf, PROMPT_START, PROMPT_END);
    R.boxT.innerHTML = esc(typed) + (lf < 104 && (lf < PROMPT_END || Math.floor(lf / 6) % 2 === 0) ? '<span class="caret"></span>' : '');
    const at = E.back(rng(lf, 60, 72)); op(R.att, rng(lf, 60, 64)); tf(R.att, `translateY(${(1 - at) * 30}px) scale(${lerp(.6, 1, at)})`);
    const lit = lf >= 92; R.send.style.background = lit ? 'var(--acc)' : 'var(--fg)'; R.send.style.color = lit ? 'var(--accInk)' : 'var(--bg)';
    tf(R.send, `scale(${lf >= 104 && lf < 110 ? .88 : 1})`);
    const rp = rng(lf, 104, 118); tf(R.ring, `scale(${1 + rp * 1.4})`); op(R.ring, rp > 0 ? 1 - rp : 0);
    const cm = E.io(rng(lf, 84, 102));
    tf(R.cur, `translate(${lerp(1720, 1524, cm)}px, ${lerp(1010, 686, cm)}px) scale(${lf >= 104 && lf < 110 ? .85 : 1})`); op(R.cur, rng(lf, 80, 86) * (1 - bout));
  },
  generate(lf, len) {
    SF.pop(R.gw1, lf, 0, 4, 10, 30); SF.pop(plain(R.gw2), lf, 8, 4, 10, 30); popHl(R.gw2, lf, 20);
    R.lines.forEach((l, i) => { const t = rng(lf, 6 + i * 6, 12 + i * 6); op(l, t); l.style.clipPath = `inset(0 ${(1 - t) * 100}% 0 0)`; });
    op(R.code, 1 - rng(lf, 100, 112) * .6);
    R.cards.forEach(o => {
      const t = E.expo(rng(lf, o.at, o.at + 16));
      tf(o.cd, `translate(${lerp(o.sx, o.x, t)}px, ${lerp(o.sy, o.y, t)}px) rotate(${(1 - t) * o.rot}deg) scale(${lerp(.5, 1, t)})`);
      op(o.cd, rng(lf, o.at, o.at + 4)); o.cd.style.filter = t < .98 ? `blur(${(1 - t) * 10}px)` : '';
    });
    R.stepEls.forEach((s, i) => { const at = 60 + i * 15, t = E.back(rng(lf, at, at + 10)); op(s, .35 + .65 * clamp(t)); s.style.borderColor = lf >= at ? 'var(--acc)' : 'var(--line)'; tf(s.firstChild, `scale(${clamp(t, 0, 1.3)})`); });
    op(R.steps, rng(lf, 40, 50));
    op(R.generate, 1 - E.in2(rng(lf, len - 8, len)));
  },
  editor(lf, len) {
    SF.pop(plain(R.ew1), lf, 2, 3, 10, 30); popHl(R.ew1, lf, 14);
    const t = E.expo(rng(lf, 0, 20)); tf(R.ed, `translateY(${(1 - t) * 90}px) scale(${lerp(.95, 1, t)})`); op(R.ed, t);
    const typed = SF.typed(V('e-field'), lf, 32, 58);
    R.fieldIn.innerHTML = lf >= 26 && lf < 32 ? `<span style="background:color-mix(in srgb, var(--acc) 45%, transparent)">${esc(R.before)}</span>` : esc(lf < 26 ? R.before : typed) + (lf >= 32 && lf < 64 ? '<span class="caret"></span>' : '');
    R.fieldIn.style.borderColor = lf >= 26 && lf < 66 ? 'var(--acc)' : 'var(--line)';
    R.prevH.textContent = lf < 32 ? R.before : (typed || ' ');
    const marks = [0, 70, 84, 98], pick = lf < 70 ? 0 : lf < 84 ? 1 : lf < 98 ? 2 : 3, Lk = LOOKS[LOOK_IDS[pick]];
    if (!R.shot) { R.prev.style.background = lookBg(Lk, .4); R.prev.style.color = Lk.fg; }
    R.sws.forEach((s, i) => { s.style.outlineColor = i === pick ? 'var(--fg)' : 'transparent'; tf(s, `scale(${i === pick && lf >= 70 ? lerp(1.2, 1, rng(lf, marks[pick], marks[pick] + 8)) : 1})`); });
    R.bars.forEach(o => { const gr = E.expo(rng(lf, 4 + o.row * 3 + o.k * 1.5, 22 + o.row * 3 + o.k * 1.5)); o.b.style.width = (o.w * gr) + 'px'; });
    R.head.style.left = lerp(0, 1600, rng(lf, 10, 116)) + 'px';
    op(R.editor, 1 - E.in2(rng(lf, len - 8, len)));
  },
  variants(lf, len) {
    SF.pop(plain(R.vw), lf, 0, 4, 10, 30); popHl(R.vw, lf, 10);
    R.vts.forEach((e, i) => { const at = 6 + i * 7, t = rng(lf, at, at + 10); op(e, t * 2.5); tf(e, `scale(${lerp(.7, 1, E.back(t))})`); e.style.filter = t < 1 ? `blur(${(1 - t) * 8}px)${t < .3 ? ' hue-rotate(90deg)' : ''}` : ''; });
    tf(R.wall, `scale(${lerp(1.12, 1, E.out(rng(lf, 0, 90)))})`);
    const W = R.chips.scrollWidth / 2; tf(R.chips, `translateX(${lerp(1920, 1920 - W - 200, rng(lf, 30, len))}px)`); op(R.chips, rng(lf, 30, 40));
    op(R.variants, 1 - E.in2(rng(lf, len - 8, len)));
  },
  sound(lf, len) {
    SF.pop(plain(R.nw), lf, 0, 4, 10, 30); popHl(R.nw, lf, 12);
    const pulse = Math.exp(-(lf % BEAT) / 4), beatN = Math.floor(lf / BEAT), col = E.io(rng(lf, 56, 66)), dot = E.in2(rng(lf, 64, 74));
    R.wbars.forEach((b, i) => {
      const bell = Math.exp(-Math.pow((i - 35.5) / 24, 2)), hgt = 420 * (.1 + bell * (.22 + .2 * hash(i * 1.7 + Math.floor(lf / 3))) + .62 * bell * pulse * (.4 + .6 * hash(i * 3.3 + beatN)) + .05 * Math.sin(i * .7 + lf * .4));
      b.style.height = Math.max(6, hgt * (1 - col)) + 'px'; b.style.background = pulse > .6 && bell > .5 ? 'var(--acc)' : 'var(--fg)';
    });
    tf(R.wave, `scaleX(${Math.max(.002, 1 - dot)})`);
    R.cueEls.forEach((c, i) => { const t = E.back(rng(lf, i * 15, i * 15 + 8)); op(c, clamp(t) * (1 - col)); tf(c, `translateY(${(1 - t) * -160}px)`); });
    op(R.n1, 1 - col);
  },
  logo(lf, len) {
    const iris = E.expo(rng(lf, 0, 18)); R.logo.style.clipPath = `circle(${iris * 1250}px at 960px 470px)`;
    const mv = E.io(rng(lf, 72, 100)), nl = R.letters.length, sc = lerp(1, .6, mv), cy = lerp(470, 320, mv);
    if (R.ctx && R.dots) {
      const ctx = R.ctx, D = R.D, cell = 10, w = D.cols * cell, hh = D.rows * cell;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1920, 1080);
      ctx.setTransform(sc, 0, 0, sc, 960 - w * sc / 2, cy - hh * sc / 2);
      const layer = (key, color, a, spread) => {
        ctx.fillStyle = color; ctx.beginPath();
        for (const o of R.dots) {
          if (!o[key]) continue; const t = rng(lf, a + o.d * spread, a + 12 + o.d * spread); if (t <= 0) continue;
          const r = Math.max(0, (o[key] / 7) * .72 * cell * E.back(t)), x = o.c * cell + cell / 2, y = o.r * cell + cell / 2;
          ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx.fill();
      };
      layer('ri', '#0d0d0c', 4, 46); layer('rl', '#b4cf3a', 20, 40);
    } else if (R.ulogo) {
      const t = E.expo(rng(lf, 4, 30)); R.ulogo.style.cssText = `left:${960 - 380 * sc}px;top:${cy - 260 * sc}px;width:${760 * sc}px;height:${520 * sc}px;clip-path:circle(${t * 70}% at 50% 50%);opacity:${t}`;
    }
    R.letters.forEach((l, i) => { const t = rng(lf, 92 + i * 27 / nl, 104 + i * 27 / nl), e = E.expo(t); op(l, t * 2); tf(l, `translateY(${(1 - e) * 60}px)`); l.style.filter = t < 1 ? `blur(${(1 - e) * 10}px)` : ''; });
    const tg = E.expo(rng(lf, 116, 132)); op(R.tag, tg); R.tag.style.letterSpacing = lerp(.8, .42, tg) + 'em';
    op(R.url, rng(lf, 130, 142)); op(R.note, rng(lf, 140, 152) * .8);
  },
};

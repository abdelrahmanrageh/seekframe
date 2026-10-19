// @ts-check
/// <reference path="../../dist/types/browser/film-globals.d.ts" />
/* Seekframe feature tour — original kinetic typography and identity study.
   Reference clips informed only the broad art direction; no reference media is used. */
'use strict';
const { el, E, rng } = SF;

const SCENES = [
  { id: 'intro', name: 'Motion starts here', start: 0, end: 144 },
  { id: 'identity', name: 'Build a visual language', start: 144, end: 288 },
  { id: 'motion', name: 'Make every frame move', start: 288, end: 432 },
  { id: 'variants', name: 'Change the direction', start: 432, end: 576 },
  { id: 'outro', name: 'Seekframe', start: 576, end: 720 },
];
// Shared visual landing frames: the picture and sound use these same frame numbers.
const BEATS = {
  introHero: [0, 20], introEcho: [3, 28], introSlash: [10, 34],
  identitySwatches: [25, 33, 41, 49, 57],
  motionLabels: [32, 48, 64], motionBars: [56, 72, 88],
  variantTiles: [34, 45, 56], outroTitle: 30, outroMark: 46,
};
const PARAMS = [
  { id: 'headline', type: 'text', label: 'Hero word', scene: 'intro', default: 'MOVE', maxLength: 18 },
  { id: 'subtitle', type: 'text', label: 'Supporting line', scene: 'intro', default: 'Ideas with a pulse.', maxLength: 64 },
  { id: 'title-size', type: 'number', label: 'Hero scale', scene: 'intro', default: 244, min: 140, max: 320, step: 4, unit: 'px', cssVar: '--hero-size' },
  { id: 'mood', type: 'select', label: 'Colour world', scene: 'variants', default: 'acid', options: [{ value: 'acid', label: 'Acid paper' }, { value: 'electric', label: 'Electric blue' }, { value: 'ink', label: 'Night ink' }] },
  { id: 'accent', type: 'color', label: 'Flash colour', scene: 'identity', default: '#B8FF00', cssVar: '--accent' },
  { id: 'show-logo', type: 'boolean', label: 'Show brand image', scene: 'identity', default: true },
  { id: 'logo', type: 'image', label: 'Brand image', scene: 'identity', default: 'brand/assets/logo.jpg', help: 'Upload a local PNG or SVG to replace the sample mark.' },
  { id: 'shape', type: 'select', label: 'Shape language', scene: 'variants', default: 'orb', options: [{ value: 'orb', label: 'Glossy orb' }, { value: 'tile', label: 'Hard tile' }, { value: 'ribbon', label: 'Soft ribbon' }] },
  { id: 'feature-1', type: 'text', label: 'Beat one', scene: 'motion', default: 'Write the feeling' },
  { id: 'feature-2', type: 'text', label: 'Beat two', scene: 'motion', default: 'Move the message' },
  { id: 'feature-3', type: 'text', label: 'Beat three', scene: 'motion', default: 'Make it yours' },
  { id: 'cta', type: 'text', label: 'Final line', scene: 'outro', default: 'Make a little noise.', maxLength: 64 },
];
const DEFAULTS = Object.fromEntries(PARAMS.map(p => [p.id, p.default]));
const V = id => SF.value(id, DEFAULTS[id]);
const WORLDS = {
  acid: { bg: '#F4F2EB', ink: '#11120F', soft: '#D8D5CC', accent: '#B8FF00' },
  electric: { bg: '#221DE8', ink: '#FFFFFF', soft: '#4946F0', accent: '#C8FF00' },
  ink: { bg: '#101110', ink: '#F7F6F0', soft: '#292B27', accent: '#E7FF3B' },
};
let R = {};

function cues() {
  const c = SF.cues();
  // A clear opening hit, then a repeated bright double-tick identity.
  c.stamp(SCENES[0].start + BEATS.introHero[1], { gain: .7 });
  c.dtick(SCENES[0].start + BEATS.introSlash[1], { gain: .2 });

  c.thud(SCENES[1].start, { gain: .24 });
  BEATS.identitySwatches.forEach((f, i) => c.tick(SCENES[1].start + f, { pan: [-.5, -.25, 0, .25, .5][i], gain: .12 }));

  // Each feature lands on the frame where its headline finishes entering.
  c.whoosh(SCENES[2].start + 20, { dur: 12 / 30, gain: .2 });
  BEATS.motionLabels.forEach((f, i) => c.pluck(SCENES[2].start + f, { note: ['C4', 'E4', 'G4'][i], gain: .3 }));

  c.whoosh(SCENES[3].start + 20, { dur: 14 / 30, gain: .2 });
  BEATS.variantTiles.forEach((f, i) => c.pluck(SCENES[3].start + f, { note: ['A3', 'C4', 'E4'][i], gain: .27 }));

  c.thud(SCENES[4].start - 2, { gain: .22 });
  c.stamp(SCENES[4].start + BEATS.outroTitle, { gain: .65 });
  c.dtick(SCENES[4].start + BEATS.outroMark, { gain: .23 });
  return c.list;
}
function text(node, value) { node.textContent = String(value); }
function setWorld() {
  const w = WORLDS[V('mood')] || WORLDS.acid;
  document.documentElement.style.setProperty('--paper', w.bg);
  document.documentElement.style.setProperty('--ink', w.ink);
  document.documentElement.style.setProperty('--soft', w.soft);
  document.documentElement.style.setProperty('--accent', V('accent') || w.accent);
  document.documentElement.style.setProperty('--hero-size', `${V('title-size')}px`);
  document.body.dataset.shape = V('shape');
}
function updateValues() {
  if (!R.scenes) return;
  setWorld();
  text(R.scenes.intro.querySelector('.hero-word'), V('headline'));
  text(R.scenes.intro.querySelector('.echo'), V('headline'));
  text(R.scenes.intro.querySelector('.sub'), V('subtitle'));
  text(R.scenes.outro.querySelector('.last-line'), V('cta'));
  R.scenes.motion.querySelectorAll('.beat-label').forEach((n, i) => text(n, V(`feature-${i + 1}`)));
  R.logo.src = V('logo') || '';
  R.logo.style.display = V('show-logo') && V('logo') ? 'block' : 'none';
}

SF.define({
  title: 'Seekframe — Motion Study', width: 1280, height: 720, fps: 30, duration: 720, scenes: SCENES,
  params: PARAMS, cues, soundtrack: { theme: 'bright', loudness: -16 },
  audio: [{ id: 'score', label: 'Generated motion score', generated: 'cues', default: true }],
  variants: {
    thumbFrame: 500,
    axes: [{ id: 'mood', label: 'Colour world' }, { id: 'shape', label: 'Shape language' }],
    presets: [
      { id: 'acid-orb', label: 'Acid · liquid', params: { mood: 'acid', accent: '#B8FF00', shape: 'orb' } },
      { id: 'electric-tile', label: 'Electric · graphic', params: { mood: 'electric', accent: '#FF4A35', shape: 'tile' } },
      { id: 'ink-ribbon', label: 'Ink · soft', params: { mood: 'ink', accent: '#DEFF32', shape: 'ribbon' } },
    ],
  },
  build() {
    const stage = document.getElementById('stage'); stage.innerHTML = ''; R = {};
    R.back = el('div', 'back', stage); R.grid = el('div', 'grid', stage);
    R.shapes = el('div', 'shape-field', stage);
    for (let i = 0; i < 22; i++) el('i', 'shape', R.shapes);
    R.logo = el('img', 'brand-mark', stage);
    R.scenes = {};
    SCENES.forEach(s => R.scenes[s.id] = el('section', `scene ${s.id}`, stage));
    R.scenes.intro.innerHTML = `<div class="meta"><span>SF—001</span><span>SEEKFRAME / MOTION STUDY</span></div><div class="intro-composition"><div class="stamp">FRAME<br>01—05</div><div class="echo"></div><h1 class="hero-word"></h1><div class="slash"></div><p class="sub"></p></div><div class="edge-note">BRAND FILMS<br>AS CODE ↗</div><div class="scene-no">01</div>`;
    R.scenes.identity.innerHTML = `<div class="meta"><span>02 / VISUAL LANGUAGE</span><span>TYPE · TONE · TEXTURE</span></div><div class="identity-head"><span>MAKE A</span><b>MARK</b><span>THAT MOVES.</span></div><div class="swatch-row"><i></i><i></i><i></i><i></i><i></i></div><div class="identity-footer"><span class="caption">YOUR BRAND IS A MOTION SYSTEM</span><span class="micro">COLOUR / TYPE / SHAPE</span></div><div class="scene-no">02</div>`;
    R.scenes.motion.innerHTML = `<div class="meta"><span>03 / TIMING IS DESIGN</span><span>30 FPS — EVERY FRAME COUNTS</span></div><div class="motion-layout"><div class="motion-copy"><span class="oversize">GO<span>!</span></span><span class="motion-caption">THOUGHT<br>IN MOTION</span></div><div class="beats">${['feature-1', 'feature-2', 'feature-3'].map((_, i) => `<div class="beat"><b>0${i + 1}</b><span class="beat-label"></span><i></i></div>`).join('')}</div></div><div class="scene-no">03</div>`;
    R.scenes.variants.innerHTML = `<div class="meta"><span>04 / ONE IDEA, MANY WORLDS</span><span>PARAMS → PRESETS → PLAY</span></div><div class="variant-title">CHANGE<br>THE <i>ANGLE.</i></div><div class="variant-stage"><div class="v-tile v-a"><span>A</span><b>ACID</b><i></i></div><div class="v-tile v-b"><span>B</span><b>VOLT</b><i></i></div><div class="v-tile v-c"><span>C</span><b>INK</b><i></i></div></div><div class="scene-no">04</div>`;
    R.scenes.outro.innerHTML = `<div class="outro-mark"><span>S</span><i></i><span>F</span></div><div class="outro-word">SEEK<br>FRAME</div><div class="last-line"></div><div class="outro-foot"><span>DESIGN / EDIT / RENDER</span><span>EST. IN YOUR BROWSER</span></div><div class="scene-no">05</div>`;
    updateValues();
  },
  seek(f) {
    const sc = SCENES.find(s => f >= s.start && f < s.end) || SCENES[SCENES.length - 1];
    const local = f - sc.start, len = sc.end - sc.start;
    for (const s of SCENES) R.scenes[s.id].style.display = s.id === sc.id ? 'block' : 'none';
    const scene = R.scenes[sc.id];
    scene.style.opacity = String(Math.min(rng(local, 0, 8), 1 - rng(local, len - 8, len)));
    const enter = E.out(rng(local, 0, 25));
    scene.style.setProperty('--enter', String(enter));
    if (sc.id === 'intro') {
      const word = scene.querySelector('.hero-word'), echo = scene.querySelector('.echo');
      word.style.transform = `translate(${(1 - E.out(rng(local, ...BEATS.introHero))) * 110}px,${(1 - enter) * 34}px) skewX(${(1 - enter) * -12}deg)`;
      echo.style.transform = `translate(${(1 - E.out(rng(local, ...BEATS.introEcho))) * -135}px,${Math.sin(local / 10) * 10}px) skewX(-8deg)`;
      echo.style.opacity = String(.2 + .5 * E.out(rng(local, ...BEATS.introEcho)));
      scene.querySelector('.slash').style.transform = `scaleX(${E.out(rng(local, ...BEATS.introSlash))})`;
    } else if (sc.id === 'identity') {
      scene.querySelector('.identity-head').style.setProperty('--rise', `${(1 - enter) * 70}px`);
      scene.querySelectorAll('.swatch-row i').forEach((n, i) => {
        const p = E.out(rng(local, i * 8, i * 8 + BEATS.identitySwatches[i] - i * 8));
        n.style.transform = `scaleX(${p})`; n.style.transformOrigin = 'left center';
      });
    } else if (sc.id === 'motion') {
      scene.querySelectorAll('.beat').forEach((n, i) => {
        const p = E.out(rng(local, 6 + i * 16, BEATS.motionLabels[i]));
        n.style.opacity = String(p); n.style.transform = `translateX(${(1 - p) * 90}px)`;
        n.querySelector('i').style.transform = `scaleX(${E.out(rng(local, 24 + i * 16, BEATS.motionBars[i]))})`;
      });
    } else if (sc.id === 'variants') {
      scene.querySelectorAll('.v-tile').forEach((n, i) => {
        const p = E.out(rng(local, i * 11, BEATS.variantTiles[i]));
        n.style.opacity = String(p);
        n.style.transform = `translateY(${(1 - p) * 90}px) rotate(${(1 - p) * (i - 1) * 12}deg) scale(${.82 + p * .18})`;
      });
    } else {
      const p = E.out(rng(local, 0, BEATS.outroTitle));
      scene.querySelector('.outro-word').style.transform = `translateY(${(1 - p) * 100}px) scaleY(${.75 + p * .25})`;
      scene.querySelector('.outro-mark').style.transform = `scale(${.55 + .45 * E.out(rng(local, 12, BEATS.outroMark))}) rotate(${(1 - p) * 20}deg)`;
    }
    R.shapes.querySelectorAll('.shape').forEach((n, i) => {
      const x = 4 + SF.hash(i + 11) * 92, y = 6 + SF.hash(i + 29) * 88;
      const phase = local / (10 + SF.hash(i + 7) * 12) + i;
      n.style.left = `${x}%`; n.style.top = `${y}%`;
      n.style.transform = `translate(${Math.sin(phase) * 32}px,${Math.cos(phase * .8) * 30}px) rotate(${phase * 14}deg) scale(${.45 + SF.hash(i + 3) * .9})`;
      n.style.opacity = String(.14 + .42 * (1 + Math.sin(phase)) / 2);
    });
  },
});

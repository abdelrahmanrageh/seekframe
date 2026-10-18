/* Seekframe runtime — helpers every film needs, plus SF.define() which wires up the film contract.
   Include it from your film.html:   <script src="../../src/runtime/seekframe.js"></script>
   Docs: docs/RUNTIME.md and docs/FILM_SPEC.md. Everything here is a pure function of its inputs (no clocks, no randomness). */
(function (g) {
  'use strict';
  const SF = {};

  /* ---------- math + easing ---------- */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rng = (f, a, b) => clamp((f - a) / (b - a));                  // progress 0..1 of f between a and b
  const E = {
    lin: t => clamp(t),
    out: t => 1 - Math.pow(1 - clamp(t), 3), in: t => Math.pow(clamp(t), 3),
    out2: t => 1 - (1 - clamp(t)) * (1 - clamp(t)), in2: t => clamp(t) * clamp(t),
    io: t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    expo: t => { t = clamp(t); return (1 - Math.pow(2, -9 * t)) / (1 - Math.pow(2, -9)); },
    back: t => { t = clamp(t); const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };
  // keyframes: kf(f, [[frame, value, ease?], ...]) — each segment eases into its value with its own ease (default io)
  function kf(f, tab, ease = E.io) {
    if (f <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i++) if (f <= tab[i][0]) { const [f0, v0] = tab[i - 1], [f1, v1, e] = tab[i]; return lerp(v0, v1, (e || ease)((f - f0) / (f1 - f0))); }
    return tab[tab.length - 1][1];
  }
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // seeded 0..1, use instead of Math.random
  const wob = (seed, t, amp = 1) => amp * (Math.sin(t * 0.045 + seed * 1.7) * 0.6 + Math.sin(t * 0.021 + seed * 3.1) * 0.4);
  Object.assign(SF, { clamp, lerp, rng, E, kf, hash, wob });

  /* ---------- dom ---------- */
  const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const css = (e, o) => { for (const k in o) e.style[k] = o[k]; return e; };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  // for elements positioned with transform: keep them pinned to the origin (otherwise RTL pages offset them)
  const place = (e, x, y, extra = '') => { e.style.left = '0'; e.style.top = '0'; e.style.transform = `translate(${x}px,${y}px) ${extra}`; };
  Object.assign(SF, { el, css, esc, place });

  /* ---------- language / direction ---------- */
  const html = document.documentElement;
  const lang = g.FILM_LANG || html.lang || 'en', rtl = (html.dir || (g.FILM_RTL ? 'rtl' : 'ltr')) === 'rtl' || g.FILM_LANG === 'ar' || !!g.FILM_RTL;
  SF.lang = { code: lang, rtl };
  SF.X = (x, W) => (rtl ? (W || SF.layout().W) - x : x);               // mirror a horizontal coordinate in RTL
  SF.dirSign = rtl ? -1 : 1;                                            // +1 / -1 for "forward" horizontal motion

  /* ---------- layout (responsive films: 16:9, 9:16, 1:1) ---------- */
  SF.layout = () => {
    const W = g.innerWidth, H = g.innerHeight, r = W / H;
    const aspect = Math.abs(r - 16 / 9) < .05 ? '16x9' : Math.abs(r - 9 / 16) < .05 ? '9x16' : Math.abs(r - 1) < .05 ? '1x1' : r > 1 ? 'wide' : 'tall';
    const unit = Math.min(W, H) / 1080;                                  // scale type/spacing with this
    return { W, H, aspect, unit, portrait: H > W, safe: { x: Math.round(W * .06), y: Math.round(H * (H > W ? .1 : .08)) } };
  };

  /* ---------- text animation ---------- */
  // "Cash on [delivery.]" -> word spans; [..] = highlighted keyword (its text sits in .in so wipe() can colour it separately)
  SF.words = (parent, text, cls = '') => {
    const out = [];
    (String(text).match(/\[[^\]]+\]|\S+/g) || []).forEach((tk, i, a) => {
      const hl = tk.startsWith('[');
      out.push(el('span', 'w' + (hl ? ' hl' : '') + (cls ? ' ' + cls : ''), parent, hl ? `<span class="in">${esc(tk.slice(1, -1))}</span>` : esc(tk)));
      if (i < a.length - 1) parent.appendChild(document.createTextNode(' '));
    });
    return out;
  };
  SF.pop = (ws, f, start, step = 4, dur = 9, dy = 26) => ws.forEach((w, i) => {
    const t = rng(f, start + i * step, start + i * step + dur), e = E.expo(t);
    w.style.opacity = clamp(t * 2.2); w.style.transform = `translateY(${(1 - e) * dy}px)`; w.style.filter = t < 1 ? `blur(${(1 - e) * 8}px)` : '';
  });
  // highlight that wipes in: box and text colour sweep together (no dark-on-dark half state). Direction follows the page.
  SF.wipe = (w, t, base = 'var(--fg)') => {
    const d = rtl ? 270 : 90, p = (clamp(t) * 100).toFixed(2), i = w.firstChild;
    w.style.background = `linear-gradient(${d}deg, var(--acc) ${p}%, transparent ${p}%)`;
    i.style.background = `linear-gradient(${d}deg, var(--accInk) ${p}%, ${base} ${p}%)`; i.style.webkitBackgroundClip = 'text'; i.style.backgroundClip = 'text'; i.style.color = 'transparent';
  };
  SF.typed = (text, f, a, b) => { const g_ = [...(new Intl.Segmenter(lang, { granularity: 'grapheme' })).segment(text)].map(x => x.segment); return g_.slice(0, Math.floor(rng(f, a, b) * g_.length)).join(''); };

  /* ---------- svg stroke drawing ---------- */
  // path with pathLength=1 and stroke-dasharray "1 1": dash(p, 0..1) draws it
  SF.dash = (p, v) => { p.style.strokeDashoffset = String(1 - clamp(v)); p.style.opacity = v <= .001 ? 0 : 1; };

  // Draws a logo from `seekframe brand import-logo --strokes` output (assets/logo-strokes.json) as animatable strokes.
  //   const L = SF.strokeLogo(parent, data, {width: 420, colors: {0: 'var(--markA)'}}); SF.dash(L.paths[0], progress)
  SF.strokeLogo = (parent, data, o = {}) => {
    const [x, y, w, h] = data.viewBox, W = o.width || 400, ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`); svg.setAttribute('width', W); svg.setAttribute('height', W * h / w); svg.style.overflow = 'visible';
    const paths = data.strokes.map((s, i) => { const p = document.createElementNS(ns, 'path'); p.setAttribute('d', s.d); p.setAttribute('fill', 'none'); p.setAttribute('stroke-width', s.width); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); p.setAttribute('pathLength', '1'); p.setAttribute('stroke-dasharray', '1 1'); p.style.stroke = (o.colors && o.colors[i]) || s.color; svg.appendChild(p); return p; });
    if (parent) parent.appendChild(svg); return { svg, paths };
  };

  /* ---------- fonts + images ---------- */
  // Waits for every @font-face to settle. A face whose file is missing (e.g. a licensed brand font that is not in the repo)
  // is skipped, so the CSS fallback stack takes over instead of failing the film.
  SF.fontsReady = async () => {
    const faces = [...document.fonts]; await Promise.all(faces.map(f => f.load().catch(() => null)));
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.complete || !i.src ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
  };

  /* ---------- brand tokens (brand/brand.js defines window.BRAND, brand/brand.css the CSS variables) ---------- */
  SF.brandParams = (opts = {}) => {
    const B = g.BRAND; if (!B) return [];
    const L = { accent: 'Accent colour', ink: 'Dark colour', paper: 'Light colour', muted: 'Muted colour' }, out = [];
    for (const k of Object.keys(B.colors || {})) out.push({ id: 'brand-' + k, type: 'color', label: L[k] || k, default: B.colors[k], cssVar: '--brand-' + k, ...opts });
    return out;
  };

  /* ---------- cues (feed the sound engine; see docs/SOUND.md) ---------- */
  // const c = SF.cues(); c.hit(42); c.tick(10, {pan:-.2}); c.slide(106, 141, {pan:[-1,1]}); film manifest gets c.list
  SF.cues = () => {
    const list = [], add = (kind, f, o) => { list.push({ kind, f, ...o }); return list; };
    return new Proxy({ list }, { get: (t, k) => k === 'list' ? list : (a, b, c) => typeof b === 'number' ? add(k, a, { to: b, ...c }) : add(k, a, b) });
  };

  /* ---------- the contract ---------- */
  /* SF.define({
       title, width, height, fps, duration, scenes: [{id,name,start,end}],
       params: [..] | values => [..],         // editable options (dynamic list allowed)
       audio: [..], sizes: [..], variants: {...}, soundtrack: {theme:'deep'},
       cues: values => [..],                  // optional: events for the generated score
       build(values),                         // (re)build the DOM for these param values
       seek(f),                               // draw frame f
     })  -> sets window.manifest, applyParams, seek, ready                                                      */
  SF.define = spec => {
    let P = {};
    const m = g.manifest = { schema: 1, title: spec.title, width: spec.width, height: spec.height, fps: spec.fps || 30, duration: spec.duration, scenes: spec.scenes, params: [], audio: spec.audio || [] };
    if (spec.sizes) m.sizes = spec.sizes; if (spec.variants) m.variants = spec.variants; if (spec.soundtrack) m.soundtrack = spec.soundtrack; m.lang = { code: lang, rtl };
    const values = () => ({ ...P });
    g.applyParams = v => {
      P = { ...v };
      m.params = typeof spec.params === 'function' ? spec.params(values()) : (spec.params || []);
      if (spec.audio && typeof spec.audio === 'function') m.audio = spec.audio(values());
      if (spec.cues) m.cues = spec.cues(values());
      spec.build(values());
    };
    g.seek = f => spec.seek(f);
    g.ready = (async () => { await SF.fontsReady(); g.applyParams({}); await SF.fontsReady(); return true; })();
    SF.value = (id, dflt) => (P[id] == null ? dflt : P[id]);
    return m;
  };

  g.SF = SF;
})(window);

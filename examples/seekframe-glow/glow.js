// @ts-check
/* Glow: the style module behind templates/glow (read STYLE.md for the grammar).
   Glow.install(stage, {scenes, cuts, light}) adds the atmosphere and cut layers and returns the per-frame helpers.
   Everything is a pure function of the frame number: blooms drift on sines, grain is a seeded noise field, cuts are ranges. */
'use strict';
window.Glow = (() => {
  const { E, rng, lerp, clamp } = SF;
  const tf = (e, s) => { e.style.transform = s; };
  const op = (e, v) => { e.style.opacity = String(clamp(v)); };
  const blur = (e, px) => { e.style.filter = px > .05 ? `blur(${px.toFixed(2)}px)` : ''; };
  const rgb = h => { h = String(h).trim(); if (h.startsWith('rgb')) return h.match(/[\d.]+/g).slice(0, 3).map(Number); if (h.length === 4) h = '#' + [...h.slice(1)].map(c => c + c).join(''); return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  // three light colours from the brand accent: the accent, a deep shade of it, and a softer, cooler tint
  const palette = acc => { const a = rgb(acc); return { acc: a, deep: mix(a, [0, 40, 20], .72), soft: mix(a, [40, 210, 140], .5) }; };

  /** words drift up out of a blur, one after another (the signature headline move) */
  const focusIn = (ws, lf, at, step = 3, dur = 14) => ws.forEach((w, i) => { const u = E.out(rng(lf, at + i * step, at + i * step + dur)); op(w, u); blur(w, (1 - u) * 18); tf(w, `translateY(${(1 - u) * 34}px) scale(${lerp(1.08, 1, u)})`); });
  /** any element: fade, rise and sharpen between frames a and b; returns the progress */
  const show = (e, lf, a, b, dy = 30, bl = 14) => { const u = E.out(rng(lf, a, b)); op(e, u); blur(e, (1 - u) * bl); tf(e, `translateY(${(1 - u) * dy}px)`); return u; };

  function install(stage, o) {
    const { scenes, cuts, light, swirl = {} } = o, R = {};
    const P = palette(getComputedStyle(document.documentElement).getPropertyValue('--acc') || '#84ff00');
    const { W, H } = SF.layout();
    R.blobs = [0, 1, 2].map(() => SF.el('div', 'g-bloom', stage));
    R.swirls = [0, 1].map(() => SF.el('div', 'g-swirl', stage));
    SF.el('div', 'g-dots', stage);
    // scene layers go here (the caller appends sections after install), overlays are added by overlays()
    function overlays(grain = 1) {
      R.grain = SF.el('canvas', 'g-grain', stage); R.grain.width = Math.round(W / 3); R.grain.height = Math.round(H / 3); R.gctx = R.grain.getContext('2d'); R.gimg = R.gctx.createImageData(R.grain.width, R.grain.height); R.grainAmt = grain;
      R.vig = SF.el('div', 'g-vig', stage); R.streak = SF.el('div', 'g-streak', stage); R.leak = SF.el('div', 'g-leak', stage); R.flash = SF.el('div', 'g-flash', stage);
    }
    // light presets per scene: [x, y, size, which colour ('acc' | 'deep' | 'soft'), alpha], x and y as fractions of the frame
    function lightAt(f) {
      let i = scenes.findIndex(s => f >= s.start && f < s.end); if (i < 0) i = scenes.length - 1;
      const s = scenes[i], nx = scenes[Math.min(scenes.length - 1, i + 1)], u = E.io(rng(f, s.end - 14, s.end + 2));
      const a = light[s.id] || light.default, b = light[nx.id] || light.default;
      return { blobs: a.map((p, k) => { const q = b[k]; return [lerp(p[0], q[0], u), lerp(p[1], q[1], u), lerp(p[2], q[2], u), mix(P[p[3]], P[q[3]], u), lerp(p[4], q[4], u)]; }), swirl: lerp(swirl[s.id] ?? .5, swirl[nx.id] ?? .5, u) };
    }
    function atmosphere(f, mirror = false) {
      const L = lightAt(f), big = Math.max(W, H);
      L.blobs.forEach(([x, y, size, c, a], i) => {
        const b = R.blobs[i], sz = size * big * (1 + Math.sin(f / 60 + i) * .06), px = (mirror ? 1 - x : x) * W + Math.sin(f / 70 + i * 2.1) * 60, py = y * H + Math.cos(f / 85 + i * 1.3) * 50;
        b.style.cssText = `width:${sz}px;height:${sz}px;transform:translate(${px - sz / 2}px,${py - sz / 2}px);background:radial-gradient(closest-side,rgba(${c},${a}) 0,rgba(${c},${a * .45}) 45%,rgba(${c},0) 100%)`;
      });
      const portrait = H > W;
      R.swirls.forEach((s, i) => {
        const size = big * (i ? 1.35 : .88), rot = f * (i ? -.12 : .2) + i * 140, sy = portrait ? (i ? .72 : .86) : (i ? .5 : .62), c = P.acc.join(','), d = P.soft.join(',');
        s.style.cssText = `width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;opacity:${L.swirl * (i ? .55 : .8)};transform:rotate(${rot}deg) scaleY(${sy});background:conic-gradient(from 0deg,transparent 0 52%,rgba(${c},.05) 56%,rgba(${mix(P.acc, [255, 255, 255], .45).join(',')},.95) 70%,rgba(${d},.5) 80%,transparent 92%)`;
      });
      if (R.gimg) {
        const d = R.gimg.data; let x = (Math.floor(f) * 2654435761) >>> 0;
        for (let i = 0; i < d.length; i += 4) { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; const v = x & 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = (x >> 8 & 31) * R.grainAmt; }
        R.gctx.putImageData(R.gimg, 0, 0);
      }
    }
    /** every scene breathes in and out of focus; the kind of cut decides how (zoom: push through, others: settle) */
    function camera(cam, sc, lf, len) {
      const cin = cuts.find(c => c[0] === sc.start), cout = cuts.find(c => c[0] === sc.end);
      const i = E.out(rng(lf, 0, 16)), o = E.in2(rng(lf, len - 12, len));
      const sIn = cin ? lerp(cin[1] === 'zoom' ? .8 : 1.1, 1, i) : lerp(1.05, 1, i), sOut = lerp(1, cout && cout[1] === 'zoom' ? 1.3 : .95, o);
      const b = (1 - i) * 24 + o * 22;
      cam.style.transform = `scale(${(sIn * sOut * (1 + lf * .0005)).toFixed(4)})`;
      cam.style.filter = b > .1 ? `blur(${b.toFixed(2)}px)` : '';
      cam.style.opacity = String(clamp(Math.min(1, i * 1.3) * (1 - o * (cout && cout[1] === 'flash' ? .2 : .8))));
    }
    /** the cut layers: 'flash' (white luma), 'leak' (a wide band of light), 'streak' and 'zoom' (a hairline of light) */
    function cutFx(f, mirror = false) {
      let fl = 0, lk = -1, sk = -1; const mx = x => mirror ? W - x : x, ds = mirror ? -1 : 1;
      for (const [c, k] of cuts) {
        if (k === 'flash') fl = Math.max(fl, f < c ? E.in2(rng(f, c - 8, c)) : 1 - E.out(rng(f, c, c + 16)));
        if (k === 'leak' && f > c - 14 && f < c + 14) lk = rng(f, c - 14, c + 14);
        if ((k === 'streak' || k === 'zoom') && f > c - 10 && f < c + 6) sk = rng(f, c - 10, c + 6);
      }
      op(R.flash, fl * .96); R.flash.style.display = fl > .002 ? '' : 'none';
      R.streak.style.display = sk >= 0 ? '' : 'none';
      if (sk >= 0) tf(R.streak, `translateX(${mx(lerp(-200, W + 200, E.io(sk)))}px) rotate(${ds * (H > W ? 16 : 22)}deg)`);
      R.leak.style.display = lk >= 0 ? '' : 'none';
      if (lk >= 0) { const u = E.io(lk); R.leak.style.opacity = String(Math.sin(Math.PI * lk) * .95); tf(R.leak, `translate(${mx(lerp(-2900, W + 100, u))}px, ${lerp(H * .4, -H * .2, u)}px) rotate(${ds * -20}deg)`); }
    }
    /** a light hairline that hugs one edge of a tilted panel */
    function rim(rimEl, panel, lf, side = 'left') {
      const r = panel.getBoundingClientRect(); rimEl.style.left = (side === 'left' ? r.left : r.right - 2) + 'px'; rimEl.style.top = (r.top - 100) + 'px'; rimEl.style.height = (r.height + 200) + 'px';
      op(rimEl, E.out(rng(lf, 16, 34)) * (.75 + Math.sin(lf / 6) * .25));
    }
    return { R, palette: P, overlays, atmosphere, camera, cutFx, rim, setVignette: v => { R.vig.style.opacity = String(v); } };
  }
  return { install, focusIn, show, tf, op, blur };
})();

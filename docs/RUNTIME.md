# Runtime (`src/browser/runtime.ts` → `dist/browser/runtime.js`)

Include it before your film code:
```html
<script src="brand/brand.js"></script>                  <!-- optional: window.BRAND -->
<script src="../../dist/browser/runtime.js"></script>  <!-- window.SF (the path `seekframe new` writes for you) -->
<script src="film.js"></script>
```
Everything is pure (no clocks, no randomness).

| API | What it does |
|---|---|
| `SF.define(spec)` | Creates `window.manifest`, `applyParams`, `seek`, `ready` from `{title,width,height,fps,duration,scenes,params,audio,cues,soundtrack,variants,sizes,build(values),seek(f)}`. `params`/`audio`/`cues` may be functions of the current values. |
| `SF.value(id, default)` | current value of a param. |
| `SF.clamp, lerp, rng(f,a,b)` | math. `rng` = progress 0..1 of `f` between `a` and `b`. |
| `SF.E` | easings: `lin out in out2 in2 io expo back`. |
| `SF.kf(f, [[frame, value, ease?], …])` | keyframe interpolation. |
| `SF.hash(n)`, `SF.wob(seed,t,amp)` | seeded noise instead of `Math.random`. |
| `SF.el(tag, cls, parent, html)`, `SF.css(el, {…})`, `SF.esc`, `SF.place(el,x,y)` | DOM helpers. `place` pins transform-positioned elements to the origin (needed in RTL). |
| `SF.words(parent, "Cash on [delivery.]")` → spans; `SF.pop(spans, f, start)`; `SF.wipe(span, t)` | kinetic type. `[word]` = highlighted keyword; `wipe` sweeps the box and text colour together, in reading direction. |
| `SF.typed(text, f, a, b)` | typewriter text, grapheme-aware (Arabic safe). |
| `SF.dash(path, 0..1)` | draw an SVG path that has `pathLength="1" stroke-dasharray="1 1"`. |
| `SF.strokeLogo(parent, data, {width, colors})` | draws `brand/assets/logo-strokes.json` (from `brand import-logo --strokes`) as animatable strokes. |
| `SF.lang` `{code, rtl}`, `SF.X(x, W)`, `SF.dirSign` | language/direction (set `window.FILM_LANG='ar'` or `<html dir=rtl>`); `X` mirrors a coordinate. |
| `SF.layout()` | `{W,H,aspect:'16x9'|'9x16'|'1x1',unit,portrait,safe}` for responsive films. |
| `SF.brandParams()` | color params for the brand tokens, bound to `--brand-*`. |
| `SF.cues()` | cue builder: `c.boom(f,{…}); c.slide(from,to,{…}); c.list`. |
| `SF.fontsReady()` | waits for fonts/images; a missing licensed font is skipped so the fallback stack takes over. |

Layout rule of thumb for responsive films: size everything in `calc(N * var(--u))` where `--u = SF.layout().unit`.

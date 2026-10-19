# Film spec: how to make a film Seekframe can edit and render

A **film** is a folder with an HTML page that draws a video, one frame at a time. This document is the contract between
a film and the Seekframe editor, renderer, validator and MCP server. If you follow it, the film can be scrubbed,
re-timed, re-ordered, restyled, re-worded, scored and exported to MP4 by anyone, with no extra work.

> **Agents:** read this file completely, start from `templates/blank` (`seekframe new <name>`), run
> `seekframe validate <name>` and `seekframe review <name>`, and **look at the images** before you say you are done.

```bash
seekframe new my-film --width 1920 --height 1080     # films/my-film from templates/blank
seekframe validate my-film                           # contract, determinism, params, cues, accessibility
seekframe review my-film                             # stills + contact sheets + overflow/contrast/flash report
seekframe editor                                     # http://localhost:4173/?film=my-film
```

## 1. The one rule

**`seek(frame)` must be a pure function of the frame number.** The editor jumps around the timeline, plays scenes twice,
re-orders them, and the renderer draws frames in parallel in separate browsers. Frame 120 must look identical whether
it is the first call, the 500th, or follows frame 900.

- No `Date.now()`, `performance.now()`, `Math.random()`, `setTimeout`, `requestAnimationFrame`, CSS animations or
  transitions, `<video>` playback, or anything that advances by itself. Use `SF.hash(n)` for seeded randomness.
- Set *every* style an element needs on every call. Never rely on what the previous call left behind.
- Everything must be local: fonts via `@font-face` from the film folder, images from the folder, no CDN, no network.
  (The validator fails on any network request.)

## 2. Folder layout

```
films/<name>/            yours (examples/<name>/ ships with Seekframe)
  film.html              required. Fixed-size films: html,body{width:..px;height:..px;overflow:hidden}
  film.js, film.css      the code (any number of files)
  brand/                 brand kit copied from the workspace (brand.json, brand.css, brand.js, assets/, fonts/)
  assets/  audio/        images, svg, optional audio files
  projects/<v>.json      saved versions (written by the editor / `set_params`; don't hand-edit)
  uploads/               files added in the editor (git-ignored)
```

## 3. What the page defines

| global | |
|---|---|
| `window.ready` | Promise: fonts, images and the first build are done. |
| `window.seek(f)` | Draw frame `f`, in **manifest.fps** units; may be fractional (the renderer samples 60 fps from a 30 fps film). |
| `window.manifest` | The object in §4. Plain data. |
| `window.applyParams(values)` | `{paramId: value}` (changed ones only; fall back to defaults). Idempotent; may rebuild the DOM. The editor calls `seek` again afterwards. |

You normally don't write these by hand: **`SF.define({...})` from the runtime (`dist/browser/runtime.js`) creates all four** from a
spec (see [RUNTIME.md](RUNTIME.md)). The editor sets CSS custom properties itself for params that declare `cssVar`,
*before* `applyParams`, so a film made only of `cssVar` params needs no JavaScript for them.

## 4. The manifest

Machine-readable schema: [`src/core/film.schema.json`](../src/core/film.schema.json) (the validator enforces it).

```js
{
  schema: 1, title: 'Spring sale', width: 1920, height: 1080, fps: 30, duration: 600,   // duration in frames
  scenes:  [{ id: 'intro', name: 'Intro', start: 0, end: 120 }, ...],  // contiguous; start inclusive, end exclusive
  params:  [...],                                                      // §5
  audio:   [...],                                                      // §6
  cues:    [...],                                                      // §7  events for the generated score
  soundtrack: { theme: 'deep', loudness: -16 },                        // with SF.define it may be a function of the param values
  poster:  60,                                                         // frame the editor opens on (frame 0 is often blank)
  variants: { axes: [...], presets: [...], thumbFrame: 100 },          // §8
  sizes:   [{ width: 1080, height: 1920, label: 'Vertical' }],         // optional, §9
  lang:    { code: 'ar', rtl: true },                                  // set by SF.define
}
```

**Scenes** are what the editor re-orders, duplicates, deletes, trims and stretches. Make each one self-contained: it
should look right on its own, and its first/last frames should fade or cut cleanly because it may end up next to any other
scene. Ids are lowercase `a-z0-9-`. Aim for 3–15 scenes of 1–8 s. A stretched scene simply calls `seek` at a different
rate, so eased motion survives better than frame-exact choreography.

## 5. Params: the editable options

Everything a person might reasonably want to change should be a param: wording, numbers, colours, sizes, images,
switches, variants.

```js
{ id: 'headline', type: 'text', label: 'Headline', scene: 'intro', default: 'Spring sale', multiline: true }
```

Common keys: `id` (unique, `[A-Za-z0-9_.-]`), `type`, `label`, `default`, `scene` (the scene whose card shows the control;
omit for film-wide options on the **Style** tab), `help`, `cssVar`.

| type | extra keys | value |
|---|---|---|
| `text` | `multiline`, `maxLength` | string |
| `number` | **`min`, `max`** (required), `step`, `unit` | number |
| `color` | | `"#rrggbb"` |
| `boolean` | | true / false |
| `select` | **`options`**: `["a","b"]` or `[{value,label}]` | one of the options |
| `image` | | path relative to the film folder, `""` for none (the editor uploads to `uploads/`) |

**`cssVar`:** the editor writes the value to `document.documentElement.style` (numbers get `unit` appended). Use
`var(--accent)` in your CSS and you are done. It is the cheapest way to expose a param. **Brand colours** come for free:
`...SF.brandParams()` returns accent/ink/paper/muted params bound to `--brand-*`.

Guidelines:
- One param per independently useful choice; label for humans ("Headline", not `s2_t1`).
- Defaults must reproduce the design you shipped; use the same default in code and manifest.
- Text must still lay out when longer: wrap, `max-width`; people type longer words.
- Don't expose something that doesn't work: the validator changes each param and fails if the picture doesn't change.
- Params may depend on other params (e.g. a **hook** select that swaps which texts exist): return the list from a
  function `params: values => [...]`; the editor rebuilds its panels when the list changes.

## 6. Audio

```js
audio: [
  { id: 'score', label: 'Generated score', generated: 'cues', default: true },       // rendered from cues (§7)
  { id: 'vo',    label: 'Voice-over',  src: 'audio/vo.wav',  sync: 'timeline', group: 'main' },
  { id: 'music', label: 'Music bed',   src: 'audio/bed.mp3', sync: 'free', volume: .5 },
]
```
- `sync: 'timeline'` (default): aligned to the film's **source timeline** (sample 0 = frame 0). The editor cuts it per
  scene and speeds up/slows down each cut to match the scene's edited length (0.25×–4×).
- `sync: 'free'`: plays from the start of the output at normal speed (music beds).
- `generated: 'cues'`: the track is rendered from `manifest.cues` by the sound engine; always timeline-synced.
- `group`: tracks sharing a group are mutually exclusive in the editor.
- Paths are relative to the film folder. wav / mp3 / m4a / ogg. Users can also add audio files in the editor.

## 7. Cues: sound that follows the picture

Declare sound **events on the same frames you animate on**; the engine turns them into a score.
```js
const c = SF.cues(); c.boom(42, { gain: .6 }); c.tick(10, { pan: -.3 }); c.slide(106, 141, { p0: -1, p1: 1 }); return c.list;
```
Cues are built per variant (a function of the current params), so the score follows each variant and language
automatically (panning mirrors in RTL). Kinds, themes and loudness: [SOUND.md](SOUND.md). `seekframe sync` checks cues
against the picture.

## 8. Variants

`variants.presets` are named param sets shown as thumbnails in the editor's Variants tab and used by
`seekframe matrix`; `variants.axes` lists which params are the variant dimensions. See [VARIANTS.md](VARIANTS.md).

## 9. Sizes (optional)

Declare `sizes` only if the film lays itself out from `window.innerWidth/innerHeight` (use `SF.layout()`). The editor
then offers them under Export and loads the film in that viewport. Fixed-size films omit it.

## 10. Before you hand a film over

1. `seekframe validate <film>` passes (read every warning).
2. `seekframe review <film>` reports no failures; **open the contact sheets** and look: overflow, contrast, empty frames,
   wrong language or direction.
3. `seekframe sync <film>`: sound cues match what happens on screen.
4. Open it in the editor, scrub it, change one param of each type, stretch a scene to 2× and 0.5×.
5. Render a 30 fps draft and watch it.
6. Remove test `projects/` and `uploads/` you created.

## 11. Reference

- `templates/blank`: the smallest complete film, every param type, commented.
- `examples/client-tick` (+ `-ar`): a real 35 s film with 3 hooks × 3 styles × 2 card shapes, EN and Arabic RTL, brand kit, generated score.
- Guides: [RUNTIME](RUNTIME.md) · [SOUND](SOUND.md) · [BRAND](BRAND.md) · [VARIANTS](VARIANTS.md) · [ACCESSIBILITY](ACCESSIBILITY.md) · [RTL](RTL.md) · [LLM](LLM.md)

## 12. Types for film authors (optional)
`film.js` files from `seekframe new` start with `// @ts-check` and a `/// <reference …film-globals.d.ts />` line, so any editor shows autocomplete and
errors for `SF.*`, `SF.define({...})`, params, cues and the manifest, with no build step for the film itself. The declarations are generated from the
framework's TypeScript (`dist/types/`).

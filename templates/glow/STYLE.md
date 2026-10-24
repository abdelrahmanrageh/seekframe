# Glow: a dark, cinematic product-film style

Start a film in this style with `seekframe new my-film --template glow`. The look lives in `glow.css` and `glow.js`
(`Glow.install`); `film.js` is a complete starter film (hook, logo, three numbered chapters, end card) that lays itself out
for 16:9 and 9:16 and takes its colours from `brand/brand.json`.

Read this before you change anything: the style is the sum of small, consistent choices.

## The picture

| Layer (back to front) | What it is | Rules |
|---|---|---|
| Ground | near-black (`--brand-ink`, default `#030403`) | never pure grey; the light does the work |
| **Blooms** | three huge radial gradients per scene (`LIGHT`) | colours come from the accent: `acc`, `deep` (a dark shade), `soft` (a cooler tint). Each drifts slowly on sines; between scenes they blend over the last 14 frames, so light carries across a cut |
| **Swirl** | two blurred conic rings, rotating slowly in opposite directions | strength per scene (`SWIRL`); 1 on logo scenes, ~.4 behind dense UI |
| **Dot grid** | 22 px dots, 16% white, masked to the middle | always on, never animated |
| Scenes | text, glass cards, UI | see below |
| **Grain** | seeded noise, a third of the frame size, screen-blended | `grain` param; 0 turns it off |
| **Vignette** | dark edges | lower it (`G.setVignette(.25)`) on a bright scene |
| Cut layers | flash, leak, streak | see Transitions |

Pain or "before" scenes may shift a bloom towards red (`#ff3b30`, alpha ≤ .3) and swap back to the accent when the product arrives.

## Type

- One weight family; headlines 700, the big hook 800. `--T` (Text size param) drives everything.
- **One keyword per headline in an accent pill** (`[keyword]` in the text). Red pill for the pain word, accent for the answer.
- Headlines **blur into focus word by word** (`Glow.focusIn(words, lf, at, step 3-6, dur 14)`): each word rises 34 px, scales 1.08→1, blur 18→0.
- Support copy: one line, 34 px, 62% white, appears after the headline (frame 30-46 of the scene).
- Chapters carry a **gradient number capsule** (`01`, `02`…) with a short label, top of the text column.

## Things on screen

- **Glass cards**: 10%→2.5% white gradient, 1.5 px hairline border, inner top highlight, deep soft shadow, backdrop blur. Radius 28-40.
- **Real UI, not mockups**: draw the product's own screens in HTML (tickets, chats, dashboards). Never a stock phone frame.
- **Depth**: tilt UI in perspective (`rotateY` 14-34°, `rotateX` 6-14°) and let it drift a few degrees over the scene.
  Things further away get a little blur (1-3 px); near things stay sharp.
- **Rim light**: a 3 px accent hairline along the near edge of a tilted panel, glowing and gently pulsing (`G.rim`).
- **Orbiting chips** around a glass orb, at different depths (blur by depth), for "many questions / many channels".
- **The logo stays flat 2D**: no extrusion, no glow on the logo itself. The light behind it can glow.
- Numbers count up (ease out) and land with a small overshoot (scale 1→1.12→1 over ~8 frames) and a sound.

## Motion

- Easing: `E.out` for anything arriving, `E.io` for camera moves and paths, `E.in2` for leaving.
- Entrances: 12-16 frames; stagger 3-6 frames between siblings; everything enters from a blur (14-18 px) and 30-60 px below.
- The camera never stops: every scene scales 1→1.0005 per frame and panels drift.
- Hold the finished frame at least 1.5 s before the cut so it can be read.

## Transitions (every cut is covered, no hard cuts)

`CUTS = [[frame, kind], …]`. The outgoing scene blurs out (22 px) over its last 12 frames, the incoming one blurs in (24 px) over 16.

| Kind | Looks like | Use it for |
|---|---|---|
| `zoom` | the old scene pushes through the lens (scale 1.3), the new one arrives from 0.8, a light hairline crosses | going deeper into the same story |
| `flash` | a white luma bloom peaks on the cut | a turn: problem → product, the end card |
| `leak` | a wide accent-and-white light band sweeps diagonally across | moving between two features |
| `streak` | a single light hairline sweeps across while both scenes blur | a quick change of subject |

Avoid pixel dissolves and glitches: they break the soft, filmic feel.

## Sound

The same vocabulary everywhere: a soft pop per word as headlines focus in, a whoosh on zoom cuts, a swoosh on streaks, a fast
sweep plus a sharp hit on flashes, a shine under logo reveals, a tap on chapter pills, pops for cards and logos, a success
sound when a number lands. No music bed: the film is designed for sound effects only.

The `sfx` param picks the source: **Generated** (built-in cues, always available) or **Sound pack** (files in `assets/sfx`,
names in `assets/sfx/README.md`, normalised by `PEAK`). Sound packs are third-party audio: keep them out of git.

## Layout

- 16:9: text column 780 px wide at x 150 (mirrored for Arabic), the visual centred at 68% of the width.
- 9:16: text column across the top (y 170), the visual centred at 64% of the height.
- Arabic: the same film with `dir=rtl` (see docs/RTL.md); positions mirror, `DS` flips rotations and drifts.

## Checklist

1. `seekframe validate <film> --stills dir` and look at a still of every scene, in every size and language.
2. Every cut has a kind; no scene ends on a hard cut.
3. Exactly one pill per headline; no glow on the logo.
4. The film reads with the sound off.

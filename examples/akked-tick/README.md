# *The Tick*: Akked brand film (horizontal)

A 35-second, 1920×1080 brand film for **Akked** (a WhatsApp order-confirmation product). Akked is the author's own brand, shown here with permission as the
showcase. The logo mark is built live from a dot, a check stroke and an arch, and the whole film is code.

| Doubt · mono | Counter · deep green | Cash on delivery · lime | Doubt · Arabic (RTL) |
|---|---|---|---|
| ![](preview/v1-doubt-mono.gif) | ![](preview/v2-counter-deep.gif) | ![](preview/v3-cod-lime.gif) | ![](preview/v1-doubt-mono-ar.gif) |

Contact sheets (one frame per scene): [doubt](preview/akked-tick-v1-doubt-mono-sheet.jpg) · [counter](preview/akked-tick-v2-counter-deep-sheet.jpg) · [cash on delivery](preview/akked-tick-v3-cod-lime-sheet.jpg)

## Run it
```bash
npm run editor                      # pick "akked-tick (example)" → Variants tab → click a look
seekframe render akked-tick --version v2-counter-deep --fps 30
seekframe matrix akked-tick,akked-tick-ar --versions --fps 30        # all six variants
seekframe review akked-tick     # contact sheets, contrast, overflow, flashing, per version
seekframe sync akked-tick       # generated sound vs picture
```

## What's in the folder
- `film.js`: scenes, params (hook-dependent), **cues** (the sound, per hook), build and seek. `film.css`: styles. `film.html`: includes the runtime and brand kit.
- `brand/`: `brand.json` + generated `brand.css/js`. **The Thmanyah Sans font files are not in the repo** (its licence forbids redistribution; get them from
  [Thmanyah](https://ask.thmanyah.com/hc/en-001/articles/45993930027281-Thmanyah-Font-for-Everyone) and put them in `brand/fonts/` named `thmanyah-*.woff2`, see `brand.json`).
  Without them the film falls back to the bundled Inter / IBM Plex Sans Arabic, so text widths differ slightly: run `review` and look.
- `projects/*.json`: the three saved versions. `../akked-tick-ar/film.html`: the Arabic page (same code, `FILM_LANG='ar'`).
- [`brief.md`](brief.md): style analysis of reference videos and the scene-by-scene script. [`prompt.md`](prompt.md): how it was prompted. [`notes.md`](notes.md): **what went wrong and how it was fixed**.

The Akked name, logo and wordmark are © Akked and are included only in this example. The code is MIT like the rest of the repo.

# Changelog

## Unreleased
- **ffmpeg is optional**: `ffmpeg-static` moved to `optionalDependencies` (still installed by default). `npm install --omit=optional` skips the download and uses your own ffmpeg; `SEEKFRAME_FFMPEG` points at a specific binary. `doctor` and the error messages say which one is used. README and SECURITY.md explain what is downloaded and why scanners flag it.

## 0.3.0
**Upgrading from 0.2.x:** nothing breaks (films, saved versions and CLI flags are unchanged; everything new is optional). Existing workspaces keep 0.2.x until you run `npm install seekframe@latest` in them.

- **Motion kit** (quality plan phase 2): `SF.timeline()` with `rise`, `exit`, `pop`, `type`, `count`, `press`, `fly`, `morph`, `reveal`, `camera`; each registers its own sound on the same frame. `SF.ui` (pill, card, chips, browser, phone, composer, counter, ticker, logo, blobs) and `SF.canvas` (one design per aspect ratio). New example `seekframe-kit-demo` ("Lumen", craft score 95, no sync warnings). `critique` also flags a constant noise bed and machine-gun sound bursts. Fixed: a film that declares its animation only through `timeline` had its kit cues duplicated each time params were applied (doubled, phasing sounds). See docs/MOTION.md.
- **Project file in the editor**: Export tab buttons **Export project** and **Import project…** (the whole film as one `.seekframe.tgz`: scenes, brand kit, saved versions, uploads); asks for a new name if the film already exists.
- **Craft review**: `seekframe critique <film>` (also `review --craft`, MCP `critique_film`) scores how good a film is, not just whether it is correct: readability, occupancy, hierarchy, pacing, motion, entrances, transitions, sound coverage, sync and loudness, with a ranked fix list. Opt-outs need a reason and cost points. See docs/CRAFT.md.

## 0.2.0
- **TypeScript**: sources in `src/`, built with esbuild, type-checked with `tsc`; tests compile from TypeScript.
- **Workspace mode**: `seekframe init`, `doctor`, `copy`; films find the runtime in the package; `create-seekframe` bootstrapper (`npm create seekframe@latest`).
- **Editor v1**: modular app, undo/redo, version history, render queue, cue waveform with snapping, EN/AR interface with RTL, keyboard shortcuts and tab accessibility, Brand panel, new-film wizard and setup checks.
- **Security**: the local server only answers allowed Host names and rejects cross-origin or header-less writes; read-only films cannot be changed through the API; see SECURITY.md.
- **Brand**: raster logos are kept as-is when SVG tracing would be unreadable or huge; better palette role detection (paper/ink/accent/muted).
- **Editor saves** store only what differs from the film's defaults.
- **Distribution**: Dockerfile, devcontainer, reusable render Action, docs site on GitHub Pages.
- **Examples**: the client example film (and its Arabic page) is removed from the starter samples; the gallery is the Seekframe launch film and the feature tour. They stay in git history.
- **New launch film** (`examples/seekframe-launch`): 3 hooks × 4 looks, agent ticker, MCP prompt, generate-and-check, editor, variants wall, halftone logo reveal built dot by dot, and a sound-effects-only design (whooshes, hits, typing, clicks). Feature-tour moved to `examples/`.
- **Sound engine**: realistic keyboard typing (`key`: click, thock and release, heavier space bar), `impact`, `reverse`, `glitch`, and optional music instruments (`hat`, `clap`, `bass`, `chord` with side-chain pump, `keys`); `soundtrack` can depend on params.
- **Editor**: the Audio tab shows the sound style (params with `group: 'sound'`, the theme and loudness); Variants thumbnails render from one warm page per film and are pre-rendered after the film loads.
- **Real logos and images** in the launch film (agent logos, a photo in the editor preview, your own logo and wordmark); the New film dialog's brand checkbox now works (it was disabled and ignored), is aligned, and shows a hint when there is no brand kit yet.
- **Docs site** redesigned: logo, hero film, editor section with real screenshots, how it works, variants (`site/img/`).
- **Recorded sounds**: a `sample` cue plays an audio file from the film folder (mp3, wav, ogg, m4a) with gain, pan, rate, trim, fades and channel flip, in the same score as the synthesized sounds; the Menastk v2 film uses ElevenLabs effects this way.
- **Share films**: `seekframe pack <film>` and `seekframe import <file>` (one `.seekframe.tgz` with the brand kit, saved versions and uploads; runtime paths adapt to a clone or a workspace).
- `npm run site` builds and serves the docs site locally (the Pages workflow uses the same script).
- **Contract**: `poster` frame (the editor opens there instead of a blank frame 0); `data-sf-ticker` skips the overflow check for scrolling text; the validator counts params that only change the sound.
- **First run**: the editor opens your last film, then your own films, then the launch example; `allowScripts` approves the install scripts of `esbuild` and `ffmpeg-static` (npm 11 warns about, and will block, unreviewed ones).

## 0.1.0: first public release
- Film contract (`docs/FILM_SPEC.md`), JSON schema, validator (determinism, params, cues, flashing), scaffolder, blank template.
- Runtime (`SF.define`, kinetic type, layout, RTL helpers, stroke logos, brand params, cues).
- Browser editor: scenes (reorder, duplicate, delete, stretch, trim), typed params, **Variants** tab, audio (generated score + files), versions, export.
- Renderer: parallel Playwright workers + ffmpeg, retimed audio. CLI: `render`, `matrix`.
- Brand kit: palette, PNG/JPG → SVG, centre-line stroke extraction, fonts with licence handling, generated CSS.
- Sound engine: cue-driven score, themes (deep, bright, minimal), RTL panning, loudness mastering; `sync` checks cues against the picture.
- `review`: contact sheets, text overflow, WCAG contrast (measured from pixels), flashing per version.
- MCP server with 13 tools (images returned for review); agent entry files for Claude, Codex, Cursor, opencode, Copilot.
- Examples: a client film (EN + Arabic RTL, 3 hooks × 3 styles × 2 card shapes).

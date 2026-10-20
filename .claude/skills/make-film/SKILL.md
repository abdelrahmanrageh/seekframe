---
name: make-film
description: Create or modify a Seekframe film (HTML animation film that opens in the Seekframe editor and renders to MP4). Use when asked to make, generate, adapt, localise, or fix a video/film/motion piece in this repo.
---

1. Read `docs/FILM_SPEC.md` fully (and `docs/RUNTIME.md`); skim `templates/blank/film.js`.
2. Brand: if `brand/brand.json` is missing run `seekframe brand init` and, given a logo, `brand palette --write` and `brand import-logo --strokes` (prompt: `llm/prompts/01-brand-intake.md`).
3. Plan scenes (3–15, 1–8 s, self-contained), the three hooks if asked for variants, and every param a person might change (`llm/prompts/03-brief-to-script.md`).
4. `seekframe new <name> --width W --height H`; implement with `SF.define`: PURE `seek`, params (prefer `cssVar`, `...SF.brandParams()`), `cues` on the animation's frames, local assets only.
5. Loop: `seekframe validate <name>` → `seekframe review <name>` and READ the contact-sheet images → `seekframe sync <name>` → `seekframe critique <name>` and fix its list from the top until the score is 80 or more (docs/CRAFT.md). Fix every failure; read every warning; never weaken a check.
6. Variants: `variants.presets`, saved versions (`set_params`), `seekframe matrix <name> --versions --fps 30`. RTL: `docs/RTL.md`, `llm/prompts/07-localise-rtl.md`.
7. Clean up test `projects/` and `uploads/`. Report: film id, scenes, params, versions, measured flashes/s, worst contrast left, render command.

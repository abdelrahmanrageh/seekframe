# Seekframe workspace: instructions for AI coding agents

Seekframe makes short videos as **HTML films** (animation drawn by code), with a browser editor and an MP4 renderer.
You are probably here to build or change a film. Follow this file; it works for Claude Code, Codex, Cursor, opencode, Copilot and any agent that reads `AGENTS.md`.

## Do this
1. **Read `{{DOCS}}/FILM_SPEC.md` completely** (MCP: `read_docs`). It is the contract. Then skim `{{PKG}}/templates/blank/film.js` and `{{DOCS}}/RUNTIME.md`.
2. Scaffold: `seekframe new <name> --width W --height H` (MCP: `create_film`). Brand kit in `brand/` is copied in. (Run it as `npx seekframe …` in this folder.)
3. Write `films/<name>/film.js` with `SF.define({...})`: scenes, **params for everything a person might change**, **cues for sound**, `build`, `seek`.
4. Loop until clean: `seekframe validate <name>` → `seekframe review <name>` → **open and look at the contact-sheet images** → `seekframe sync <name>` → `seekframe critique <name>`: fix its list from the top until the score is 80 or more.
5. Variants: presets + saved versions (`set_params`), `seekframe matrix <name> --versions`. Export: `seekframe render <name> --fps 60`.

## Hard rules
- **`seek(frame)` is a pure function of the frame number.** No `Date.now`, `Math.random`, timers, `requestAnimationFrame`, CSS animation/transition, or state that survives between calls. Use `SF.hash`.
- Everything local: no CDN, no network, fonts/images from the film folder. Do not commit fonts with restrictive licences (the brand kit handles fallbacks).
- Expose wording, colours, sizes, images, switches as manifest **params** (prefer `cssVar` params). Defaults must equal what the code does.
- Sound: declare **cues on the same frames you animate on** (`SF.cues()`); never hand-time a separate audio file to the animation.
- Never weaken a check to make it pass. A passing validator does not mean the film looks good: **look at the images**.
- Never commit third-party videos/stills used as references. Commit only your written analysis.
- Don't hand-edit `films/*/projects/*.json` (use the editor or `set_params`); don't overwrite files in `output/` you didn't create.

## Commands (CLI `seekframe`; same as MCP tools)
`editor` · `list` · `new` · `validate` · `review` · `render` · `matrix` · `sound` · `sync` · `brand init|palette|import-logo|add-font|build` · `mcp`.
Setup once: `npm install && npx playwright install chromium`. Tests: `npm test`.

## Layout
`films/` your films · `brand/` your brand kit · `output/` renders (git-ignored) · gallery and templates are inside `{{PKG}}/` (read `{{PKG}}/examples/seekframe-launch`).

More: `{{DOCS}}/LLM.md` (setup per tool, MCP), `llm/prompts/` (copy-paste prompts), `{{DOCS}}/RTL.md`, `{{DOCS}}/SOUND.md`, `{{DOCS}}/VARIANTS.md`, `{{DOCS}}/ACCESSIBILITY.md`.

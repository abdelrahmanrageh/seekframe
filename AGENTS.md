# Seekframe: instructions for AI coding agents

Seekframe makes short videos as **HTML films** (animation drawn by code), with a browser editor and an MP4 renderer.
You are probably here to build or change a film. Follow this file; it works for Claude Code, Codex, Cursor, opencode, Copilot and any agent that reads `AGENTS.md`.

## Do this
1. **Read `docs/FILM_SPEC.md` completely** (MCP: `read_docs`). It is the contract. Then skim `templates/blank/film.js` and `docs/RUNTIME.md`.
2. Scaffold: `seekframe new <name> --width W --height H` (MCP: `create_film`). Brand kit in `brand/` is copied in. (In a clone run `npm link` once to get the `seekframe` command, or use `node bin/seekframe.js …`.)
3. Write `films/<name>/film.js` with `SF.define({...})`: scenes, **params for everything a person might change**, `build`, and the animation. Prefer the motion kit (`timeline(T, v)` with `T.rise`, `T.type`, `T.pop`…: picture and sound declared once, see [docs/MOTION.md](docs/MOTION.md) and `examples/seekframe-kit-demo`); otherwise write `seek` and **cues** by hand.
4. Loop until clean: `seekframe validate <name>` → `seekframe review <name>` → **open and look at the contact-sheet images** → `seekframe sync <name>` → `seekframe critique <name>` (MCP `critique_film`): fix its list from the top until the score is 80 or more ([docs/CRAFT.md](docs/CRAFT.md)).
5. Variants: presets + saved versions (`set_params`), `seekframe matrix <name> --versions`. Export: `seekframe render <name> --fps 60`.

## Hard rules
- **`seek(frame)` is a pure function of the frame number.** No `Date.now`, `Math.random`, timers, `requestAnimationFrame`, CSS animation/transition, or state that survives between calls. Use `SF.hash`.
- Everything local: no CDN, no network, fonts/images from the film folder. Do not commit fonts with restrictive licences (the brand kit handles fallbacks).
- Expose wording, colours, sizes, images, switches as manifest **params** (prefer `cssVar` params). Defaults must equal what the code does.
- Sound: declare **cues on the same frames you animate on** (`SF.cues()`); never hand-time a separate audio file to the animation.
- Never weaken a check to make it pass. A passing validator does not mean the film looks good: **look at the images**.
- Never commit third-party videos/stills used as references. Commit only your written analysis.
- Don't hand-edit `films/*/projects/*.json` (use the editor or `set_params`); don't overwrite files in `output/` you didn't create.

## No client work in this repo
This repository is public. **Never commit, name or quote a client's or a platform's work**: no client names, brands, logos, copy, footage, screenshots, briefs or film folders, in code, docs, examples, tests, changelog entries, commit messages or PR text.
- A user's own films live in `films/` (git-ignored; keep it that way). Gallery films in `examples/` and starters in `templates/` are generic or about Seekframe itself.
- When a real client film inspires a change, describe the *problem* generically ("a 9:16 product film") and put only generic fixtures in the repo.
- Before every commit run `git status` and `git diff --cached --stat`; never `git add -A` or `git add .` here. If a name slipped in, fix it before pushing (history rewrites are painful).
- Third-party sound packs and fonts are local only (see `.gitignore`).

## Commands (CLI `seekframe`; same as MCP tools)
`editor` · `list` · `new` · `validate` · `review` · `critique` · `render` · `matrix` · `sound` · `sync` · `brand init|palette|import-logo|add-font|build` · `mcp`.
Setup once: `npm install && npx playwright install chromium`. Tests: `npm test`.

## Layout
`films/` yours · `examples/` gallery (read `examples/seekframe-launch`: 3 hooks × 4 looks, image options, sound effects from cues) · `templates/blank` · `templates/glow` (a dark cinematic style: read its `STYLE.md` when asked for that look) · `brand/` kit ·
`src/{core,editor,browser,brand,sound,mcp}` the framework (TypeScript; `npm run build` → `dist/`) · `docs/` guides · `llm/prompts/` prompt library · `output/` renders.

More: `docs/LLM.md` (setup per tool, MCP), `llm/prompts/` (copy-paste prompts), `docs/RTL.md`, `docs/SOUND.md`, `docs/VARIANTS.md`, `docs/ACCESSIBILITY.md`.

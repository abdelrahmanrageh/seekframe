# Seekframe

**Brand films as code.** Your LLM writes the film. You edit it in the browser: text, colours, scene order, length, sound, variants. It renders to MP4.

| Doubt · mono | Counter · deep green | Cash on delivery · lime | Arabic · RTL |
|---|---|---|---|
| ![](examples/client-tick/preview/v1-doubt-mono.gif) | ![](examples/client-tick/preview/v2-counter-deep.gif) | ![](examples/client-tick/preview/v3-cod-lime.gif) | ![](examples/client-tick/preview/v1-doubt-mono-ar.gif) |

*One film, six variants (3 hooks × 3 styles × 2 card shapes, English + Arabic), with a generated sound design that follows each one. [Details](examples/client-tick/).*

## Why
Video tools are made for people who drag clips. LLMs are good at writing code but have no way to *see* a film or know it is broken. Seekframe gives an agent a strict contract
(a film is a pure function from frame number to picture), checks that tell it exactly what's wrong (determinism, params, text overflow, contrast, flashing, sound vs picture),
and gives the human a real editor for the last 10 %: change the wording, try another look, retime a scene, export.

- **Plain HTML/CSS/JS films, no build step**, which any model can write and any browser can open.
- **Variants built in**: hooks, styles, languages (RTL included), sizes, rendered as a matrix.
- **Sound that can't drift**: films declare *cues* on the frames they animate on; the engine renders the score (deep / bright / minimal), mirrors pan for RTL, masters to a LUFS target.
- **Brand kit**: palette + contrast, PNG/JPG logo → SVG and animatable strokes, fonts with licence handling.
- **Accessibility checks**: flashing (WCAG 2.3.1), measured text contrast, overflow.
- **Works with your agent**: `AGENTS.md`, Claude skill, Cursor rules, Copilot instructions, an **MCP server** that returns contact sheets as images, and a prompt library.

## Quickstart
```bash
git clone https://github.com/abdelrahmanrageh/seekframe && cd seekframe
npm install && npx playwright install chromium     # ffmpeg is bundled
npm link                                           # optional: `seekframe` on your PATH (else: node bin/seekframe.js)
seekframe editor                                   # http://localhost:4173/  → open the client-tick example
seekframe render client-tick --version v2-counter-deep --fps 30
```
Make your own: [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md). Use it with an LLM: [docs/LLM.md](docs/LLM.md) (Claude Code, Codex, Cursor, opencode, MCP).

## What an agent does
```
seekframe brand init / palette / import-logo      your brand kit
seekframe new spring-sale --width 1920 --height 1080
   … the agent writes films/spring-sale/film.js (scenes, params, cues) …
seekframe validate spring-sale                    contract · determinism · every param changes the picture · cues · flashing
seekframe review spring-sale                      contact sheets · overflow · contrast · flashing, for every saved version
seekframe sync spring-sale                        sound cues vs what happens on screen
seekframe matrix spring-sale --versions --fps 30  render every variant
```

## Commands
| | |
|---|---|
| `editor` | browser editor: scenes (reorder, duplicate, delete, stretch, trim), typed params, **Variants**, audio, versions, export |
| `new`, `list` | scaffold a film from `templates/blank`; list `films/` and `examples/` |
| `validate`, `review`, `sync` | the checks above |
| `render`, `matrix` | export MP4 (24/30/60 fps), one version or a whole matrix; audio re-timed to your edit |
| `sound` | render a film's generated score to wav |
| `brand` | `init` · `palette` · `import-logo` · `add-font` · `build` |
| `mcp` | MCP server (13 tools) |

## Docs
[Film spec](docs/FILM_SPEC.md) · [Runtime](docs/RUNTIME.md) · [Sound](docs/SOUND.md) · [Brand kit](docs/BRAND.md) · [Variants](docs/VARIANTS.md) · [Accessibility](docs/ACCESSIBILITY.md) · [RTL](docs/RTL.md) · [LLM guide](docs/LLM.md) · [Prompts](llm/prompts/) · [Examples](examples/) · [Roadmap](ROADMAP.md)

## How it compares
Seekframe stands on the shoulders of [Remotion](https://www.remotion.dev/), [Motion Canvas](https://motioncanvas.io/) and [Revideo](https://github.com/redotvideo/revideo), which are excellent code-first video tools for developers (React/TypeScript).
Seekframe's bet is different: films are plain HTML written by an **LLM** against a strict contract with automatic checks, and edited by a **non-developer** in a built-in editor with first-class variants, languages and sound.
If you are a developer who wants to write video in React, use those.

## Status and limits (0.1)
Clone/fork-first (workspace = repo folder); synthesised sound only (no TTS adapters yet); no captions export yet; editor accessibility not yet audited; one full example. See [ROADMAP.md](ROADMAP.md) for what's next and what we know is missing.

## Contributing, licence
[CONTRIBUTING.md](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md). Code: [MIT](LICENSE).
The *Client* name, logo and wordmark in `examples/client-tick*` are © Client and used as a showcase. Bundled fonts: Inter and IBM Plex Sans Arabic (SIL OFL 1.1, see `src/assets/fonts/`). FFmpeg binaries come from `ffmpeg-static`.

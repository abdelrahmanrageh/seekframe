# Changelog

## 0.2.0
- **TypeScript**: sources in `src/`, built with esbuild, type-checked with `tsc`; tests compile from TypeScript.
- **Workspace mode**: `seekframe init`, `doctor`, `copy`; films find the runtime in the package; `create-seekframe` bootstrapper (not yet published).
- **Editor v1**: modular app, undo/redo, version history, render queue, cue waveform with snapping, EN/AR interface with RTL, keyboard shortcuts and tab accessibility, Brand panel, new-film wizard and setup checks.
- **Security**: the local server only answers allowed Host names and rejects cross-origin or header-less writes; read-only films cannot be changed through the API; see SECURITY.md.
- **Brand**: raster logos are kept as-is when SVG tracing would be unreadable or huge; better palette role detection (paper/ink/accent/muted).
- **Editor saves** store only what differs from the film's defaults.
- **Distribution**: Dockerfile, devcontainer, reusable render Action, docs site on GitHub Pages.
- New launch film in `examples/seekframe-launch`; feature-tour moved to `examples/`.

## 0.1.0: first public release
- Film contract (`docs/FILM_SPEC.md`), JSON schema, validator (determinism, params, cues, flashing), scaffolder, blank template.
- Runtime (`SF.define`, kinetic type, layout, RTL helpers, stroke logos, brand params, cues).
- Browser editor: scenes (reorder, duplicate, delete, stretch, trim), typed params, **Variants** tab, audio (generated score + files), versions, export.
- Renderer: parallel Playwright workers + ffmpeg, retimed audio. CLI: `render`, `matrix`.
- Brand kit: palette, PNG/JPG → SVG, centre-line stroke extraction, fonts with licence handling, generated CSS.
- Sound engine: cue-driven score, themes (deep, bright, minimal), RTL panning, loudness mastering; `sync` checks cues against the picture.
- `review`: contact sheets, text overflow, WCAG contrast (measured from pixels), flashing per version.
- MCP server with 13 tools (images returned for review); agent entry files for Claude, Codex, Cursor, opencode, Copilot.
- Examples: Akked *The Tick* (EN + Arabic RTL, 3 hooks × 3 styles × 2 card shapes).

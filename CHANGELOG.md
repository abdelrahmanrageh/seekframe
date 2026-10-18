# Changelog

## 0.1.0: first public release
- Film contract (`docs/FILM_SPEC.md`), JSON schema, validator (determinism, params, cues, flashing), scaffolder, blank template.
- Runtime (`SF.define`, kinetic type, layout, RTL helpers, stroke logos, brand params, cues).
- Browser editor: scenes (reorder, duplicate, delete, stretch, trim), typed params, **Variants** tab, audio (generated score + files), versions, export.
- Renderer: parallel Playwright workers + ffmpeg, retimed audio. CLI: `render`, `matrix`.
- Brand kit: palette, PNG/JPG → SVG, centre-line stroke extraction, fonts with licence handling, generated CSS.
- Sound engine: cue-driven score, themes (deep, bright, minimal), RTL panning, loudness mastering; `sync` checks cues against the picture.
- `review`: contact sheets, text overflow, WCAG contrast (measured from pixels), flashing per version.
- MCP server with 13 tools (images returned for review); agent entry files for Claude, Codex, Cursor, opencode, Copilot.
- Examples: Client *The Tick* (EN + Arabic RTL, 3 hooks × 3 styles × 2 card shapes).

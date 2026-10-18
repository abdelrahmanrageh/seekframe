# Roadmap

**Shipped in 0.1:** the film contract + validator, runtime, editor with variants, renderer + matrix, brand kit (palette, logo → SVG and strokes, fonts),
cue-driven sound engine with themes and a sync check, `review` (contact sheets, overflow, contrast, flashing per version), MCP server, prompts and guides for
Claude / Codex / Cursor / opencode, and the Akked example (EN + Arabic).

**Known limits of 0.1**
- Clone/fork-first: the workspace is the repo folder. `npx seekframe` from an installed package (workspace = current directory) is next.
- Fixed-size films are the norm; the responsive `sizes` path works (see the blank template) but has one example only.
- Sound is synthesised (no samples); voice-over files work as tracks but there are no TTS adapters yet.
- No captions export, no audio description, editor accessibility has not been audited.
- Logo stroke extraction is assisted (review the preview); filled lettering should be revealed with a mask instead.

## Next
**0.2: editor**
- Undo/redo and a shortcut help overlay; version history with param diffs; render queue and ETA.
- Waveform and cue markers on the timeline, snap-to-cue when resizing scenes; safe-area overlay; size switcher.
- Brand panel (edit `brand.json`, propagate to films); live text-overflow warnings on fields.
- Accessibility audit of the editor (labels, focus, reduced motion), light theme, editor i18n including RTL.

**0.3: the LLM loop**
- Frame comments in the editor (`@frame 412: logo too small`) exportable as a task list for an agent; optional "ask the model" button with your own API key.
- More examples with prompt + result + what went wrong: vertical app promo, logo sting, data story, event countdown.
- `npx seekframe` / `create-seekframe`: workspace = current directory; devcontainer / Codespaces; Docker image for identical renders.

**0.4: output**
- Captions (SRT/VTT) from text params and voice-over lines; TTS adapters (ElevenLabs, OpenAI, Piper) tied to scene ids; audio-description track.
- Resume and per-scene frame cache; ProRes/WebM/GIF/alpha output; poster images; GitHub Action to render a matrix on push.
- Sound themes contributed by the community; sample-based instruments (optional).

**Later:** plugin param types (charts, maps), collaboration/hosted mode, TypeScript types for the manifest.

## Decisions on record
- MIT licence; the code never bundles GPL code. FFmpeg comes from `ffmpeg-static` (GPL-licensed binaries; use your own ffmpeg if that matters to you).
- Examples use brands the author owns (Akked) or fictional ones. Fonts with restrictive licences are never committed.
- Reference footage from other brands is analysed locally and never committed.

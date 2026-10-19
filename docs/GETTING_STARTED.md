# Getting started (10 minutes)

Clone the repo (the npm packages are not published yet):

```bash
git clone https://github.com/abdelrahmanrageh/seekframe && cd seekframe
npm install && npx playwright install chromium
node bin/seekframe.js doctor      # checks Node, Chromium and ffmpeg
npm run editor
```

`seekframe init <dir>` creates a separate workspace (films/, brand/, agent files) that uses Seekframe as a dependency; it needs the package to be installable, so use it after the first npm release. Gallery films in `examples/` can be copied into `films/` with `seekframe copy <film>`.
1. **Look around**: Scenes tab (reorder ↑↓, duplicate ⧉, delete ✕, change length, trim), Style tab, **Variants** tab, Audio tab (the score is generated),
   Export tab (24/30/60 fps). Drag the right edge of a scene on the timeline to change its length; the sound follows.
2. **Render from the terminal**: `seekframe render client-tick --version v2-counter-deep --fps 30`
3. **Make your own film**:
   ```bash
   seekframe brand init --name "Acme" && seekframe brand palette logo.png --write && seekframe brand import-logo logo.png --strokes
   seekframe new spring-sale --width 1920 --height 1080
   ```
   Or use the editor's **Brand** tab and **New film** wizard for the same setup without terminal commands.
   Then ask your agent (see [LLM.md](LLM.md)): *"Read docs/FILM_SPEC.md and build films/spring-sale as a 20 s product reveal for Acme using the brand kit; expose all text and colours as params; run validate and review and fix everything."*
4. **Check and export**: `seekframe validate spring-sale` · `seekframe review spring-sale` · `seekframe render spring-sale --fps 60`.

Folders: `films/` (yours) · `examples/` (gallery) · `templates/blank` · `brand/` (your kit) · `output/` (renders, git-ignored).

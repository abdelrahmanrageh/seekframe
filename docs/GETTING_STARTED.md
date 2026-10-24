# Getting started (10 minutes)

```bash
npm create seekframe@latest my-films
cd my-films && npx playwright install chromium
npx seekframe doctor      # checks Node, Chromium and ffmpeg (no ffmpeg? install it, or see README: "What gets installed")
npx seekframe editor
```

This creates a workspace (films/, brand/, agent files) that uses the `seekframe` npm package as a dependency (`seekframe init <dir>` does the same). To hack on Seekframe itself, clone the repo instead: `git clone https://github.com/abdelrahmanrageh/seekframe && cd seekframe && npm install && npm run editor`. Gallery films in `examples/` can be copied into `films/` with `seekframe copy <film>`.
1. **Look around**: Scenes tab (reorder ↑↓, duplicate ⧉, delete ✕, change length, trim), Style tab, **Variants** tab, Audio tab (the score is generated),
   Export tab (24/30/60 fps). Drag the right edge of a scene on the timeline to change its length; the sound follows.
2. **Render from the terminal**: `seekframe render seekframe-launch --params "hook=clock,look=electric" --fps 30`
3. **Make your own film**:
   ```bash
   seekframe brand init --name "Acme" && seekframe brand palette logo.png --write && seekframe brand import-logo logo.png --strokes
   seekframe new spring-sale --width 1920 --height 1080
   ```
   Or use the editor's **Brand** tab and **New film** wizard for the same setup without terminal commands.
   Then ask your agent (see [LLM.md](LLM.md)): *"Read docs/FILM_SPEC.md and build films/spring-sale as a 20 s product reveal for Acme using the brand kit; expose all text and colours as params; run validate and review and fix everything."*
4. **Check and export**: `seekframe validate spring-sale` · `seekframe review spring-sale` · `seekframe render spring-sale --fps 60`.

**Share a film:** `seekframe pack <film>` writes `output/<film>.seekframe.tgz` (the film, its brand kit and fonts, saved versions and uploads).
The other person runs `seekframe import <file>` and opens it in the editor to keep editing and export it.
In the editor, the Export tab has the same thing as buttons: **Export project** downloads the file, **Import project…** opens one.

Folders: `films/` (yours) · `examples/` (gallery) · `templates/blank` and `templates/glow` (a ready-made style: `seekframe new x --template glow`) · `brand/` (your kit) · `output/` (renders, git-ignored).

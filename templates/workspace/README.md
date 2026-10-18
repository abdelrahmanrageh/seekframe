# {{NAME}}

A [Seekframe](https://github.com/abdelrahmanrageh/seekframe) workspace: brand films as code.

```bash
npm install
npx seekframe doctor          # check Node, Chromium, ffmpeg
npx seekframe editor          # http://localhost:4173/  (Brand tab: logo, colours, fonts; New film button)
npx seekframe new my-film --width 1920 --height 1080
npx seekframe validate my-film && npx seekframe review my-film
npx seekframe render my-film --fps 60
```

Use an AI agent: open this folder in Claude Code, Codex, Cursor or opencode; `AGENTS.md` tells it how. MCP server: `npx seekframe mcp`.

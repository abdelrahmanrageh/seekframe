# Using Seekframe with your LLM

Seekframe works with any coding agent that can read files and run shell commands, and with any MCP client. The agent writes the film
(`films/<name>/film.js`) following [FILM_SPEC.md](FILM_SPEC.md); Seekframe's tools tell it what is wrong; you edit and export in the browser.

## The loop an agent should follow
1. **Read** `docs/FILM_SPEC.md` (MCP: `read_docs`).
2. **Intake**: brand kit (`seekframe brand init`, `palette`, `import-logo`), a brief (`llm/prompts/03-brief-to-script.md`).
3. **Scaffold** `seekframe new <name> --width W --height H` (MCP: `create_film`).
4. **Write** scenes, params, cues in `film.js`.
5. **Check**: `validate` → `review` (look at the contact sheet!) → `sync`. Fix, repeat.
6. **Variants**: presets + `matrix`. **Localise** (RTL guide). **Export** `render`.

## Setup per tool

| Tool | Instructions it reads | Notes |
|---|---|---|
| **Claude Code** | `CLAUDE.md` (imports `AGENTS.md`) and `.claude/skills/make-film` | `claude mcp add seekframe -- node /abs/path/seekframe/bin/seekframe.js mcp` |
| **Codex CLI** | `AGENTS.md` | `~/.codex/config.toml`: `[mcp_servers.seekframe]` `command = "node"` `args = ["/abs/path/seekframe/bin/seekframe.js", "mcp"]` |
| **Cursor** | `.cursor/rules/seekframe.mdc` | `.cursor/mcp.json`: `{"mcpServers":{"seekframe":{"command":"node","args":["/abs/path/seekframe/bin/seekframe.js","mcp"]}}}` |
| **opencode** | `AGENTS.md` | `opencode.json`: `{"mcp":{"seekframe":{"type":"local","command":["node","/abs/path/seekframe/bin/seekframe.js","mcp"]}}}` |
| **GitHub Copilot** | `.github/copilot-instructions.md` | |
| **Claude Desktop / any MCP client** | – | add the same stdio command to the client's MCP config |
| **ChatGPT / chat UIs** | paste `AGENTS.md` + `docs/FILM_SPEC.md` + one prompt from `llm/prompts/` | no shell access: ask for the files, save them, run the commands yourself |

Use the absolute path of your clone (`npm run mcp-path` prints it). The MCP server only touches this workspace (`films/`, `brand/`, `output/`).

## MCP tools
`read_docs` · `list_films` · `get_film` · `create_film` · `validate_film` · `review_film` (returns contact-sheet images) · `render_stills` (images) ·
`set_params` (save a version) · `render_film` · `check_sound_sync` · `generate_score` · `brand_palette` · `brand_import_logo`.

## Prompt library (`llm/prompts/`)
Copy-paste prompts, in the order you use them: `01-brand-intake` · `02-style-from-references` · `03-brief-to-script` · `04-script-to-film` ·
`05-variants` · `06-sound-design` · `07-localise-rtl` · `08-review-and-fix`. Worked examples with the real prompt, the result and what the model got wrong:
[`examples/`](../examples/README.md).

## Tips that save hours
- Give the model the **brand kit and a reference description**, not "make it look premium".
- Ask it to **expose every wording and look choice as a param** so you can change it without the model.
- Make it **run `review` and read the contact sheet** every iteration; most layout bugs (overflow, contrast, RTL) are visible there.
- Keep references (other brands' videos) **local**, never commit them; only commit your written analysis.

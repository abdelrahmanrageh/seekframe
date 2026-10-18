// seekframe CLI. Keep this file thin: each command lives in its own module and is loaded on demand.
const fs = require('fs'), path = require('path');
const { ROOT, resolveFilm, listFilms, slug } = require('./core/workspace.js');

const HELP = `Seekframe — brand films as code.

  seekframe editor [--port 4173]                      open the browser editor
  seekframe list                                      list films (films/ and examples/)
  seekframe new <name> [--width W --height H --fps N] [--brand dir]
                                                      scaffold films/<name> from templates/blank
  seekframe validate <film> [--fast] [--no-flash] [--stills dir]
                                                      contract + determinism + params + accessibility checks
  seekframe review <film> [--version v | --all] [--out dir]
                                                      stills, contact sheets, text-overflow and contrast report
  seekframe render <film> [--version v] [--params k=v,...] [--fps 60] [--size WxH] [--out file.mp4]
  seekframe matrix <film[,film2]> [--axes hook=*,theme=a|b] [--versions] [--fps 30] [--size WxH]
                                                      render every combination of variant options
  seekframe sound <film> [--version v] [--out file.wav]   generate the score from the film's cues
  seekframe sync <film> [--version v]                 check cues against the generated audio (and picture)
  seekframe brand init|import-logo|palette|add-font|build ...   brand kit tools (seekframe brand --help)
  seekframe mcp                                       start the MCP server (stdio) for Claude, Codex, Cursor, opencode

<film> is an id (akked-tick) or a path (examples/akked-tick).`;

function parse(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) { const k = t.slice(2); const nx = argv[i + 1]; if (nx === undefined || nx.startsWith('--')) a[k] = true; else { a[k] = nx; i++; } }
    else a._.push(t);
  }
  return a;
}
const need = (a, what = 'film') => { const f = resolveFilm(a._[1]); if (!f) { console.error(a._[1] ? `Unknown ${what}: ${a._[1]}\nAvailable: ${listFilms().map(x => x.id).join(', ') || '(none)'}` : `Usage: seekframe ${a._[0]} <${what}>`); process.exit(2); } return f; };

async function main(argv) {
  const a = parse(argv), cmd = a._[0];
  if (!cmd || cmd === 'help' || a.help && !['brand'].includes(cmd)) { console.log(HELP); return; }
  switch (cmd) {
    case 'list': { for (const f of listFilms()) console.log(`${f.id.padEnd(28)} ${f.root}/${f.id}`); return; }
    case 'editor': { await require('./editor/server.js').start(+a.port || undefined); return; }
    case 'new': return require('./core/scaffold.js').scaffold(a);
    case 'validate': {
      const f = need(a); const { validate } = require('./core/validate.js');
      const r = await validate(f.dir, { fast: !!a.fast, stills: a.stills, flash: !a['no-flash'] });
      process.exit(r.fail.length ? 1 : 0);
    }
    case 'review': { const f = need(a); const r = await require('./core/review.js').review(f, { version: a.version, all: !!a.all, out: a.out, log: console.log }); process.exit(r.fail ? 1 : 0); }
    case 'render': return require('./core/matrix.js').renderCmd(need(a), a);
    case 'matrix': return require('./core/matrix.js').matrixCmd(a);
    case 'sound': return require('./sound/score.js').soundCmd(need(a), a);
    case 'sync': { const r = await require('./sound/sync.js').sync(need(a), { version: a.version, log: console.log }); process.exit(r.fail ? 1 : 0); }
    case 'brand': return require('./brand/index.js').brandCmd(a);
    case 'mcp': return require('./mcp/server.js').start();
    default: console.error(`Unknown command: ${cmd}\n`); console.log(HELP); process.exit(2);
  }
}
module.exports = { main, parse, ROOT, slug };

// seekframe CLI. Keep this file thin: each command lives in its own module and is loaded on demand.
import path from 'node:path';
import { resolveFilm, listFilms } from './core/workspace';
import type { FilmRef } from './types';

const HELP = `Seekframe — brand films as code.

  seekframe editor [--port 4173]                      open the browser editor
  seekframe init [dir]                                set up a workspace (films/, brand/, agent files) in a folder
  seekframe doctor                                    check that Node, Chromium and ffmpeg are ready
  seekframe list                                      list films (films/ and examples/)
  seekframe new <name> [--width W --height H --fps N] [--brand dir]
                                                      scaffold films/<name> from templates/blank
  seekframe copy <film> [new-name]                    copy a gallery film into films/ so you can edit it
  seekframe pack <film> [--out file.tgz]              pack a film (brand, versions, uploads) to share with someone
  seekframe import <file.tgz> [name] [--force]        unpack a shared film into films/ to keep editing and export it
  seekframe validate <film> [--fast] [--no-flash] [--stills dir]
                                                      contract + determinism + params + accessibility checks
  seekframe review <film> [--version v | --all] [--out dir] [--craft [--min-score N] [--no-sound]]
  seekframe critique <film> [--version v] [--min-score N] [--no-sound]   craft score + fix list only (what review --craft adds)
                                                      stills, contact sheets, text-overflow and contrast report
  seekframe render <film> [--version v] [--params k=v,...] [--fps 60] [--size WxH] [--out file.mp4]
  seekframe matrix <film[,film2]> [--axes hook=*,theme=a|b] [--versions] [--fps 30] [--size WxH]
                                                      render every combination of variant options
  seekframe sound <film> [--version v] [--out file.wav]   generate the score from the film's cues
  seekframe sync <film> [--version v]                 check cues against the generated audio (and picture)
  seekframe brand init|import-logo|palette|add-font|build ...   brand kit tools (seekframe brand --help)
  seekframe mcp                                       start the MCP server (stdio) for Claude, Codex, Cursor, opencode

<film> is an id (seekframe-launch) or a path (examples/seekframe-launch).`;

export interface Args { _: string[]; [flag: string]: string | boolean | string[] }
export function parse(argv: string[]): Args {
  const a: Args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) { const k = t.slice(2); const nx = argv[i + 1]; if (nx === undefined || nx.startsWith('--')) a[k] = true; else { a[k] = nx; i++; } }
    else a._.push(t);
  }
  return a;
}
const need = (a: Args, what = 'film'): FilmRef => {
  const f = resolveFilm(a._[1]);
  if (!f) { console.error(a._[1] ? `Unknown ${what}: ${a._[1]}\nAvailable: ${listFilms().map(x => x.id).join(', ') || '(none)'}` : `Usage: seekframe ${a._[0]} <${what}>`); process.exit(2); }
  return f;
};

export async function main(argv: string[]): Promise<void> {
  const a = parse(argv), cmd = a._[0];
  if (!cmd || cmd === 'help' || (a.help && cmd !== 'brand')) { console.log(HELP); return; }
  switch (cmd) {
    case 'list': { for (const f of listFilms()) console.log(`${f.id.padEnd(28)} ${f.root}/${f.id}`); return; }
    case 'editor': { const { start } = await import('./editor/server'); await start(+(a.port as string) || undefined); return; }
    case 'init': { const { initWorkspace } = await import('./core/init'); initWorkspace(String(a._[1] || '.')); return; }
    case 'doctor': { const { doctor, printDoctor } = await import('./core/doctor'); const r = await doctor(); printDoctor(r); process.exit(r.ok ? 0 : 1); }
    case 'copy': { const f = need(a); const { copyFilm } = await import('./core/scaffold'); try { const r = copyFilm(f.dir, String(a._[2] || f.id + '-copy')); console.log(`Copied to films/${r.id}. Open it with: seekframe editor`); } catch (e: any) { console.error(e.message); process.exit(1); } return; }
    case 'pack': { const f = need(a); const { pack } = await import('./core/share'); try { const out = pack(f.dir, f.id, a.out as string); console.log(`Packed ${f.id} -> ${path.relative(process.cwd(), out)}\nSend this file; the other person runs: npx seekframe import ${path.basename(out)}`); } catch (e: any) { console.error(e.message); process.exit(1); } return; }
    case 'import': { const file = String(a._[1] || ''); if (!file) { console.error('usage: seekframe import <file.tgz> [name] [--force]'); process.exit(1); } const { importPack } = await import('./core/share'); try { const r = importPack(file, a._[2] ? String(a._[2]) : undefined, !!a.force); console.log(`Imported films/${r.id}. Open it with: seekframe editor`); } catch (e: any) { console.error(e.message); process.exit(1); } return; }
    case 'new': { const { scaffold } = await import('./core/scaffold'); return scaffold(a); }
    case 'validate': {
      const f = need(a); const { validate } = await import('./core/validate');
      const r = await validate(f.dir, { fast: !!a.fast, stills: a.stills as string, flash: !a['no-flash'] });
      process.exit(r.fail.length ? 1 : 0);
    }
    case 'review': { const f = need(a); const { review } = await import('./core/review'); const r = await review(f, { version: a.version as string, all: !!a.all, out: a.out as string, log: console.log }); let bad = r.fail > 0;
      if (a.craft) { const { craft } = await import('./core/craft'); const c = await craft(f, { version: a.version as string, out: a.out as string, sound: !a['no-sound'], log: console.log }); if (a['min-score'] != null && c.score < Number(a['min-score'])) { console.error(`Craft score ${c.score} is below --min-score ${a['min-score']}`); bad = true; } }
      process.exit(bad ? 1 : 0); }
    case 'critique': { const f = need(a); const { craft } = await import('./core/craft'); const c = await craft(f, { version: a.version as string, out: a.out as string, sound: !a['no-sound'], log: console.log }); if (a['min-score'] != null && c.score < Number(a['min-score'])) { console.error(`Craft score ${c.score} is below --min-score ${a['min-score']}`); process.exit(1); } return; }
    case 'render': { const { renderCmd } = await import('./core/matrix'); return renderCmd(need(a), a); }
    case 'matrix': { const { matrixCmd } = await import('./core/matrix'); return matrixCmd(a); }
    case 'sound': { const { soundCmd } = await import('./sound/score'); return soundCmd(need(a), a); }
    case 'sync': { const { sync } = await import('./sound/sync'); const r = await sync(need(a), { version: a.version as string, log: console.log }); process.exit(r.fail ? 1 : 0); }
    case 'brand': { const { brandCmd } = await import('./brand/index'); return brandCmd(a); }
    case 'mcp': { const { start } = await import('./mcp/server'); return start(); }
    default: console.error(`Unknown command: ${cmd}\n`); console.log(HELP); process.exit(2);
  }
}

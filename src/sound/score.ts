// Generates a film's score from its cues:  seekframe sound <film> [--version v] [--out file.wav]
import fs from 'node:fs';
import path from 'node:path';
import { openFilm } from '../core/render';
import { renderToFile, THEMES } from './engine';




async function renderScore({ manifest, theme = 'deep', out, rtl = false }: { manifest: any; theme?: string; out: string; rtl?: boolean }) {
  const seconds = manifest.duration / manifest.fps;
  return renderToFile(manifest.cues || [], { fps: manifest.fps, seconds, theme, rtl, out, dir: manifest.dir || '', loudness: (manifest.soundtrack && manifest.soundtrack.loudness) ?? -16 });
}
async function soundCmd(film, a) {
  const pf = path.join(film.dir, 'projects', (a.version || 'default') + '.json'), project = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : {};
  const { browser, manifest } = await openFilm(film.dir, project); await browser.close();
  if (!manifest.cues || !manifest.cues.length) { console.error(`${film.id} declares no cues (manifest.cues). See docs/SOUND.md.`); process.exit(1); }
  const theme = a.theme || (manifest.soundtrack && manifest.soundtrack.theme) || 'deep'; if (!THEMES[theme]) { console.error(`unknown theme ${theme}. Available: ${Object.keys(THEMES).join(', ')}`); process.exit(2); }
  const out = path.resolve(a.out || path.join('output', `${film.id}-${a.version || 'default'}-score.wav`)); fs.mkdirSync(path.dirname(out), { recursive: true });
  const r = await renderScore({ manifest, theme, out, rtl: !!(manifest.lang && manifest.lang.rtl) });
  console.log(`${path.relative(process.cwd(), out)}  (${manifest.cues.length} cues, theme ${theme}, input ${r.inputLUFS} LUFS → ${(manifest.soundtrack && manifest.soundtrack.loudness) ?? -16}, LRA ${r.lra})`);
}
export { renderScore, soundCmd };

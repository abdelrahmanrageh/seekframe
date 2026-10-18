// seekframe brand <init|import-logo|palette|add-font|build>   (thin CLI over ./kit)
import fs from 'node:fs';
import path from 'node:path';
import type { Args } from '../cli';
import { build } from './build';
import { palette, roles } from './palette';
import { PAIRS, contrastHex, grade } from '../core/color';
import { addFont, importLogo, initBrand, readBrand, writeBrand, defaultBrandDir } from './kit';

const HELP = `seekframe brand — your brand kit lives in brand/ (brand.json + assets). Films read it through brand/brand.css and brand/brand.js.
(The editor has the same tools in its Brand tab.)

  brand init [--dir brand] [--name "Acme"]        create brand/brand.json and build it
  brand import-logo <png|jpg|svg> [--strokes] [--colors 3] [--dir brand]
                                                  trace to SVG; --strokes also extracts animatable centre-line strokes (logo-strokes.json)
  brand palette <image> [--k 5] [--write]         extract colours, suggest accent/ink/paper/muted, print WCAG contrast; --write saves them
  brand add-font <file> --family "Name" [--weight 400 | "600 700"] [--role display|text|both] [--license "..."] [--no-redistribute]
  brand build [--dir brand]                       regenerate brand.css and brand.js from brand.json`;

export async function brandCmd(a: Args): Promise<void> {
  const sub = a._[1], dir = path.resolve(String(a.dir || defaultBrandDir())), rel = (p: string) => path.relative(process.cwd(), p);
  if (!sub || a.help) { console.log(HELP); return; }
  switch (sub) {
    case 'init': { initBrand(dir, a.name as string); console.log(`Brand kit ready in ${rel(dir)}/ (fonts: bundled Inter + IBM Plex Sans Arabic).\nNext: seekframe brand import-logo logo.png --strokes ; seekframe brand palette logo.png --write`); return; }
    case 'build': { const r = build(dir); console.log(`built ${rel(dir)}/brand.css and brand.js (colors: ${r.colors.join(', ')}; fonts: ${r.fonts.join(', ') || 'bundled fallbacks'})`); return; }
    case 'palette': {
      const file = a._[2]; if (!file) { console.error('usage: seekframe brand palette <image>'); process.exit(2); }
      const cols = palette(file, +(a.k as string) || 5), r = roles(cols);
      console.log('Colours found:'); for (const c of cols) console.log(`  ${c.hex}  ${(c.share * 100).toFixed(0).padStart(3)}%`);
      console.log('\nSuggested roles:'); for (const [k, v] of Object.entries(r)) console.log(`  ${k.padEnd(7)} ${v}`);
      console.log('\nContrast (WCAG):'); for (const [label, x, y] of PAIRS) { const v = contrastHex((r as any)[x], (r as any)[y]); console.log(`  ${label.padEnd(22)} ${v.toFixed(2).padStart(5)}:1  ${grade(v)}`); }
      if (a.write) { const B = readBrand(dir); B.colors = { ...B.colors, ...r }; writeBrand(dir, B); console.log(`\nwritten to ${rel(path.join(dir, 'brand.json'))} and rebuilt.`); }
      return;
    }
    case 'import-logo': {
      const file = a._[2]; if (!file || !fs.existsSync(file)) { console.error('usage: seekframe brand import-logo <file> [--strokes]'); process.exit(2); }
      const r = importLogo(dir, file, { strokes: !!a.strokes, colors: +(a.colors as string) || undefined });
      console.log(`${/\.svg$/i.test(file) ? 'copied' : 'traced'} → ${rel(path.join(dir, 'assets/logo.svg'))}`);
      if (r.strokes != null) console.log(`extracted ${r.strokes} stroke(s) → assets/logo-strokes.json (+ preview logo-strokes.svg)\n  Review the preview: remove stray strokes, reorder the array to change draw order, then use SF.strokeLogo() in your film.`);
      else if (a.strokes) console.log('--strokes needs a raster logo (png/jpg); an svg should be drawn with its own paths.');
      return;
    }
    case 'add-font': {
      const file = a._[2]; if (!file || !fs.existsSync(file) || !a.family) { console.error('usage: seekframe brand add-font <file> --family "Name" [--weight 400] [--role display|text|both] [--license "..."] [--no-redistribute]'); process.exit(2); }
      const r = addFont(dir, file, { family: String(a.family), weight: String(a.weight || 400), role: a.role as any, license: a.license as string, redistributable: a['no-redistribute'] ? false : undefined });
      if (r.ignored) console.log(`! ${a.family} is marked non-redistributable: added ${r.ignored} to .gitignore so it is never committed. Films fall back to the bundled fonts for anyone who clones the repo.`);
      if (r.warning) console.log('! ' + r.warning + ' (pass --license "OFL-1.1" or --no-redistribute)');
      console.log(`added ${a.family} ${a.weight || 400}`); return;
    }
    default: console.log(HELP); process.exit(2);
  }
}

// seekframe brand <init|import-logo|palette|add-font|build>
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../core/workspace';
import { build } from './build';
import * as P from './palette';
import * as L from './logo';



const HELP = `seekframe brand — your brand kit lives in brand/ (brand.json + assets). Films read it through brand/brand.css and brand/brand.js.

  brand init [--dir brand] [--name "Acme"]        create brand/brand.json and build it
  brand import-logo <png|jpg|svg> [--strokes] [--colors 3] [--dir brand]
                                                  trace to SVG; --strokes also extracts animatable centre-line strokes (logo-strokes.json)
  brand palette <image> [--k 5] [--write]         extract colours, suggest accent/ink/paper/muted, print WCAG contrast; --write saves them
  brand add-font <file> --family "Name" [--weight 400 | "600 700"] [--role display|text|both] [--license "..."] [--no-redistribute]
  brand build [--dir brand]                       regenerate brand.css and brand.js from brand.json`;

const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJSON = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n');

async function brandCmd(a) {
  const sub = a._[1], dir = path.resolve(a.dir || 'brand'), jf = path.join(dir, 'brand.json');
  
  if (!sub || a.help) { console.log(HELP); return; }
  switch (sub) {
    case 'init': {
      fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
      if (!fs.existsSync(jf)) writeJSON(jf, { name: a.name || 'My Brand', colors: { accent: '#5B8CFF', ink: '#0F1226', paper: '#FFFFFF', muted: '#8A90A8' }, fonts: [], voice: { tone: 'calm, confident, short sentences', tagline: '' }, languages: ['en'] });
      build(dir); console.log(`Brand kit ready in ${path.relative(process.cwd(), dir)}/ (fonts: bundled Inter + IBM Plex Sans Arabic).\nNext: seekframe brand import-logo logo.png --strokes ; seekframe brand palette logo.png --write`)
    }
    case 'build': { const r = build(dir); console.log(`built ${path.relative(process.cwd(), dir)}/brand.css and brand.js (colors: ${r.colors.join(', ')}; fonts: ${r.fonts.join(', ') || 'bundled fallbacks'})`); return; }
    case 'palette': {
      const file = a._[2]; if (!file) { console.error('usage: seekframe brand palette <image>'); process.exit(2); }
      const cols = P.palette(file, +a.k || 5), r = P.roles(cols);
      console.log('Colours found:'); for (const c of cols) console.log(`  ${c.hex}  ${(c.share * 100).toFixed(0).padStart(3)}%`);
      console.log('\nSuggested roles:'); for (const [k, v] of Object.entries(r)) console.log(`  ${k.padEnd(7)} ${v}`);
      const cr = (x, y) => P.contrast(P.unhex(x), P.unhex(y)), row = (n, x, y) => { const v = cr(x, y); console.log(`  ${n.padEnd(22)} ${v.toFixed(2).padStart(5)}:1  ${v >= 7 ? 'AAA' : v >= 4.5 ? 'AA' : v >= 3 ? 'AA large text only' : 'FAILS'}`); };
      console.log('\nContrast (WCAG):'); row('ink on paper', r.ink, r.paper); row('muted on paper', r.muted, r.paper); row('accent on ink', r.accent, r.ink); row('accent on paper', r.accent, r.paper); row('ink on accent', r.ink, r.accent); row('paper on ink', r.paper, r.ink);
      if (a.write) { const B = fs.existsSync(jf) ? readJSON(jf) : { name: 'My Brand', fonts: [] }; B.colors = { ...(B.colors || {}), ...r }; fs.mkdirSync(dir, { recursive: true }); writeJSON(jf, B); build(dir); console.log(`\nwritten to ${path.relative(process.cwd(), jf)} and rebuilt.`); }
      return;
    }
    case 'import-logo': {
      const file = a._[2]; if (!file || !fs.existsSync(file)) { console.error('usage: seekframe brand import-logo <file> [--strokes]'); process.exit(2); }
      const out = path.join(dir, 'assets'); fs.mkdirSync(out, { recursive: true });
      const B = fs.existsSync(jf) ? readJSON(jf) : { name: 'My Brand', colors: {}, fonts: [] }; B.logo = B.logo || {};
      if (/\.svg$/i.test(file)) { fs.copyFileSync(file, path.join(out, 'logo.svg')); console.log('copied logo.svg'); }
      else { fs.writeFileSync(path.join(out, 'logo.svg'), L.toSVG(file, { colors: +a.colors || 6 })); console.log(`traced → ${path.relative(process.cwd(), path.join(out, 'logo.svg'))}`); }
      B.logo.svg = 'assets/logo.svg';
      if (a.strokes && !/\.svg$/i.test(file)) {
        const j = L.strokes(file, { colors: +a.colors || 3 });
        writeJSON(path.join(out, 'logo-strokes.json'), j); fs.writeFileSync(path.join(out, 'logo-strokes.svg'), L.strokesSVG(j, { bg: true }));
        B.logo.strokes = 'assets/logo-strokes.json';
        console.log(`extracted ${j.strokes.length} stroke(s) → assets/logo-strokes.json (+ preview logo-strokes.svg)\n  Review the preview: remove stray strokes, reorder the array to change draw order, then use SF.strokeLogo() in your film.`);
      } else if (a.strokes) console.log('--strokes needs a raster logo (png/jpg); an svg should be drawn with its own paths.');
      fs.mkdirSync(dir, { recursive: true }); writeJSON(jf, B); return;
    }
    case 'add-font': {
      const file = a._[2]; if (!file || !fs.existsSync(file) || !a.family) { console.error('usage: seekframe brand add-font <file> --family "Name" [--weight 400] [--role display|text|both] [--license "..."] [--no-redistribute]'); process.exit(2); }
      const B = fs.existsSync(jf) ? readJSON(jf) : { name: 'My Brand', colors: {}, fonts: [] }; fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
      const dest = 'fonts/' + path.basename(file).replace(/[^\w.\-]+/g, '_'); fs.copyFileSync(file, path.join(dir, dest));
      let f = (B.fonts = B.fonts || []).find(x => x.family === a.family); if (!f) B.fonts.push(f = { family: a.family, role: a.role || 'both', files: {} });
      f.files[String(a.weight || 400)] = dest; f.license = a.license || f.license || 'unknown'; f.redistributable = a['no-redistribute'] ? false : (f.redistributable !== false);
      writeJSON(jf, B); build(dir);
      if (!f.redistributable) { const gi = path.join(ROOT, '.gitignore'); const line = `${path.relative(ROOT, path.join(dir, dest)).split(path.sep).join('/')}`; const cur = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : ''; if (!cur.includes(line)) fs.appendFileSync(gi, `${cur.endsWith('\n') || !cur ? '' : '\n'}# non-redistributable font (${a.family})\n${line}\n`); console.log(`! ${a.family} is marked non-redistributable: added ${line} to .gitignore so it is never committed. Films fall back to the bundled fonts for anyone who clones the repo.`); }
      else if (f.license === 'unknown') console.log('! licence unknown: confirm the font may be redistributed before publishing (or pass --license "OFL-1.1" / --no-redistribute).');
      console.log(`added ${a.family} ${a.weight || 400} → ${dest}`); return;
    }
    default: console.log(HELP); process.exit(2);
  }
}
export { brandCmd };

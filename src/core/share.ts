// Share a film with someone else: `seekframe pack <film>` writes one .seekframe.tgz with the film, its brand kit, saved versions and
// uploads; `seekframe import <file>` unpacks it into films/ so they can keep editing and export it. Uses the system `tar`
// (macOS, Linux and Windows 10+ all ship one).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PKG_ROOT, slug, ensureBrands } from './workspace';
import { build as buildBrand } from '../brand/build';

const RUNTIME = /(["'])[^"']*?dist\/browser\/(runtime|timeline)\.js\1/g;
// a film's runtime path depends on where it lives (clone or workspace); store the clone form, adapt it on import
const canonical = (t: string) => t.replace(RUNTIME, (_m, q, n) => `${q}../../dist/browser/${n}.js${q}`);
const local = (t: string) => ROOT === PKG_ROOT ? t : t.replace(/\.\.\/\.\.\/dist\//g, '../../node_modules/seekframe/dist/');
const skip = (p: string) => /[\\/]\.history([\\/]|$)/.test(p) || /brand[\\/]brand\.(css|js)$/.test(p) || /\.DS_Store$/.test(p);

function tar(args: string[]): void {
  const r = spawnSync('tar', args, { encoding: 'utf8' });
  if (r.error) throw new Error('`tar` is needed to pack and import films: ' + r.error.message);
  if (r.status) throw new Error('tar failed: ' + (r.stderr || '').trim());
}

/** pack a film folder into <out> (default output/<id>.seekframe.tgz); returns the archive path */
export function pack(filmDir: string, id: string, out?: string): string {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-pack-')), dst = path.join(stage, id);
  try {
    fs.cpSync(filmDir, dst, { recursive: true, filter: p => !skip(p) });
    for (const f of fs.readdirSync(dst)) if (/\.(html|js)$/.test(f)) { const p = path.join(dst, f); fs.writeFileSync(p, canonical(fs.readFileSync(p, 'utf8'))); }
    const version = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8')).version;
    fs.writeFileSync(path.join(dst, 'SHARED.md'), `# ${id}\n\nA Seekframe film (made with Seekframe ${version}). To open it:\n\n` +
      '```bash\nnpm create seekframe@latest my-films\ncd my-films\n' +
      `npx seekframe import /path/to/${id}.seekframe.tgz\nnpx seekframe editor\n\`\`\`\n\nThen pick "${id}" in the editor, change what you like, and export from the Export tab ` +
      `(or \`npx seekframe render ${id} --fps 30\`). Saved versions are in projects/, uploaded images in uploads/.\n`);
    const file = path.resolve(out || path.join(ROOT, 'output', `${id}.seekframe.tgz`));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    tar(['-czf', file, '-C', stage, id]);
    return file;
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
}

/** unpack an archive made by pack() into films/<name>; returns the new film id */
export function importPack(file: string, name?: string, force = false): { id: string; dir: string } {
  if (!fs.existsSync(file)) throw new Error('no such file: ' + file);
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-import-'));
  try {
    tar(['-xzf', path.resolve(file), '-C', stage]);
    const top = fs.readdirSync(stage).filter(d => fs.existsSync(path.join(stage, d, 'film.html')));
    if (top.length !== 1) throw new Error('this archive does not contain one Seekframe film (a folder with film.html)');
    const id = slug(name || top[0]); if (!id) throw new Error('give the film a name');
    const dst = path.join(ROOT, 'films', id);
    if (fs.existsSync(dst)) { if (!force) throw new Error(`films/${id} already exists (pass a new name, or --force to replace it)`); fs.rmSync(dst, { recursive: true, force: true }); }
    ensureBrands(); fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.cpSync(path.join(stage, top[0]), dst, { recursive: true, filter: p => !/[\\/]SHARED\.md$/.test(p) });
    for (const f of fs.readdirSync(dst)) if (/\.(html|js)$/.test(f)) { const p = path.join(dst, f); fs.writeFileSync(p, local(canonical(fs.readFileSync(p, 'utf8')))); }
    try { buildBrand(path.join(dst, 'brand')); } catch { /* film has no brand kit */ }
    return { id, dir: dst };
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
}

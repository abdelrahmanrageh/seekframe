// seekframe init [dir] — turn a folder into a Seekframe workspace (films/, brand/, agent files, package.json).
import fs from 'node:fs';
import path from 'node:path';
import pkg from '../../package.json';
import { PKG_ROOT } from './workspace';
import { build } from '../brand/build';

function copyTemplate(src: string, dst: string, vars: Record<string, string>, created: string[]): void {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyTemplate(s, d, vars, created); continue; }
    if (fs.existsSync(d)) continue;                                      // never overwrite the user's files
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.writeFileSync(d, fs.readFileSync(s, 'utf8').replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? ''));
    created.push(path.relative(dst, d));
  }
}

export function initWorkspace(dirArg: string, log: (m: string) => void = console.log): { dir: string; created: string[] } {
  const dir = path.resolve(dirArg), created: string[] = [];
  fs.mkdirSync(dir, { recursive: true });
  const inPackage = !path.relative(PKG_ROOT, dir).startsWith('..');
  const rel = (p: string) => (path.relative(dir, p) || '.').split(path.sep).join('/');
  const docs = inPackage ? 'docs' : rel(path.join(PKG_ROOT, 'docs')), pkgRel = inPackage ? '.' : rel(PKG_ROOT);
  const name = path.basename(dir);
  if (!fs.existsSync(path.join(dir, 'seekframe.json'))) { fs.writeFileSync(path.join(dir, 'seekframe.json'), JSON.stringify({ name, seekframe: pkg.version }, null, 2) + '\n'); created.push('seekframe.json'); }
  for (const d of ['films', 'brand/assets', 'output']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  if (!fs.existsSync(path.join(dir, 'films', '.gitkeep'))) fs.writeFileSync(path.join(dir, 'films', '.gitkeep'), '');
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, private: true, scripts: { editor: 'seekframe editor', doctor: 'seekframe doctor' }, devDependencies: { seekframe: '^' + pkg.version } }, null, 2) + '\n'); created.push('package.json');
  }
  if (!fs.existsSync(path.join(dir, 'brand', 'brand.json'))) {
    fs.writeFileSync(path.join(dir, 'brand', 'brand.json'), JSON.stringify({ name, colors: { accent: '#5B8CFF', ink: '#0F1226', paper: '#FFFFFF', muted: '#8A90A8' }, fonts: [], voice: { tone: 'calm, confident, short sentences', tagline: '' }, languages: ['en'] }, null, 2) + '\n'); created.push('brand/brand.json');
  }
  copyTemplate(path.join(PKG_ROOT, 'templates', 'workspace'), dir, { DOCS: docs, PKG: pkgRel, NAME: name }, created);
  try { build(path.join(dir, 'brand')); } catch { /* fonts path is rebuilt on first run */ }
  log(`Workspace ready in ${rel(dir) === '.' ? 'the current folder' : rel(dir)}${created.length ? ` (${created.length} files created)` : ' (nothing new to create)'}.\nNext:\n  npm install\n  npx seekframe doctor\n  npx seekframe editor`);
  return { dir, created };
}

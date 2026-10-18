// Build: TypeScript sources -> dist/ (esbuild). Type checking is separate (`npm run typecheck`).
//   node scripts/build.mjs [--watch]
import { build, context } from 'esbuild';
import { globSync } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';

const watch = process.argv.includes('--watch');
fs.rmSync('dist', { recursive: true, force: true });

// 1. Node side: one CommonJS file per source file (same layout under dist/)
const nodeEntries = globSync('src/**/*.ts').filter(f => !f.endsWith('.d.ts') && !f.startsWith('src/browser/'));
const nodeOpts = { entryPoints: nodeEntries, outdir: 'dist', outbase: 'src', format: 'cjs', platform: 'node', target: 'node20', sourcemap: false, logLevel: 'info', supported: { 'dynamic-import': false } };

// 2. Browser side: self-contained scripts
//    runtime.js   -> window.SF       (films include this)
//    timeline.js  -> window.Timeline (injected into pages by the renderer/validator)
//    editor.js    -> the editor app (bundles the timeline module)
const common = { bundle: true, format: 'iife', platform: 'browser', target: 'es2020', sourcemap: false, logLevel: 'info' };
const browserBuilds = [
  { ...common, entryPoints: { runtime: 'src/browser/runtime.ts' }, outdir: 'dist/browser' },
  { ...common, entryPoints: { timeline: 'src/core/timeline.ts' }, outdir: 'dist/browser', globalName: 'Timeline' },
  { ...common, entryPoints: { editor: 'src/browser/editor/main.ts' }, outdir: 'dist/browser' },
];

// 3. type declarations for film authors (dist/types/browser/film-globals.d.ts)
import { execFileSync } from 'node:child_process';
const types = () => { execFileSync('npx', ['tsc', '-p', 'tsconfig.types.json'], { stdio: 'inherit' }); fs.copyFileSync('src/browser/film-globals.d.ts', 'dist/types/browser/film-globals.d.ts'); };

// 4. static files
const copies = [['src/core/film.schema.json', 'dist/core/film.schema.json'], ['src/editor/editor.html', 'dist/editor/editor.html'], ['src/editor/editor.css', 'dist/editor/editor.css']];
const copyStatic = () => { for (const [a, b] of copies) if (fs.existsSync(a)) { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); } };

if (watch) {
  for (const o of [nodeOpts, ...browserBuilds]) await (await context(o)).watch();
  copyStatic(); console.log('watching…');
} else {
  await build(nodeOpts); for (const o of browserBuilds) await build(o); copyStatic(); types();
}

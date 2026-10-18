// Compile the TypeScript tests to dist-test/. They are type-checked against src/ but RUN against dist/ (what ships):
// the plugin rewrites imports of ../src/* to ../dist/*.
import { build } from 'esbuild';
import { globSync } from 'node:fs';
import fs from 'node:fs';
fs.rmSync('dist-test', { recursive: true, force: true });
const toDist = { name: 'src-to-dist', setup(b) { b.onResolve({ filter: /^\.\.\/src\// }, a => ({ path: a.path.replace('../src/', '../dist/'), external: true })); } };
await build({ entryPoints: globSync('test/*.test.ts'), outdir: 'dist-test', bundle: true, packages: 'external', format: 'cjs', platform: 'node', target: 'node20', logLevel: 'warning', plugins: [toDist], supported: { 'dynamic-import': false } });

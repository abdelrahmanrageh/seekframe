// Finds ffmpeg: $SEEKFRAME_FFMPEG (a path you choose), else the bundled ffmpeg-static binary, else `ffmpeg` on PATH, else a clear error.
// ffmpeg-static is an optional dependency: `npm install --omit=optional` skips its download and uses the ffmpeg you already have.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

let cached: { env: string; path: string } | null = null;
function ffmpegPath(): string {
  const env = process.env.SEEKFRAME_FFMPEG || '';
  if (cached && cached.env === env) return cached.path;
  const found = (p: string) => (cached = { env, path: p }).path;
  if (env) { if (spawnSync(env, ['-version']).error) throw new Error(`SEEKFRAME_FFMPEG is set to "${env}" but that is not a working ffmpeg.`); return found(env); }
  try { const p = require('ffmpeg-static'); if (p && fs.existsSync(p)) return found(p); } catch (e) { /* optional dependency not installed */ }
  if (!spawnSync('ffmpeg', ['-version']).error) return found('ffmpeg');
  throw new Error('ffmpeg not found. Install it (e.g. `brew install ffmpeg`), or run `npm rebuild ffmpeg-static` to fetch the bundled one, or point SEEKFRAME_FFMPEG at a binary.');
}
export { ffmpegPath };

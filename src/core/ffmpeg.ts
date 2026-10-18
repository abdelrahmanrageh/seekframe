// Finds ffmpeg: the bundled ffmpeg-static binary, else `ffmpeg` on PATH, else a clear error.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

let cached = null;
function ffmpegPath() {
  if (cached) return cached;
  try { const p = require('ffmpeg-static'); if (p && fs.existsSync(p)) return (cached = p); } catch (e) {}
  if (!spawnSync('ffmpeg', ['-version']).error) return (cached = 'ffmpeg');
  throw new Error('ffmpeg not found. The bundled binary is missing (npm skipped its install script?): run `npm rebuild ffmpeg-static`, or install ffmpeg (e.g. `brew install ffmpeg`).');
}
export { ffmpegPath };

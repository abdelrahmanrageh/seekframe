// The export pipeline shared by the editor server, the CLI and the MCP server:
//   project -> (generated score) -> parallel Playwright workers -> ffmpeg -> MP4
import type { AudioTrack, CustomTrack, FilmRef, Manifest, ProjectInput } from '../types';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import * as Timeline from './timeline';
import { openFilm } from './render';
import { ROOT } from './workspace';
import { ffmpegPath } from './ffmpeg';







function run(cmd: string, args: string[], opts?: any, procs?: any[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const c = spawn(cmd, args, opts); let err = '';
    c.stderr.on('data', d => { err += d; if (err.length > 4000) err = err.slice(-4000); });
    c.stdout.on('data', () => {});
    c.on('error', reject);
    c.on('exit', (code, sig) => code === 0 ? resolve() : reject(new Error(sig ? 'cancelled' : `${path.basename(cmd)} exited ${code}\n${err}`)));
    if (procs) procs.push(c);
  });
}

export interface ExportOptions {
  film: FilmRef; project: ProjectInput; fps?: number; size?: string | null; out: string;
  onProgress?: (p: { phase: 'preparing' | 'frames' | 'encoding'; done: number; total: number }) => void;
  procs?: ChildProcess[];                                                 // collects spawned processes so a caller can cancel
  generateScore?: (track: AudioTrack, manifest: Manifest) => Promise<string>;   // renders a `generated: 'cues'` track to a wav path
}

/* Renders one project to an MP4.
   opts: { film:{id,dir}, project, fps, size, out, onProgress({phase,done,total}), procs[] (for cancelling), scoreFor(manifest,tl) } */
async function exportFilm(o: ExportOptions): Promise<{ out: string; frames: number; seconds: number }> {
  const { film, project, fps = 30, out, onProgress = () => {}, procs = [] } = o;
  const size = o.size || ((project as any).output && (project as any).output.size) || null;   // a saved version may carry its own size (e.g. 16:9)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seekframe-'));
  try {
    onProgress({ phase: 'preparing', done: 0, total: 0 });
    const pfile = path.join(tmp, 'project.json'); fs.writeFileSync(pfile, JSON.stringify(project));
    const { browser, manifest } = await openFilm(film.dir, project, size);
    await browser.close();
    const tl = Timeline.build(manifest, project);
    const n = Math.round(tl.total * fps / manifest.fps);
    const frames = path.join(tmp, 'frames'); fs.mkdirSync(frames);
    const workers = Math.max(1, Math.min(4, os.cpus().length - 1)), per = Math.ceil(n / workers), ps: Promise<void>[] = [];
    for (let w = 0; w < workers; w++) {
      const a = w * per, z = Math.min(n, a + per); if (a >= z) break;
      ps.push(run('node', [path.join(__dirname, 'render.js'), '--film', film.dir, '--project', pfile, '--out', frames, '--fps', String(fps), '--range', `${a}:${z}`, ...(size ? ['--size', size] : [])], { cwd: ROOT }, procs));
    }
    const tick = setInterval(() => { try { onProgress({ phase: 'frames', done: fs.readdirSync(frames).length, total: n }); } catch (e) {} }, 400);
    try { await Promise.all(ps); } finally { clearInterval(tick); }
    onProgress({ phase: 'encoding', done: n, total: n });

    // audio: file tracks + generated score + user tracks, all enabled in the project
    const tracks: Array<AudioTrack | CustomTrack> = [];
    const st = (project.audio && project.audio.tracks) || {};
    for (const t of manifest.audio || []) { const s = st[t.id] || {}; if (s.enabled == null ? !!t.default : s.enabled) tracks.push({ ...t, volume: s.volume == null ? (t.volume == null ? 1 : t.volume) : s.volume }); }
    for (const t of (project.audio && project.audio.custom) || []) if (t.enabled !== false) tracks.push({ sync: 'free', ...t });
    const inputs: Timeline.AudioInput[] = []; const args = ['-y', '-framerate', String(fps), '-i', path.join(frames, '%05d.jpg')];
    for (const t of tracks) {
      const generated = 'generated' in t && t.generated === 'cues';
      let f: string | null = null;
      if (generated) {
        if (!o.generateScore) throw new Error(`audio track "${t.id}" requires a score generator`);
        f = await o.generateScore(t as AudioTrack, manifest);           // {id, generated:'cues'} -> wav path
      } else if (t.src) { f = path.resolve(film.dir, t.src); if (!(f.startsWith(ROOT + path.sep))) f = null; }
      if (f && fs.existsSync(f)) { args.push('-i', f); inputs.push({ index: inputs.length + 1, track: generated ? { ...t, sync: 'timeline' } : t }); }
    }
    args.push('-vf', 'crop=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-crf', '18', '-preset', fps > 30 ? 'slow' : 'medium', '-pix_fmt', 'yuv420p');
    if (inputs.length) args.push('-filter_complex', Timeline.audioFilter(tl, manifest.fps, inputs), '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k');
    args.push('-t', (tl.total / manifest.fps).toFixed(3), '-movflags', '+faststart');
    fs.mkdirSync(path.dirname(out), { recursive: true }); args.push(out);
    await run(ffmpegPath(), args, { cwd: ROOT }, procs);
    return { out, frames: n, seconds: tl.total / manifest.fps };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
export { exportFilm, run };

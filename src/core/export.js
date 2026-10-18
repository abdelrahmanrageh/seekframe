// The export pipeline shared by the editor server, the CLI and the MCP server:
//   project -> (generated score) -> parallel Playwright workers -> ffmpeg -> MP4
const fs = require('fs'), path = require('path'), os = require('os');
const { spawn } = require('child_process');
const Timeline = require('./timeline.js');
const { openFilm } = require('./render.js');
const { ROOT } = require('./workspace.js');
let FFMPEG = 'ffmpeg'; try { FFMPEG = require('ffmpeg-static') || 'ffmpeg'; } catch (e) {}

function run(cmd, args, opts, procs) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, opts); let err = '';
    c.stderr.on('data', d => { err += d; if (err.length > 4000) err = err.slice(-4000); });
    c.stdout.on('data', () => {});
    c.on('error', reject);
    c.on('exit', (code, sig) => code === 0 ? resolve() : reject(new Error(sig ? 'cancelled' : `${path.basename(cmd)} exited ${code}\n${err}`)));
    if (procs) procs.push(c);
  });
}

/* Renders one project to an MP4.
   opts: { film:{id,dir}, project, fps, size, out, onProgress({phase,done,total}), procs[] (for cancelling), scoreFor(manifest,tl) } */
async function exportFilm(o) {
  const { film, project, fps = 30, size = null, out, onProgress = () => {}, procs = [] } = o;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seekframe-'));
  try {
    onProgress({ phase: 'preparing', done: 0, total: 0 });
    const pfile = path.join(tmp, 'project.json'); fs.writeFileSync(pfile, JSON.stringify(project));
    const { browser, manifest } = await openFilm(film.dir, project, size);
    await browser.close();
    const tl = Timeline.build(manifest, project);
    const n = Math.round(tl.total * fps / manifest.fps);
    const frames = path.join(tmp, 'frames'); fs.mkdirSync(frames);
    const workers = Math.max(1, Math.min(4, os.cpus().length - 1)), per = Math.ceil(n / workers), ps = [];
    for (let w = 0; w < workers; w++) {
      const a = w * per, z = Math.min(n, a + per); if (a >= z) break;
      ps.push(run('node', [path.join(__dirname, 'render.js'), '--film', film.dir, '--project', pfile, '--out', frames, '--fps', String(fps), '--range', `${a}:${z}`, ...(size ? ['--size', size] : [])], { cwd: ROOT }, procs));
    }
    const tick = setInterval(() => { try { onProgress({ phase: 'frames', done: fs.readdirSync(frames).length, total: n }); } catch (e) {} }, 400);
    try { await Promise.all(ps); } finally { clearInterval(tick); }
    onProgress({ phase: 'encoding', done: n, total: n });

    // audio: file tracks + generated score + user tracks, all enabled in the project
    const tracks = [];
    const st = (project.audio && project.audio.tracks) || {};
    for (const t of manifest.audio || []) { const s = st[t.id] || {}; if (s.enabled == null ? !!t.default : s.enabled) tracks.push({ ...t, volume: s.volume == null ? (t.volume == null ? 1 : t.volume) : s.volume }); }
    for (const t of (project.audio && project.audio.custom) || []) if (t.enabled !== false) tracks.push({ sync: 'free', ...t });
    const inputs = []; const args = ['-y', '-framerate', String(fps), '-i', path.join(frames, '%05d.jpg')];
    for (const t of tracks) {
      let f = null;
      if (t.generated) f = await o.generateScore(t, manifest);           // {id, generated:'cues'} -> wav path
      else { f = path.resolve(film.dir, t.src); if (!(f.startsWith(ROOT + path.sep))) f = null; }
      if (f && fs.existsSync(f)) { args.push('-i', f); inputs.push({ index: inputs.length + 1, track: t.generated ? { ...t, sync: 'timeline' } : t }); }
    }
    args.push('-vf', 'crop=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-crf', '18', '-preset', fps > 30 ? 'slow' : 'medium', '-pix_fmt', 'yuv420p');
    if (inputs.length) args.push('-filter_complex', Timeline.audioFilter(tl, manifest.fps, inputs), '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k');
    args.push('-t', (tl.total / manifest.fps).toFixed(3), '-movflags', '+faststart');
    fs.mkdirSync(path.dirname(out), { recursive: true }); args.push(out);
    await run(FFMPEG, args, { cwd: ROOT }, procs);
    return { out, frames: n, seconds: tl.total / manifest.fps };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
module.exports = { exportFilm, run, FFMPEG };

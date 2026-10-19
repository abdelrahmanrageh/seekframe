// Assembles the docs site (site/index.html + the launch previews it uses) into dist-site/, the same way the Pages workflow does.
// Usage: node scripts/build-site.mjs [--serve] [--port 4174]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), out = path.join(root, 'dist-site');
const PREVIEW = 'examples/seekframe-launch/preview';
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, PREVIEW), { recursive: true });
fs.copyFileSync(path.join(root, 'site/index.html'), path.join(out, 'index.html'));
fs.cpSync(path.join(root, 'site/img'), path.join(out, 'img'), { recursive: true });
for (const f of fs.readdirSync(path.join(root, PREVIEW))) if (/\.(mp4|jpg|png|webm)$/.test(f)) fs.copyFileSync(path.join(root, PREVIEW, f), path.join(out, PREVIEW, f));
console.log('built dist-site/');
if (process.argv.includes('--serve')) {
  const i = process.argv.indexOf('--port'), port = i > 0 ? +process.argv[i + 1] : 4174;
  const types = { '.html': 'text/html; charset=utf-8', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.webm': 'video/webm', '.svg': 'image/svg+xml' };
  http.createServer((req, res) => {
    const p = path.join(out, decodeURIComponent(new URL(req.url, 'http://x').pathname)), f = p.endsWith(path.sep) ? path.join(p, 'index.html') : p;
    if (!f.startsWith(out) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    const size = fs.statSync(f).size, range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');      // video seeking needs ranges
    if (range) { const a = +range[1] || 0, b = range[2] ? +range[2] : size - 1; res.writeHead(206, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'content-range': `bytes ${a}-${b}/${size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1 }); return fs.createReadStream(f, { start: a, end: b }).pipe(res); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'content-length': size, 'accept-ranges': 'bytes' }); fs.createReadStream(f).pipe(res);
  }).listen(port, '127.0.0.1', () => console.log(`Docs site: http://localhost:${port}/`));
}

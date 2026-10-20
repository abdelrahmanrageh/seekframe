import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { start, guard } from '../src/editor/server';
import * as P from '../src/brand/palette';
import fs from 'node:fs';
import path from 'node:path';
import { scaffoldFilm } from '../src/core/scaffold';
import { ROOT } from '../src/core/workspace';

function call(port: number, method: string, url: string, headers: Record<string, string> = {}, body?: any): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: url, headers: { host: 'localhost:' + port, ...headers } }, res => {
      let b = ''; res.on('data', d => b += d); res.on('end', () => resolve({ status: res.statusCode || 0, body: b }));
    });
    req.on('error', reject); if (body !== undefined) req.write(JSON.stringify(body)); req.end();
  });
}

test('server guard: Host allowlist, Origin and X-Seekframe header', async () => {
  const server = await start(0); const port = (server.address() as AddressInfo).port;
  try {
    assert.equal((await call(port, 'GET', '/api/films')).status, 200, 'plain local GET works');
    assert.equal((await call(port, 'GET', '/api/films', { host: 'evil.example:' + port })).status, 403, 'DNS-rebinding host is refused');
    assert.equal((await call(port, 'POST', '/api/cancel')).status, 403, 'write without the header is refused');
    assert.equal((await call(port, 'POST', '/api/cancel', { 'x-seekframe': '1', origin: 'https://evil.example' })).status, 403, 'foreign origin is refused');
    assert.equal((await call(port, 'POST', '/api/cancel', { 'x-seekframe': '1', origin: 'null' })).status, 403, 'opaque origin is refused');
    const ok = await call(port, 'POST', '/api/cancel', { 'x-seekframe': '1', origin: 'http://localhost:' + port });
    assert.notEqual(ok.status, 403, 'a legitimate write passes the guard');
  } finally { server.close(); }
});

test('server guard: SEEKFRAME_ALLOWED_HOSTS wildcard', () => {
  const req: any = (host: string) => ({ headers: { host }, method: 'GET' });
  assert.ok(guard(req('abc-4173.app.github.dev')));
  process.env.SEEKFRAME_ALLOWED_HOSTS = '*.app.github.dev';
  try { assert.equal(guard(req('abc-4173.app.github.dev')), null); assert.ok(guard(req('app.github.dev.evil.com'))); } finally { delete process.env.SEEKFRAME_ALLOWED_HOSTS; }
});

test('palette roles: paper is light, ink is dark, muted is readable on paper', () => {
  const r = P.roles([{ hex: '#faf3e3', rgb: [250, 243, 227], share: .6 }, { hex: '#0d0d0c', rgb: [13, 13, 12], share: .25 }, { hex: '#b2be6d', rgb: [178, 190, 109], share: .1 }, { hex: '#d9d2c0', rgb: [217, 210, 192], share: .05 }]);
  assert.ok(P.lum(P.unhex(r.paper)) > P.lum(P.unhex(r.ink)));
  assert.ok(P.contrast(P.unhex(r.muted), P.unhex(r.paper)) >= 4.5, 'muted text is readable');
  assert.notEqual(r.muted, r.paper);
});

test('share: pack a film and import it under a new name', async () => {
  const { pack, importPack } = await import('../src/core/share');
  const os = await import('node:os'), fs = await import('node:fs'), path = await import('node:path');
  const { ROOT } = await import('../src/core/workspace');
  const out = path.join(os.tmpdir(), `sf-share-${process.pid}.seekframe.tgz`);
  const file = pack(path.join(ROOT, 'templates/blank'), 'share-test', out);
  try {
    const r = importPack(file, 'share-test-copy');
    try { assert.ok(fs.existsSync(path.join(r.dir, 'film.html'))); assert.ok(!fs.existsSync(path.join(r.dir, 'SHARED.md'))); assert.throws(() => importPack(file, 'share-test-copy')); }
    finally { fs.rmSync(r.dir, { recursive: true, force: true }); }
  } finally { fs.rmSync(file, { force: true }); }
});

function bin(port: number, method: string, url: string, body?: Buffer): Promise<{ status: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: url, headers: { host: 'localhost:' + port, 'x-seekframe': '1', ...(body ? { 'content-length': String(body.length) } : {}) } }, res => {
      const ch: Buffer[] = []; res.on('data', d => ch.push(d)); res.on('end', () => resolve({ status: res.statusCode || 0, body: Buffer.concat(ch) }));
    });
    req.on('error', reject); if (body) req.write(body); req.end();
  });
}
test('project file: export a film from the editor server and import it back (with a name clash)', async () => {
  const src = scaffoldFilm({ name: 'ci-pack-src' }), server = await start(0), port = (server.address() as AddressInfo).port;
  try {
    fs.mkdirSync(path.join(src.dir, 'projects'), { recursive: true }); fs.writeFileSync(path.join(src.dir, 'projects', 'v1.json'), JSON.stringify({ params: { title: 'Packed' } }));
    const out = await bin(port, 'GET', '/api/pack/ci-pack-src'); assert.equal(out.status, 200); assert.ok(out.body.length > 500 && out.body[0] === 0x1f && out.body[1] === 0x8b, 'a gzip archive');
    assert.equal((await bin(port, 'GET', '/api/pack/nope')).status, 404);
    const ok = await bin(port, 'POST', '/api/import?name=ci-pack-copy', out.body); assert.equal(ok.status, 200, ok.body.toString()); assert.equal(JSON.parse(ok.body.toString()).id, 'ci-pack-copy');
    const copy = path.join(ROOT, 'films', 'ci-pack-copy'); assert.ok(fs.existsSync(path.join(copy, 'film.html'))); assert.match(fs.readFileSync(path.join(copy, 'projects', 'v1.json'), 'utf8'), /Packed/);
    const clash = await bin(port, 'POST', '/api/import?name=ci-pack-copy', out.body); assert.equal(clash.status, 400); assert.match(clash.body.toString(), /already exists/);
    assert.equal((await bin(port, 'POST', '/api/import?name=ci-pack-copy&force=1', out.body)).status, 200, 'force replaces it');
    assert.equal((await bin(port, 'POST', '/api/import', Buffer.from('not an archive'))).status, 400);
  } finally { server.close(); fs.rmSync(src.dir, { recursive: true, force: true }); fs.rmSync(path.join(ROOT, 'films', 'ci-pack-copy'), { recursive: true, force: true }); }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { start, guard } from '../src/editor/server';
import * as P from '../src/brand/palette';

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

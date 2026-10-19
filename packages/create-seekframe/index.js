#!/usr/bin/env node
// npm create seekframe@latest my-films   ->  a ready Seekframe workspace in ./my-films
// Options: --no-install   skip `npm install`        --spec <npm spec>   which seekframe to install (default: latest)
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const args = process.argv.slice(2), flag = n => args.includes('--' + n), val = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const dirArg = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--spec') || 'my-films';
const dir = path.resolve(dirArg), name = path.basename(dir).toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
const run = (cmd, a, cwd) => { const r = spawnSync(cmd, a, { cwd, stdio: 'inherit', shell: process.platform === 'win32' }); if (r.status) process.exit(r.status || 1); };

if (fs.existsSync(dir) && fs.readdirSync(dir).length) { console.error(`${dirArg} is not empty. Choose a new folder, e.g. npm create seekframe my-films`); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, private: true, scripts: { editor: 'seekframe editor', doctor: 'seekframe doctor' }, devDependencies: { seekframe: val('spec') || 'latest' }, allowScripts: { esbuild: true, 'ffmpeg-static': true } }, null, 2) + '\n');
console.log(`Creating a Seekframe workspace in ${dirArg} …`);
if (!flag('no-install')) run('npm', ['install'], dir);
run('npx', ['--no-install', 'seekframe', 'init', '.'], dir);
console.log(`\nDone. Next:\n  cd ${dirArg}\n  npx seekframe doctor      # is Chromium installed? (if not: npx playwright install chromium)\n  npx seekframe editor      # set up your brand and make your first film\n`);

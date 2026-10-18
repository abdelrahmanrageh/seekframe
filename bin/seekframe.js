#!/usr/bin/env node
require('../dist/cli.js').main(process.argv.slice(2)).catch(e => { console.error(e && e.stack || e); process.exit(1); });

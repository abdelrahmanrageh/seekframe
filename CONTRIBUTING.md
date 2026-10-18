# Contributing

Thanks for helping. Seekframe is small on purpose: one npm package, plain HTML/CSS/JS films, no build step.

```bash
npm install && npx playwright install chromium
npm run typecheck      # tsc over the Node and browser projects
npm run test:unit      # fast (a few seconds)
npm test               # builds, then unit + end-to-end tests (needs Chromium, ~1 min)
```

**What we welcome:** new templates and examples (with the prompt that produced them and *what the model got wrong*), sound themes (`src/sound/engine.js`),
runtime helpers (`src/browser/runtime.ts`), validator/review checks, editor accessibility work, translations of guides, bug reports with a film that reproduces them.

**Rules**
- Films must obey the contract in `docs/FILM_SPEC.md`: `npm run validate -- <film>` passes.
- Add a test for logic you add (`test/unit.test.js` style). A new check needs a test that it fires AND that it stays quiet on a good film.
- Don't commit fonts with restrictive licences, third-party reference footage, rendered MP4s (use Releases), or secrets.
- Examples use brands you own or fictional ones. Say who owns the brand in the example's README.
- Keep docs and `AGENTS.md` in sync with behaviour changes.

Be kind: see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Security issues: [SECURITY.md](SECURITY.md).

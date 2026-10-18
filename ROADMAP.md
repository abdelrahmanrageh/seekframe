# Roadmap

The original phases 0–4 established the TypeScript framework, LLM kit, runtime, brand kit, and cue-driven sound engine. The current work completes the implementation foundation for phases 5–7.

## Phase 5: Editor v1

Implemented:

- Undo/redo, keyboard shortcuts and a shortcut overlay.
- Timestamped version snapshots, restore, and parameter diffs.
- Variants cards, audio waveform and cue markers, cue snapping while resizing scenes.
- Safe-area overlay, responsive size switcher, live text overflow scan.
- Brand panel for palette editing, logo upload/tracing, font licence metadata, and applying the kit to a film.
- Render queue with progress, ETA, cancel, download and completion notification.
- English and Arabic interface strings, RTL layout, light/dark themes, keyboard focus states, dialog focus trap, and reduced-motion styling.

Remaining: a formal assistive-technology audit and fixes based on that audit. Scene drag-to-reorder remains a later editor feature; scenes can be reordered with buttons.

## Phase 6: Distribution

Implemented:

- TypeScript migration with strict null checks, browser and Node builds, and generated author declarations.
- `npm create seekframe` workspace bootstrap and workspace discovery outside the framework checkout.
- Docker and devcontainer definitions, a reusable GitHub render Action, and a GitHub Pages workflow/static landing page.
- `films/seekframe-launch` source film for the project launch story.

Remaining: run the render Action in GitHub, inspect the launch film contact sheet and rendered video, and deploy Pages/publish npm packages when a release is approved. This repository does not publish or deploy automatically from the current branch.

## Phase 7: Community

Implemented:

- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, pull request template, and bug/feature issue forms.
- Example submission template with ownership, licensing, and review requirements.

Ongoing: accept and review community examples, translations, and contributions; maintain releases and the showcase.

## Known product limits

- Audio is synthesised from cues or supplied as an audio track; there are no TTS adapters yet.
- Captions export, audio description, render resume/cache, and alternate video formats remain future work.
- Stroke extraction from raster logos is assisted and needs a human review of the generated paths.
- The formal editor accessibility audit and visual review of the launch film remain before a public release.

## Release checklist

- [ ] Inspect the launch film contact sheet and play a rendered draft.
- [ ] Complete the editor accessibility audit.
- [ ] Run CI and the reusable render Action on GitHub.
- [ ] Review npm package contents, version, changelog, and release notes.
- [ ] Publish npm packages and deploy Pages after release approval.

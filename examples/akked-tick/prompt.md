# How this film was prompted

Condensed from the real session (Claude Code with the Seekframe tools). The model wrote the film; a human looked at renders and steered.

**1. References → style** (`llm/prompts/02-style-from-references.md`)
> Here are 4 reference videos. Extract the common style, how to match it with our identity (Akked: lime #84FF00 on black/white, check-mark logo), and write a script for a new horizontal English video with new motions like these, and a deeper sound design like the last one.

The model extracted contact sheets and cut points, measured the sound of the last reference (−24 LUFS, LRA 18, +15 dB bass-vs-mid, silences, a 75 bpm hit grid), and wrote `brief.md`.

**2. Script → film → variants** (`04`, `05`)
> Start generating the film. We can generate different versions: different hooks, elements, style, so we can pick. Also an Arabic one with the exact same scenes but Arabic text, right to left.

→ one film with params `hook` / `theme` / `cards`, three saved versions, and a sibling page for Arabic that shares all code.

**3. Sound feedback** (`06`)
> You designed the sound for the first variant but messed up the counter and cash-on-delivery variants: it isn't synced to their scenes.

→ every hook got its own cues on its own animation frames. That bug led to the **cue system** and the `seekframe sync` check in this repo: sound is declared on the same frame numbers as the animation, so it can't drift.

Reuse: replace the brand and the brief and keep the loop (validate → review → look → sync).

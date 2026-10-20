# Craft review: is the film good, not just correct

`validate` proves a film is **correct** (deterministic, editable, no overflow, contrast, no flashing). `critique` measures
**craft**: whether the film is readable, fills the frame, moves, cuts well, and has sound where things happen.
It prints a 0 to 100 score and a ranked fix list in plain words. Run it, fix the list from the top, run it again.

```bash
seekframe critique <film> [--version v] [--min-score 80] [--no-sound]   # craft only
seekframe review <film> --craft                                          # contact sheets and the craft score
```
MCP: `critique_film`. It takes about a minute for a 30 s film. The JSON report is written to `output/review/<film>-craft.json`.
A score is not taste: it catches the common failures (tiny text, a card in the corner, long still holds, silent stretches),
it cannot tell you the film is beautiful. Still open the contact sheets and look.

## What is measured

| Check | Measured from | Default | Typical fix |
|---|---|---|---|
| Readability | text sizes in the page, relative to the short side | headline >= 4.5 %, body >= 2.2 % (about 49 and 24 px at 1080p) | enlarge the text, or crop in |
| Occupancy | box around all content vs the safe area (5 % margin), mid scene | >= 55 % | scale the main element up, move the camera in |
| Hierarchy | text size tiers per scene | largest >= 1.6x the next | make one thing clearly bigger |
| Pacing | scene length, reading load (about 6 characters a word) | 1.5 to 6 s; 0.25 s per word | cut words or lengthen the scene |
| Motion presence | share of pixels that change over 0.25 s | no still stretch over 1.2 s | add a push, a follow-through, a second beat |
| Entrances | first visible change after a cut | within 6 frames at 30 fps | start the entrance on the cut frame |
| Transitions | motion before and after each cut; dips to black | motion on both sides, no fade through black | overlap the exit and the entrance |
| Sound coverage | the generated score | no silence over 1.5 s; at least 1 cue per second | add cues for what moves |
| Sound sync | picture events vs cues (the `sync` check) | cue within 6 frames of each big event | put the cue on the same frame |
| Loudness | EBU R128 of the generated score | within 1.5 LU of the target, true peak under -0.5 dBTP | sustained beds, lift quiet cues |

Not measured yet: background dominance (needs a split of content from background). The report lists what was skipped.
Text marked `data-sf-decorative` (illustrative mock UI) and tickers (`data-sf-ticker`) are not counted as copy. Symbols such as ✓ are ignored.
Elements marked `data-sf-bg`, blurred glows and anything covering most of the frame are treated as background for occupancy.

The score is the weighted mean of the checks (each is the share of scenes, cuts or time windows that pass). A version that edits
the timeline skips the sound checks, because the score is generated from the source timeline.

## Opting out, with a reason
A deliberate still logo or a pause before a reveal is allowed, but each opt-out is listed in the report and costs 1.5 points
(at most 10), so it cannot be used to hide a weak film. A reason of a few words is required.

```js
{ id: 'logo', name: 'Logo reveal', start: 795, end: 960, allow: ['motion: end card holds on the logo'] }   // per scene
```
```html
<small data-sf-allow="readability: legal line, required but not meant to be read">Terms apply</small>   <!-- per element -->
```
Several: `allow: ['motion: ...', 'occupancy: ...']`, or `data-sf-allow="readability: ...; pacing: ..."`.
Check ids: `readability occupancy hierarchy motion entrance transition pacing silence sync loudness`.
For a deliberate pause in the sound use a `silence` cue (see SOUND.md); it is not counted as a gap.

## Thresholds and limits
The thresholds are defaults, tuned on the gallery films (the launch film scores 87, with real notes left in its fix list).
They suit product and brand films; a calm editorial piece can opt out where it means to. They live in `src/core/craft-checks.ts`.

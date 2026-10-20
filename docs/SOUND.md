# Sound: cues, themes, loudness

A film declares **cues** (events on its own frame numbers); `src/sound/engine.ts` renders them to a stereo wav.
Because cues come from the same code that animates, the score follows every variant, language and scene edit.

```js
const c = SF.cues();
c.boom(42, { gain: .6, decay: 2.2 });          // impact
c.tick(10, { pan: -.3, freq: 2200 });          // UI click
c.slide(106, 141, { p0: -1, p1: 1 });          // something crossing the frame (pan travels)
c.silence(270, 285);                           // hard silence (ranges take a second frame argument)
return c.list;
```

| kind | args | sounds like |
|---|---|---|
| `boom` | gain, decay, f0, f1 | sub impact with pitch drop (the "Enclave" hit) |
| `tick`, `dtick` | gain, freq, pan | UI click; `dtick` = two-tone "double tick" (a brand sound) |
| `pluck` | note (`'D2'`) or freq, gain | soft plucked note |
| `whoosh`, `swipe` | dur, gain, p0, p1 | filtered-noise sweep |
| `riser` | to, gain | rising tension (range) |
| `drone`, `pad`, `roomtone` | to, gain, … | beds (range) |
| `kick`, `shaker`, `thud`, `stamp` | gain, pan | rhythm and impacts |
| `ring`, `blip` | gain, freq, pan | phone ring, single call blip |
| `scribble`, `slide` | to, gain, p0, p1 | marker pen, sliding object (range) |
| `silence` | to | gates everything in the range (range) |
| `hat`, `clap` | gain, pan, `open` (hat) | drums for a groove |
| `bass` | to, note, `beat` (s), cut | bass note over a range; `beat` re-triggers it so it pumps like a side-chained bass (range) |
| `chord` | to, notes (`['D3','F3','A3']`), `beat`, cut0 → cut1, attack, release | detuned-saw chord with a filter sweep; `beat` pumps it (range) |
| `keys` | note, dur, bright | FM bell / electric piano for arps and melodies |
| `impact` | gain, tail | cinematic hit: sub boom + noise burst + long tail (a drop, a reveal) |
| `reverse` | to, notes | reverse swell that cuts dead at `to`, into a hit (range) |
| `sample` | `src` (file in the film folder), gain, pan, rate, start, dur, fadeIn, fadeOut, flip, min | **a recorded sound**: your own, generated (ElevenLabs) or licensed effect. `rate` changes speed and pitch, `start`/`dur` trim, `flip` swaps channels (a whip pan travelling the other way). Dropped from the `minimal` theme unless `min: true`. Decoded with the bundled ffmpeg, so mp3, wav, ogg and m4a all work |
| `glitch` | gain, pan, seed | digital stutter for cuts |
| `key` | gain, pan, seed, `space` | one keystroke: click, keycap thock and release; `space: true` is the heavier space bar. One every 2-4 frames with a little jitter sounds like real typing |

**Sound effects or music.** `examples/seekframe-launch` uses effects only (whooshes, hits, clicks, typing, a reveal): put each one on the frame its picture event happens, and show the sound style in the editor's Audio tab with a param marked `group: 'sound'` that drives `soundtrack.theme`. For music, pick a tempo whose beat is a whole number of frames (120 BPM at 30 fps = 15 frames) and cut on beats: then the
groove, the hits and the picture stay locked even when the editor retimes scenes.

**Themes** remap cues (`soundtrack: { theme: 'deep' | 'bright' | 'minimal' }`; with `SF.define` it may be a function of the param values, so each variant can sound different): *deep* is sub-led and sparse, *bright* has higher
pitches and short booms, *minimal* keeps only clicks and soft hits. Add a theme in `THEMES` in `engine.js` (a function from cue to cue,
or `null` to drop it). **Loudness:** mastered to `soundtrack.loudness` LUFS (default −16, true peak −1 dBTP; use −14 for loud
social feeds, −23 for broadcast).

**Pan in RTL:** the engine mirrors every pan for films whose manifest says `lang.rtl`, so sounds travel with right-to-left motion.

**Design rules that worked:** hits on cuts; sparse beds well under the hits; real silence before a reveal; no bright sounds
(keep energy under ~8 kHz); one brand sound (the double tick) repeated.

Commands: `seekframe sound <film> [--theme bright]` renders a wav; `seekframe sync <film>` compares cues with the picture.

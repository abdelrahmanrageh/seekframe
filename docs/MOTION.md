# Motion kit: picture and sound declared once

`SF.timeline()` animates an element **and** registers its sound on the same frame, so the two cannot drift apart.
Instead of writing `seek` with transforms and a second list of cues, you declare what happens and when:

```js
SF.define({
  /* title, size, scenes, params … */
  build() { /* create elements (SF.ui has ready-made ones) and keep them in R */ },
  timeline(T, v) {
    T.scene(R.sc.hook, 0, 120);                              // show this section from 0 to 120
    T.rise(R.words, 2, { stagger: 6 });                      // enter: slide + blur + fade; sound: soft swipe, panned by position
    T.type(R.input, v['prompt'], 146, 206, { caret: true }); // characters appear, one keystroke each (space bar is heavier)
    T.press(R.send, 220);                                    // press + ring; sound: click
    T.count(R.num, 0, 15850, 306, 366);                      // number roll; sound: ticks that slow down with it
    T.pop(R.chips, 330, { stagger: 8 });                     // spring scale; sound: tick + thud per chip
    T.reveal(R.logo, 426, { style: 'iris', lead: 4 });       // mask reveal; silence before, impact on the frame
    T.exit(R.card, 404, { to: 'zoom' });                     // leave; sound: whoosh
  },
});
```
No `seek` is needed: the runtime calls `T.draw(f)` for you (you may still add one for your own drawing, or use `T.on(f => …)`).
Everything is a pure function of the frame number, so scrubbing, retiming scenes in the editor and variants all keep working;
the sounds of every primitive are added to the film's cues, so `critique` and `sync` see them. Open `examples/seekframe-kit-demo`
("Lumen", a made-up support chat, 18 s, 16:9 / 9:16 / 1:1; 95/100 on `critique`, zero sync warnings) and read it next to this page.

## Primitives

| Call | What it does | Default sound |
|---|---|---|
| `T.rise(el, at, {from, dist, dur, stagger, blur})` | enter: translate + blur + fade, expo-out. `from`: `below` `above` `start` `end` `none`. Arrays stagger. | swipe, panned by x |
| `T.exit(el, at, {to})` | leave: `fade` `above` `below` `zoom` (scale + blur) | whoosh |
| `T.pop(el, at, {stagger, from})` | spring scale with overshoot | tick + thud per item |
| `T.type(el, text, a, b, {caret, keys})` | typed text by grapheme (Arabic and emoji safe), optional blinking caret | one `key` per character |
| `T.count(el, from, to, a, b, {format, decimals})` | number roll | ticks bunched at the start |
| `T.press(el, at)` | scale dip + expanding ring | click |
| `T.fly(el, to, a, b, {scale, blur})` | move to another element or `{x, y}` with motion blur; scales to the target's size | whoosh panned along the path |
| `T.morph(from, to, a, b)` | one element becomes another (position, size, cross-fade) | swipe |
| `T.reveal(el, at, {style, dur, lead})` | mask reveal: `iris` `wipe` `rise` `fade`. `lead` frames of silence before it. | impact on the first frame |
| `T.camera(stage)` | `.push(a, b, {scale, x, y})`, `.focus(el, a, b)`, `.reset(a, b)`. Use it on a container nothing else animates. | none |
| `T.scene(el, a, b)` | `display` only from a to b | none |
| `T.on(f => …)` | your own per-frame drawing | none |
| `T.cue(kind, f, opts)` | any cue from SOUND.md, e.g. a bed: `T.cue('roomtone', 0, { to: 540, gain: .08 })` | |

Pass `{ sound: false }` to any primitive for silence, or an object (`{ gain: .2, kind… }`) to override the cue. Several primitives on one
element combine: translate adds, scale and opacity multiply, so `rise` then `exit` on the same card just works.

**Motion tokens** (the house style, scaled to your fps): `T.tokens` = `{ fast: 8, base: 14, slow: 22, stagger: 5 }` frames at 30 fps,
also `SF.motion` for 30 fps. Enter with expo-out, exit with in-quad, pop with back-out. Use them for your own timings so the film feels like one piece.

**Planning from the layout.** Pans and `fly`/`morph` targets are read from where the elements are when the timeline is declared (they may sit in a hidden scene).
Keep elements laid out by CSS and let the kit move them; do not position them with `transform` yourself (the kit appends to a `transform` set before the call).

## Sound that stays clean
The kit adds one sound per group (one swipe for a whole staggered row, one thud for a row of chips), thins typing to human speed (at most about 11 keys a second,
with a frame of jitter) and keeps ticks sparse. Do not put a noise bed under a film: `roomtone` and `drone` are noise, and the loudness step lifts them to the
foreground; use `pad` at a very low gain if you want a bed, or none. `critique` flags a constant bed (under 10 dB between loud and quiet moments) and machine-gun sound bursts.

## Ready-made pieces: `SF.ui`
They only build elements (CSS variables `--acc --accInk --fg --bg`, so the brand applies); you animate them with the kit.
`blobs` (soft moving colour, marked as background) · `pill` · `card` · `chips` (a row of pills) · `browser` (frame with address bar) · `phone`
· `composer` (prompt box with a send button) · `counter` · `ticker` (endless scroll, marked `data-sf-ticker`) · `logo` (image or text mark, wordmark, tagline).
Override their size with a more specific selector in your film's CSS (`body .sf-card { width: 900px }`).
Not built yet (draw them with `SF.el` for now): table rows, QR scanner, text on a curve.

## One canvas for every size: `SF.canvas`
```js
const cv = SF.canvas(stage, { design: { '16x9': [1920, 1080], '9x16': [1080, 1920], '1x1': [1080, 1080] } });
// cv.root is a fixed design-size box scaled to fit and centred; cv.w, cv.h, cv.aspect, cv.portrait tell you which design you got
```
Write the layout for each design (a row on 16:9, a column on 9:16) and list the output sizes in `sizes`; the editor and `render --size` do the rest.

## Check it
`seekframe critique <film>` scores motion, entrances, transitions, sound coverage and sync (docs/CRAFT.md). A film built only from kit calls
passes sync by construction; the other checks still judge how you used them.

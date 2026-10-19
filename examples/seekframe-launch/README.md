# Seekframe launch film

32 s, 1920×1080, 30 fps. Made with Seekframe: open it with `npm run editor` (it is the film the editor opens first).

| Variant | Params |
|---|---|
| What if · night (default) | `{}` |
| Clock · electric | `hook=clock,look=electric` |
| Scale · sunset | `hook=scale,look=sunset` |
| What if · cream | `look=cream` |

```bash
node bin/seekframe.js render seekframe-launch --params "hook=clock,look=electric" --fps 60
node bin/seekframe.js matrix seekframe-launch --axes "hook=*,look=*" --fps 30      # all 12 combinations
```

## Story (8 scenes, cut on the beat)
1. **Hook**, one of three stories: *What if your AI could make films?* (kinetic type, shock rings), *Every frame is a line of code* (a clock whose hand is the frame counter, growing into the next scene), *One prompt. Hundreds of films.* (a prompt pill that multiplies into a wall of films).
2. **Your agent**: a ticker of agent names on the accent colour (Claude Code, Codex, Cursor, opencode, Gemini CLI, Copilot). The chips use neutral glyphs, not the vendors' logos.
3. **Prompt**: the MCP tool switches on, the prompt types itself, the brand kit is attached, send.
4. **Generate + check**: the film code streams in, frames fly into a grid, `validate → review → sync → render` light up.
5. **Editor**: the headline is retyped, the look changes, tracks and playhead.
6. **Variants**: a wall of looks, hooks, languages and sizes.
7. **Sound**: a waveform that hits on the beat; the picture collapses to a line.
8. **Logo**: an iris opens on paper and the halftone eye builds itself dot by dot (`logo-dots.js`, sampled from `assets/brand/seekframe-mark.png` by `tools/logo-dots.mjs`), then the wordmark.

## Sound
Generated from cues (`cues()` in `film.js`) at 120 BPM: one beat is 15 frames, so every cut is on a beat. Filtered intro, a reverse
swell into the drop, a groove with a side-chained bass and chords, a breakdown under the typing, a second drop with an arp, silence and
a reverse swell, then a cinematic impact for the reveal. *Night* and *cream* use the deep theme, *electric* and *sunset* the bright one;
`music=hits` keeps only the hits.

## Prompt that started it
> Rewrite our launch film. It will be taken as a reference, so it should be powerful: elements, generations, text effects, transitions.
> Include the LLMs it works with, good gradients, variants with different hooks, stories and colours, our logo animated and revealed,
> and a powerful sound design. *(Three reference videos: dark kinetic type with a lime glow; an MCP prompt-box demo; blue blob gradients.)*

## What needed fixing after the first pass
- `SF.el` takes `(tag, class, parent, html)`; mixing up the order gave an empty film that still passed the contract checks. Look at the stills.
- `[films]?` rendered as `films ?`: the runtime now keeps punctuation next to a highlighted word.
- The scrolling tickers were reported as text overflow: they are marked `data-sf-ticker` now.
- The waveform was too flat between beats, and the clock's hand covered its counter.

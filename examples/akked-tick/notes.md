# What went wrong (and how it was fixed)

Real problems from building this film with an LLM. Most are now caught automatically by `validate`, `review` or `sync`.

| # | Problem | Cause | Fix / guard |
|---|---|---|---|
| 1 | **Sound out of sync in two of three variants** | The score was written as a separate script keyed to the first hook's timings | Cues are declared in `film.js` on the animation's frames, per hook. `seekframe sync` flags sound with no picture and big picture events with no sound. |
| 2 | Highlight wipe went **dark-on-dark** half way | Box animated, text colour switched at a threshold | `SF.wipe`: two layers sweep together, in reading direction. |
| 3 | **Arabic: elements jumped** to the wrong side | Transform-positioned elements without `left:0; top:0` are offset from the right in RTL | `SF.place`, rule in `docs/RTL.md`; the `.dot` class pins itself. |
| 4 | Arabic text looked cramped / broken joins | `letter-spacing` and `line-height: 1.04` from the Latin design | `[dir=rtl]` overrides: spacing 0, line-height ≥ 1.25. |
| 5 | Validator said "not deterministic" on a deterministic film | Exact image hashes; 1-level rasteriser noise | Pixel diff with tolerance (`validate`). |
| 6 | Responsive film laid out for the wrong size | Page was resized *after* it built its layout | `validate`/renderer rebuild (`applyParams`) at the real viewport. |
| 7 | **Bold text rendered as Black** after moving fonts to the brand kit | Font faces declared as single weights (600, 800); a request for 700 picked 800 | Weight ranges in `brand.json` (`"600 700"`). Found by pixel-comparing the port with the original. |
| 8 | `✓`/`✅` fell back to a different font | System fonts listed before emoji fonts in the stack | Emoji families first in the generated stack. |
| 9 | I claimed the *Burst* scene flashed ~3.3×/s (too fast) | Counted cuts, not flashes (a flash is a pair of changes) | Measured with `review`: **1 flash/s** in all variants (limit 3). Lesson: measure, don't guess. |

Open findings from `review` that we kept on purpose: small grey labels in the *mock* product UI (marked `data-sf-decorative`), and the deep-green style has no visible cut under the big logo "boom" (`sync` notes it).

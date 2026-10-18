# Right-to-left (Arabic, Hebrew, …)

Everything below is what we learned building `akked-tick-ar`; the same film code serves both directions.

1. Set `<html lang="ar" dir="rtl">` (or `window.FILM_LANG = 'ar'` before the runtime loads). `SF.lang.rtl` becomes true.
2. **Mirror horizontal layout** with `SF.X(x, W)`; use `SF.dirSign` (+1/−1) for "forward" motion; anchor text with `[rtl ? 'right' : 'left']`.
3. **Elements positioned only with `transform`** must be pinned: `SF.place(el, x, y)` or `left:0; top:0` in CSS, otherwise RTL offsets them from the right edge.
4. **Highlight wipes** must sweep in reading direction: `SF.wipe` does (a two-layer background so text never goes dark-on-dark mid-wipe).
5. **Letter spacing and tight line-height break Arabic joins**: use `letter-spacing: 0` and `line-height ≥ 1.25` for `[dir=rtl]`.
6. Use `SF.typed` (grapheme-aware) for typewriter text, and keep numbers/Latin inside Arabic text in an LTR isolate (`⁦…⁩`).
7. **Sound** pans are mirrored automatically by the engine for `lang.rtl` films.
8. Bundle an Arabic font (the brand kit's fallback is IBM Plex Sans Arabic, OFL) and check shaping in the stills.
9. Don't reverse icons that aren't directional (check marks stay; arrows flip).
10. Always run `seekframe review` on the RTL film and look at the sheet: overflow behaves differently with Arabic text widths.

# Accessibility

**What Seekframe checks for you**
- **Flashing (WCAG 2.3.1):** `validate` and `review` measure full-frame luminance at 15 fps and count flashes per second
  (a flash = a pair of opposing changes ≥ 10 % relative luminance, darker state < 0.8). More than 3 per second is a failure; 2–3 is a warning.
  `review` does this for every saved version. (Client's *Burst* scene, cutting every 0.3 s between black/white/lime, measures **1 flash/s**.)
- **Text contrast:** `review` hides the text, measures the real background under each text box, and compares it with the text colour:
  AA needs 4.5:1 (3:1 for large text: ≥ 24 px, or ≥ 18.66 px bold). Mark illustrative mock UI with `data-sf-decorative` to exclude it, and text that scrolls through the frame on purpose (a ticker or marquee) with `data-sf-ticker` to skip the overflow check for it.
- **Text leaving the frame** (overflow), at a mid and a late frame of every scene.
- `brand palette` prints the contrast of your brand colour pairs.

**What you still do**
- Give long text enough time on screen (≈ 0.3 s per word + 1 s) and keep it inside the safe area (`SF.layout().safe`).
- Don't convey meaning by colour alone; keep motion calm for key information.
- Captions/subtitles and audio description are on the roadmap; until then provide a transcript (the film's text params are all in the manifest).
- Set `lang` and `dir` correctly (`<html lang="ar" dir="rtl">`), bundle fonts with the right glyph coverage.

**The editor**: keyboard controls include transport, frame stepping, scene selection and resizing; tabs use roving focus, controls have labels, dialogs trap and restore focus, render progress is announced, and reduced-motion styling is enabled. The interface includes English/Arabic labels, RTL layout, light/dark themes, and visible focus. A formal assistive-technology audit remains before public release.

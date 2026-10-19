# Variants

Variants are **params + presets**, not copies of the film. In `seekframe-launch`: `hook` (3 stories) × `look` (4 colourways), plus a `sound` style.

```js
variants: {
  thumbFrame: 100,                                    // frame the Variants view samples (where variants differ)
  axes: [{ id: 'hook', label: 'Hook' }, { id: 'theme', label: 'Style' }],
  presets: [{ id: 'v1-doubt-mono', label: 'Doubt · mono', params: {} }, { id: 'v2-counter', label: 'Counter · deep', params: { hook: 'counter', theme: 'dark' } }],
}
```
- A param list may depend on a variant (`params: values => values.hook === 'counter' ? [...] : [...]`), and `cues` should too (each hook has its own sound).
- **Editor → Variants tab**: thumbnail per preset and saved version; click to apply/open.
- **Matrix render** (CLI):
  ```bash
  seekframe matrix seekframe-launch --axes "hook=*,look=night|cream" --fps 30     # * = every option of a select/boolean param
  seekframe matrix seekframe-launch,seekframe-feature-tour --versions --fps 60   # every saved version of both films
  seekframe render seekframe-launch --params "hook=clock,look=electric" --fps 60
  ```
  Output: `output/<film>-<param>-<value>_….mp4`.
- **Languages**: either a second film page that shares code (a second `film.html` that sets `window.FILM_LANG='ar'` and loads the same `film.js`) or a `lang` param. See [RTL.md](RTL.md).
- **Sizes**: films using `SF.layout()` can declare `sizes` (16:9, 9:16, 1:1) and export each with `--size WxH`.
- After building variants run `seekframe review <film>`: it checks **every saved version** (the dark theme and the lime theme differ in contrast and flashing).

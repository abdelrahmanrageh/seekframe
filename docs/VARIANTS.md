# Variants

Variants are **params + presets**, not copies of the film. In `client-tick`: `hook` (3 openings) × `theme` (3 styles) × `cards` (2 shapes),
plus Arabic as a second page sharing the same code.

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
  seekframe matrix client-tick --axes "hook=*,theme=mono|dark" --fps 30     # * = every option of a select/boolean param
  seekframe matrix client-tick,client-tick-ar --versions --fps 60            # every saved version of both films
  seekframe render client-tick --params "hook=cod,theme=lime" --fps 60
  ```
  Output: `output/<film>-<param>-<value>_….mp4`.
- **Languages**: either a second film page that shares code (`client-tick-ar`: `window.FILM_LANG='ar'`) or a `lang` param. See [RTL.md](RTL.md).
- **Sizes**: films using `SF.layout()` can declare `sizes` (16:9, 9:16, 1:1) and export each with `--size WxH`.
- After building variants run `seekframe review <film>`: it checks **every saved version** (the dark theme and the lime theme differ in contrast and flashing).

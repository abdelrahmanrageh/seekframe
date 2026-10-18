# 01 · Brand intake

**Use when:** starting a new brand. **Result:** `brand/brand.json`, `brand.css`, logo SVG and strokes.

```
Read docs/BRAND.md. I'm giving you my logo (logo.png) and my website/colours: <paste or describe>.
1. Run `seekframe brand init --name "<Brand>"`, then `seekframe brand palette logo.png --write` and show me the colours, the suggested roles and the contrast table.
2. Run `seekframe brand import-logo logo.png --strokes`. Open assets/logo-strokes.svg: tell me which strokes are real and which are stray, and delete the stray ones from logo-strokes.json. Explain the draw order you chose.
3. Fill voice.tone and voice.tagline in brand/brand.json from this description of the brand: <…>.
4. Fonts: I use <font name, licence>. Add it with `seekframe brand add-font` (mark --no-redistribute unless the licence clearly allows it). If I have none, keep the bundled fallbacks.
5. `seekframe brand build`. Report anything with poor contrast (e.g. accent on paper) and how films should use it.
```

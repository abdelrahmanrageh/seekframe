# Brand kit

The kit lives in `brand/` (copied into each film by `seekframe new`). Films read it via `brand/brand.css`
(fonts + `--brand-*` variables + `--font-display`/`--font-text`) and `brand/brand.js` (`window.BRAND`).

You can set it up in the editor: open **Brand** to edit the name, tagline, tone, colours, logo, and fonts; drop a logo image to trace it and preview suggested palette colours; use **Apply to this film** to copy the kit into the selected film. The **New film** wizard uses the workspace brand automatically. The Setup panel checks Node, Chromium, ffmpeg, and workspace readiness. Use the CLI below for scripts and CI; both paths call the same brand-kit functions.

```bash
seekframe brand init --name "Acme"                    # brand/brand.json (+ bundled Inter and IBM Plex Sans Arabic fallbacks)
seekframe brand palette logo.png --write              # colours + suggested accent/ink/paper/muted + WCAG contrast table
seekframe brand import-logo logo.png --strokes        # trace to SVG; extract centre-line strokes for the "draw the logo" effect
seekframe brand add-font Brand-Bold.woff2 --family "Brand Sans" --weight "600 700" --license "OFL-1.1"
seekframe brand build                                 # regenerate brand.css / brand.js after editing brand.json
```

**brand.json** `{ name, nameLocal, colors:{accent,ink,paper,muted}, fonts:[{family, role, files:{weight:path}, license, redistributable}], logo:{svg,strokes}, voice:{tone,tagline}, languages }`.
Font `files` keys may be weight ranges (`"600 700"`).

- **PNG/JPG → SVG** uses *imagetracerjs* (public domain). For clean flat logos it is excellent; photographic logos need a manual redraw.
- **Strokes**: thinning + tracing of each colour layer. It gives the draw-on animation for logos made of strokes (like a check mark);
  review `assets/logo-strokes.svg`, delete stray strokes, reorder the array for draw order. Filled lettering is better revealed with a mask.
- **Fonts and licences:** `redistributable: false` (or `--no-redistribute`) puts the files in `.gitignore`; the CSS falls back to the bundled
  OFL fonts for everyone who clones without them. Never commit a font whose licence forbids redistribution.
- `palette` warns when your accent has poor contrast on paper (a bright lime on white is ~1.3:1): use it as a *fill* behind dark text, not as text.

## Real logos and photos (not only illustrations)
Films are not limited to drawn shapes. Expose any picture as an `image` param (`{ id: 'logo', type: 'image', default: 'brand/assets/logo.png' }`):
in the editor it shows an upload control, and uploaded files are stored with the film. Use it for your **logo, product shots, photos and partner or
customer logos**; prefer SVG or a PNG with a transparent background, and `<img>` or CSS `background-image` in the film. `examples/seekframe-launch`
shows four uses: your logo for the reveal (`logo`), a logo for each name in the agent ticker (`a-img-1` … `a-img-6`), a photo in the editor preview
(`shot`), and the wordmark text (`end-word`). The film's agent chips ship with simple glyphs: other companies' logos are trademarks, so add the
official marks yourself under their brand guidelines. `seekframe brand import-logo` keeps a raster logo as it is when tracing would make it worse.

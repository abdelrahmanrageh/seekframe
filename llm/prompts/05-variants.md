# 05 · Variants

```
Read docs/VARIANTS.md. Add three hooks (select param "hook"), three styles (select "theme") and two card shapes ("cards") to films/<name>.
Params must depend on the hook where texts differ; cues must too (each hook gets sound cued to ITS motion).
Declare variants.presets for the combinations I'd pick from and a thumbFrame where they differ.
Create saved versions with the set_params tool (or projects/*.json). Run `seekframe review <name>`: it must pass for EVERY version.
Render the previews: `seekframe matrix <name> --versions --fps 30`.
```

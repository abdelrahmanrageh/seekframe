# 04 · Script → film

```
Read docs/FILM_SPEC.md and docs/RUNTIME.md. Create the film with `seekframe new <name> --width W --height H`.
Implement the script in films/<name>/film.js using SF.define: scenes exactly as scripted; every on-screen string, number, colour, size and switch as a param
(prefer cssVar params; use ...SF.brandParams()); seek(f) a PURE function of f (no Date/Math.random/timers/CSS animation); build the DOM once per applyParams.
Declare cues on the same frames you animate on. Use the brand kit (fonts via var(--font-display), colours via --brand-*).
Then loop until clean: `seekframe validate <name>` → fix failures, read warnings → `seekframe review <name>` → LOOK at the contact sheet and fix overflow/contrast/empty frames.
Finish by rendering a 30 fps draft: `seekframe render <name> --fps 30`.
```

# Plan: make every Seekframe film look and sound professional, whatever LLM writes it

Status: plan, nothing built yet. Owner: Seekframe core.

## 1. Why this plan
A user generated the Menastk AI-chat film with another LLM. The story and copy were right; the film was not
professional. What the frames and the audio show (40 s, 1920x1080, 60 fps):

| Problem | What we saw |
|---|---|
| UI too small | The chat and quiz cards fill about a third of the frame width; their text is unreadable on a phone. |
| Background dominates | A large, slow purple wave fills most of the frame; the product sits in a dark corner of it. |
| Static holds | Cards fade in, sit still for seconds, fade out. Little camera, no morphs, no follow-through. |
| Weak hierarchy | Small headline above a small card; nothing leads the eye. |
| Sound almost silent | The waveform is flat for most of the 40 s, with about ten short, quiet blips. Long silences read as "not synced". |
| Soft ending | The logo fades in on an empty frame; no hit, no reveal. |

Every Seekframe check passed for that film. That is the real problem: today the checks prove a film is **correct**
(deterministic, editable, no overflow, contrast, no flashing). Nothing checks whether it is **good**.

## 2. Root causes
1. **LLMs cannot watch or listen.** They write motion blind. Unless something measures craft and tells them, they
   stop at "it runs".
2. **No motion vocabulary.** The runtime gives easing and `pop`, so every film reinvents entrances, timing and transitions.
   Weaker models fall back to fades.
3. **Sound is written separately from motion.** Cues are a second list kept in sync by hand, so they drift, go missing
   or are too quiet.
4. **References carry no timing data.** The gallery shows finished films but not *why* they work: shot lengths, how
   long each beat lasts, which sound goes on which frame.
5. **Instructions are long and soft.** "Make it dynamic" does not change what a model writes. Numbers and checks do.

## 3. Strategy: five pillars, most important first

### Pillar A. Craft checks in `review` (a quality score that any model can read)
A new `seekframe review <film> --craft` (and MCP tool `critique`) measures the rendered film and prints a score per
category with a ranked **fix list** in plain words, plus contact sheets. Agents must iterate until the score passes.
Thresholds are defaults; a film can opt out of one check on one element with a reason (`data-sf-allow="hold: logo end card"`).

| Check | How it is measured | Default threshold | Fix hint the agent gets |
|---|---|---|---|
| Readability | text box heights at the output size | headline >= 4.5 % of the short side, body >= 2.2 % | "Scene prompt: body text is 14 px at 1080p; make it at least 24 px or crop in." |
| Occupancy | union of non-background elements at mid-scene, inside the safe area | >= 55 % of the safe area | "Scene review: content covers 28 % of the frame; scale the card up or move the camera in." |
| Background dominance | contrast and area of the background vs the content | background must not out-contrast the main element | "The waves are brighter than the card; dim or blur them." |
| Motion presence | pixel change per 0.25 s window | no still window longer than 1.2 s (except marked holds) | "Scene math: 2.1 s with no motion at 18.2 s." |
| Entrances | time from scene start to the first visible change | <= 6 frames at 30 fps | "Scene insert starts static for 0.7 s." |
| Transitions | motion around each cut | something moves across every cut (+/- 6 frames); no plain fade-through-black unless chosen | "Cut at 12.0 s is a fade; use a morph, push or wipe." |
| Pacing | scene lengths, words on screen per second | scenes 1.5 to 6 s; reading time >= 0.25 s per word on screen | "Scene review shows 31 words for 1.6 s." |
| Hierarchy | size ratio of the largest text to the rest | one dominant element per scene (>= 1.6x the next) | "Headline and card text are the same size." |
| Sound coverage | rendered score | no silence longer than 1.5 s (except marked silences); >= 1 cue per second on average | "No sound from 14.1 to 18.9 s." |
| Sound sync | picture events (big pixel changes) vs cue onsets | every big event has a cue within +/- 3 frames; every cue sits near an event | "Card lands at 21.4 s with no sound." |
| Loudness | EBU R128 of the mix | within 1 LU of the target, true peak <= -1 dBTP, short-term never below target - 20 LU for > 2 s | "Mix is 14 LU under target." |
| Existing checks | overflow, contrast, flashing, determinism | unchanged | |

The score is the weighted mean (0 to 100). `--min-score 80` fails CI. `sync` and overflow stay warnings only when
the film marks them as intended.

### Pillar B. A motion + sound kit in the runtime (sync by construction)
One call animates an element **and** registers its sound, so they cannot drift.

```js
const T = SF.timeline();                       // one source of truth for picture and sound
T.rise(card, 12, { from: 'below' });           // enter: translate + blur + fade, expo-out, 14 f; cue: soft swipe
T.type(prompt, text, 40, 92);                  // characters + real keystrokes (space bar on spaces)
T.pop(chips, 60, { stagger: 6 });              // spring scale; cue: tick + thud per chip, panned by x
T.count(counter, 0, 15850, 70, 100);           // number roll; cue: accelerating ticks
T.press(button, 104);                          // press + ring; cue: click
T.fly(card, { to: slot }, 120, 140);           // move with motion blur; cue: whoosh panned along the path
T.morph(pill, line, 150, 160);                 // shape to shape; cue: swipe
T.reveal(logo, 900, { style: 'iris' });        // mask reveal; cue: silence before, impact on the frame
// seek(f) => T.draw(f);  cues() => T.cues()
```

- **Motion tokens**: durations (fast 8 f, base 14 f, slow 22 f at 30 fps), easings (expo-out to enter, in-quad to exit,
  back-out for pops), stagger (4 to 6 f), overshoot amounts. The kit defaults are the house style; films override.
- **Sound mapping**: each primitive has a default sound (enter = swipe, pop = tick + thud, land = thud, type = key,
  success = double tick, reveal = impact, transition = whoosh), panned by screen position and mirrored for RTL. Gains are
  set so the mix is never too quiet.
- **Components** built on the kit, used by the templates and by agents: blob background, pill, card, browser frame,
  phone frame, chat composer, table rows, counter, chip chain, ticker, text on a curve, QR scanner, logo reveal (dots,
  mask, strokes), camera (push, pan, focus on an element).
- **Responsive canvas**: the 9:16 / 16:9 / 1:1 scaling we built for the Menastk film (UI on one canvas, headlines move
  to a column) becomes a runtime helper, so every film gets all sizes.

### Pillar C. References that carry timing, not just pictures
- **Gallery with craft notes**: for each example film, a beat sheet (scene, frame, what moves, which cue), a contact
  sheet, the sound map and the score from Pillar A. Start with `seekframe-launch` and a generic version of the Menastk
  platform film (no client content).
- **Before/after pairs**: the user's film above next to a fixed version, with the fix list that got there.
- **`docs/MOTION.md`**: the pattern library (entrances, morphs, camera moves, transitions, counters, typing, reveals)
  with short GIFs and the kit call for each.
- **Templates**: `seekframe new --template product-tour | launch | feature-reel | app-promo-9x16`, each a complete,
  scoring film the agent edits instead of starting blank.
- **Reference analysis**: `seekframe analyze reference.mp4` measures a reference video (shot lengths, motion energy,
  loudness curve, silence map) and writes targets the craft checks use for that film, so "make it like this" becomes
  numbers.

### Pillar D. Short, hard instructions for every agent
`AGENTS.md`, the Claude skill, Cursor rules and the MCP tool descriptions get a one-screen **craft contract**:
1. Write a beat sheet first (scene, frames, what moves, which sound), then build.
2. Build with the kit (`SF.timeline`), not raw transforms and separate cue lists.
3. The main element fills most of the frame; text sizes per the table; nothing sits still for more than 1.2 s.
4. Every visual event has a sound on the same frame; no silence over 1.5 s unless it is a deliberate pause before a reveal.
5. Run `review --craft` and fix everything on the list until the score passes; look at the contact sheets.
Prompt library: three model-agnostic briefs that produce scoring films.

### Pillar E. The loop the tools enforce
`seekframe make` (and the MCP flow) runs: brief, then beat sheet, then build, then `validate`, then `review --craft`,
then fix, repeat (at most N rounds), then render. The editor shows the score and the fix list in a **Quality** panel,
so a human can see why a film is weak and fix it by hand.

## 4. Phases

| Phase | Scope | Done when |
|---|---|---|
| 1. Measure | Pillar A: craft checks, score, fix list, MCP `critique`, editor Quality panel (read-only) | The user's film scores low with the problems in section 1 listed; our launch and Menastk films score >= 85 |
| 2. Kit | Pillar B: `SF.timeline`, motion tokens, sound mapping, 10 components, responsive canvas | The launch film rebuilt on the kit has the same look in less code and passes sync with zero warnings |
| 3. References | Pillar C: craft notes, before/after, MOTION.md, 4 templates, `analyze` | Each template scores >= 85 out of the box |
| 4. Instructions and loop | Pillar D and E: craft contract, prompt library, `make` loop | Benchmark (below) passes |

Phases 1 and 2 can run in parallel; 3 depends on 2; 4 on 1 to 3.

## 5. How we know it worked (benchmark)
- Three briefs (product tour, app promo 9:16, launch) run through four agents (Claude, Codex, Gemini, an open model
  through opencode) with only the repo instructions.
- Measure: craft score, rounds to pass, and a blind human rating (1 to 5) of 12 films before and after.
- Target: median craft score >= 80 on the first render and >= 90 after the loop; human rating up by at least 1 point;
  no film with silence over 1.5 s or unreadable text.

## 6. Risks and how we handle them
- **Checks that are too rigid** make films look the same: thresholds are defaults, every check has a marked opt-out
  with a reason, and the score never blocks a human in the editor.
- **False positives** (a deliberate still logo, a quiet pause): `data-sf-allow` on the element or a cue marked `pause`.
- **Speed**: craft checks sample frames (every 0.25 s) and reuse the review render; target under 60 s for a 30 s film.
- **The kit becomes a cage**: raw `seek` stays allowed; the kit is the easy path, not the only one.
- **Sound taste varies**: the mapping is per theme (deep, bright, minimal) and per film, and gains are params.

## 7. Review notes and additional risks (2026-10-20)
The plan is sound on diagnosis (checks prove *correct*, not *good*) and on ordering (measure, then build the kit, then
references, then instructions). Points to settle before building, and the risks they carry.

### Design changes to make
- **Measure from the DOM first, pixels second.** Films are HTML, so readability, occupancy, hierarchy and safe-area
  checks can read element boxes and computed styles exactly. Segmenting "content vs background" from pixels is
  fragile. Use pixels only for motion presence and background dominance, and audio only for the sound checks.
- **Calibrate thresholds on more than one film.** Today they come from one failure (the Menastk film, n = 1).
  Before Phase 1 is "done", run the checks on every gallery film plus 5 to 10 deliberately different styles (minimal
  typographic, 9:16, 1:1, long-form, no-sound) and tune so good films pass without opt-outs.
- **Sync check is partly circular.** For kit films cues come from the same timeline, so "sync" passes by construction.
  Its value is for raw `seek` films; say so, and make the kit film pass a check that is not derived from the same call
  (rendered audio onsets vs rendered picture events).

### Risks
| Risk | Why it matters | Mitigation |
|---|---|---|
| **Goodhart: agents game the score** | A model can add jitter to pass "motion presence", a tick every second to pass "coverage", or `data-sf-allow` everywhere | Count only meaningful motion (area and displacement above a floor); cap how many opt-outs a film may use and show them in the report and score; the human rating in the benchmark is the real target |
| **Overfitting to one film** | Thresholds like "55 % occupancy" or "1.2 s still" can punish restrained, editorial or typographic styles | Per-style profiles (e.g. `profile: "editorial"`), thresholds in `seekframe.json`, calibration set above |
| **Score read as taste** | A score of 85 does not mean the film is good; users may stop looking | Keep the "look at the images" rule in AGENTS.md; report which checks are measured vs advisory |
| **Accessibility conflict** | "Something moves across every cut" and "no still window" push toward more motion, against `docs/ACCESSIBILITY.md` (calm motion, flashing limits) | Motion checks never override the flashing limit; add a calm profile where holds and fades are allowed; review the craft contract against ACCESSIBILITY.md |
| **Runtime API churn after publishing** | 0.2.0 is on npm. `SF.timeline` and a changed film contract mean films written against 0.2.x may break | Additive only until 1.0: the kit is new API, raw `seek` and `cues` keep working; record the kit version in the film manifest; document it in CHANGELOG and FILM_SPEC |
| **Scope and sequencing** | Four phases, about 10 components, `analyze`, `make` and an editor panel is a lot; Phase 2 and 3 are the big spend | Ship Phase 1 alone (it is useful even if nothing else lands); cut components to what the templates need; defer `analyze` and `make` until Phases 1 to 3 prove out |
| **Benchmark is weak as written** | 3 briefs x 4 agents, 12 films and one blind rating is noisy; model versions drift; Gemini and open models add cost and setup | Fix model versions and seeds in the report; at least 3 raters; compare against the same briefs run with the old instructions; accept "no regression and a clear gain" rather than a precise number |
| **Reference analysis and copyright** | `analyze reference.mp4` implies third-party videos | Keep only the numbers it writes; follow the existing rule: never commit third-party videos or stills, only the written analysis |
| **Client content in a public repo** | The plan names the Menastk film and a "generic version" for the gallery | Confirm the client is fine with being named; strip names from this document if not; no client copy, logos or footage in `examples/` |
| **Render cost in CI** | `review --craft` needs rendered frames and audio; the launch film already timed out in unit tests on CI | Sample frames (as planned), reuse the review render, run craft checks in the workflow like launch validation, not in unit tests |
| **Fix hints that mislead** | A wrong hint sends the agent in circles ("make it 24 px" when the fix is to crop) | Hints state the measurement and the target, not only the remedy; test hints on the fixture films |

### Suggested first step
Phase 1 only, in this order: (1) DOM-based readability, occupancy and hierarchy; (2) sound coverage and loudness from the
rendered audio (cheap and objective, and it catches the "almost silent" film); (3) motion presence and transitions;
(4) the score, the fix list and the MCP `critique` tool. Keep the editor Quality panel for after the CLI report is trusted.

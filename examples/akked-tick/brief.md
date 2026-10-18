# Akked — horizontal brand film: style brief and script

**Working title:** *The Tick*  
**Format:** 1920×1080, 16:9, 30 fps (export at 60), English, about 35 s, no voice-over (an optional voice-over line set is at the end)  
**References:** four third-party brand videos (not included in this repo; keep references local and commit only the written analysis).

---

## 1. What the references have in common

| | Ref A (green, product) | Ref B (mint on black) | Ref C (colour 3D) | Ref D (red identity, the latest one) |
|---|---|---|---|---|
| Length / cuts | 28 s, almost no hard cuts | 14 s, fast cut cluster at 2–3 s | 40 s, mixed | 34 s, long builds then a 0.3 s burst |
| Palette | one hue (green) with glow | black + one accent | many colours | white/black + one accent (red) |
| Signature move | word pills orbiting a "?" | handwritten stroke draws "24" | type on ribbons, blobs | logo built from a square, guides and anchor points |

The shared language, which is what we copy:

1. **The brand is the subject.** These films don't tell a customer story. They show the identity *being built*: a
   primitive (dot, square, ring) turns into the mark, the mark gets a construction grid, then type, UI, and the system
   in use. It reads as "designed and expensive".
2. **One accent on a neutral.** White or black backgrounds, alternating by act with hard cuts, and a single hero
   colour used sparingly (in Ref D the red covers maybe 10–20% of the frame). Secondary words are grey, not coloured.
3. **Primitive geometry as transitions.** A shape grows to fill the frame and becomes the next background. A block
   splits into bars. Dashed construction lines with small square anchor handles (the design-tool look). Labelled shape
   "cards".
4. **Big, calm kinetic type.** One idea per line, built word by word, left-aligned or centred, with lots of negative
   space. Keywords are set apart by colour or weight ("a friendly home" in grey; "24 mois" in mint), never by effects.
5. **Product UI as an object.** Screens tilted in 3D perspective with depth-of-field blur, glass pills and soft glow,
   and slow push-ins (Ref A). Real mock-ups appear only briefly.
6. **Rhythm: slow build, then a burst.** The logo construction takes about 5 s; the system montage cuts every
   0.3–0.4 s; the end lock-up holds 3–4 s on white.
7. **Easing:** fast expo-out settles, no bounce, motion blur on whips, very little idle wobble.

## 2. The sound of the latest video (Ref D)

Measured from the file:

| | Ref D reference | Our earlier Akked mix |
|---|---|---|
| Loudness | −24 LUFS integrated | −14 LUFS |
| Dynamic range (LRA) | **18 LU** (cinematic) | 2 LU (a constant wall of sound) |
| Energy below 120 Hz vs ~2.5 kHz | **+15 dB** (bass-led) | +7 dB |
| Energy above 7 kHz | −57 dB (almost no air or hiss) | −34 dB (bright) |
| Silence | two real silences (14–16 s, end) | none |
| Pulse | hits on a ~75 bpm grid (0.8 s); a 0.3 s hit run under the end montage | effects follow the on-screen events |

What that means for the design:
- **Sub-bass impacts** carry the edit. 80–90% of the energy in each hit is under 150 Hz: a sine "boom" that drops
  in pitch, not a bright crash.
- **Sparse, dark texture between hits:** quiet airy tones and soft clicks, around −44 dB.
- **Silence is a tool:** the sound cuts to nothing right before the big reveal, so the next hit lands harder.
- **Every hit sits on a cut.** Sound and picture change together.

Our version: keep that deep, sparse, dynamic character, but master to about **−16 LUFS** (true peak −1 dBTP,
LRA about 8 LU). −24 LUFS is too quiet for social feeds and would get turned up and squashed by the platforms.

## 3. Mapping it to the Akked identity

| Reference device | Akked version |
|---|---|
| Hero colour | **Lime `#84FF00`** only. Neutrals `#0B0B0B` / `#FFFFFF`. Secondary text grey `#8E9590`. `#C9FF7A` for highlight boxes, `#3C6300` for text on lime. No other hues. |
| Primitive → mark | **The lime dot** we already use becomes the **check stroke** of the Akked mark, then the black **A stroke** completes it. The tick is the brand's story (an order confirmed), so building the logo *is* the message. |
| Construction grid | Dashed guides and square anchor handles trace the A and the check, then spacing guides around the lock-up. |
| Labelled shape cards (Ref D) | **WhatsApp chat-bubble shapes** (rounded box with a tail) in lime, each carrying one word: *Confirmed / Replied / Shipped / Recovered / Sent*. They morph into each other. |
| Word pills around "?" (Ref A) | The seller's doubts as grey pills orbiting a lime "?" circle. |
| Product UI with depth of field | The Akked dashboard and the WhatsApp phone we already draw, tilted, with focus pulls. |
| Type | Thmanyah Sans, bold for statements and regular for grey secondary words. Keywords go in the existing lime `hbox`. |
| Black/white acts | Act 1 (the problem) on black. Act 2 (the brand) on white. Act 3 (the product) on black. End card on white. |

What we don't copy: Ref C's multi-colour 3D blobs (off-brand), stock photography, and fake numbers. We make no
statistical claims. Real figures can go in later as params.

## 4. Script — *The Tick* (35 s)

Times are seconds and frames are at 30 fps. "Hit" means a sub-bass impact on the cut.

| # | Time | Picture | On-screen text | Sound |
|---|---|---|---|---|
| 1 **Ping** | 0.0–3.0 (0–90) | Black. A lime dot drops in from above, lands centre with a squash, and glows twice like a notification. Small grey label fades in under it. | `New order` | 0.3 s: deep sub thump (55→38 Hz). Two quiet high ticks with the glows. Low drone fades in. |
| 2 **Doubt** | 3.0–7.0 (90–210) | The dot grows into a lime "?" circle on the right. Grey glass pills orbit and stack to its left one by one, each pushing the last back in depth (Ref A move). | `Is it real?` · `Will they answer?` · `Will they pay?` · `Will it come back?` | A soft click per pill on the 0.8 s grid. The drone gets a slow low-pass sweep up. |
| 3 **The call** | 7.0–9.5 (210–285) | The pills collapse into one line. A grey phone outline vibrates; three "missed call" ghosts slide off. Hard cut to **black and silence** for 0.5 s. | `Calling every customer doesn't scale.` | Muffled, low-passed ring pattern (twice), then a hard stop: **0.5 s total silence**. |
| 4 **Construct** | 9.5–14.5 (285–435) | Cut to white. The lime dot sits at the check's start point. Dashed guides draw in with square anchors; the dot draws the **check** stroke along them; the black **A** stroke follows; the wordmark slides in; spacing guides (`1x`, `2x`) frame the lock-up and then fade. | (wordmark) `Akked` | 9.5 s: **big sub boom** with a long tail. Mechanical micro-clicks on each anchor. Rising filtered air into 14 s. Small hit when the lock-up settles. |
| 5 **Line** | 14.5–18.0 (435–540) | White, left-aligned large type built word by word (Ref D move). The grey words turn lime in a box as the sentence completes. | `Akked confirms every order on WhatsApp` / `before you ship it.` | Low warm pad, a soft key tick per word, no hits. A breathing space. |
| 6 **Bubbles** | 18.0–21.2 (540–636) | Lime chat-bubble cards pop in on the beat and morph shape-to-shape across the frame; each label crossfades. | `Confirmed` → `Replied` → `Shipped` → `Recovered` | Four deep plucked sub notes on the 0.8 s grid, each a step higher (D–F–A–D). |
| 7 **Product** | 21.2–26.6 (636–798) | Black. The dashboard tilts in with depth of field and the camera pushes in. Row `#1021` flips `Pending → Confirmed`. The phone slides in front with the confirmation chat and a glass `Akked AI is replying…` chip glows. Focus racks from dashboard to phone. | Small corner caption: `Order confirmation · AI replies · Shipping updates` | Dark pulse bed at 75 bpm. Soft UI clicks synced to the row flip and the message ticks. A low hit on the focus rack. |
| 8 **Burst** | 26.6–29.0 (798–870) | Montage, a cut every 0.3 s, alternating black / white / lime: Confirmed pill · double tick · cart · box · `1,240 customers` · campaign send button · location pin · tick. | (single words on some cuts) | A hit on every cut, the run accelerating slightly, then a hard stop. |
| 9 **Breath** | 29.0–29.7 (870–891) | White, empty. Only the lime dot, centre. | — | **Silence** (room tone only). |
| 10 **End card** | 29.7–35.0 (891–1050) | The dot draws the check, the A completes, wordmark lock-up centred. Tagline below, URL smaller. Holds. | `Akked` · `Every order. Confirmed.` · `akked.app` | **Final sub boom** with a 3 s tail. A soft double-tick (the brand sound) as the check completes. Fade to silence. |

**Tagline options** (an editable param, so it can change without code): *Every order. Confirmed.* / *Confirmed before
it ships.* / *Sell more. Call less.*

### Optional voice-over (if a social version needs one)

Calm, low male voice, a lot of space between lines. Only on scenes 2, 5 and 10:
- (sc. 2) "A new order. But is it real?"
- (sc. 5) "Akked confirms every order on WhatsApp — before you ship it."
- (sc. 10) "Akked. Every order, confirmed."

## 5. Sound design spec (to synthesise with the existing Seekframe sound engine (`src/sound/engine.js`))

- **Key/tempo:** D minor, 75 bpm (0.8 s per beat). Hits land on cuts, and cuts land on the grid where possible.
- **Sub boom:** sine 55→38 Hz pitch drop over 0.25 s, 2–3 s exponential decay, a little saturation for harmonics
  (so it is audible on phones), and a 1–2 kHz transient click at −20 dB.
- **Drone/pad:** D1 + A1 sines plus band-limited noise, low-passed at 400 Hz → 1.2 kHz over Act 1. Very quiet (−30 dB).
- **Clicks/ticks:** 3–8 ms filtered transients, 1.5–3 kHz, −24 dB; the brand double-tick = two ticks 70 ms apart, the
  second slightly higher.
- **Whooshes:** low-passed noise (cut-off ≤ 3 kHz) with a short pitch-down, only on whips and the burst.
- **Silence:** true digital silence at 9.0–9.5 s; room tone only at 29.0–29.7 s.
- **Mix:** high-shelf −6 dB above 8 kHz, nothing bright. Master −16 LUFS, −1 dBTP, LRA about 8 LU. 48 kHz stereo.
  Bass in mono below 120 Hz.

## 6. How it will be built

A film following `docs/FILM_SPEC.md`, so everything above is editable in the editor:
- **10 scenes** as in the script.
- **Params:** every line of on-screen text, the tagline and URL, the four bubble labels, the doubt pills, accent and
  background colours (`cssVar`), headline size, and the burst items.
- **Audio:** `sound` (the new design, timeline-synced) plus an optional `vo` track.
- **Reused from the current films:** the Akked mark paths, wordmark, fonts, dashboard and phone.

# 06 · Sound design

```
Read docs/SOUND.md. The film must declare cues (SF.cues) and a generated audio track.
Style: <deep sub-led / bright / minimal> — hits exactly on cuts and landings, sparse beds, a true silence before the reveal, one repeating brand sound (the double tick), nothing above ~8 kHz.
For each hook/variant, cue its own motion (counters tick along their count curve; sliding things pan from p0 to p1; RTL mirrors automatically).
Then run `seekframe sound <name>` and `seekframe sync <name>`: every "sound without picture" / "picture without sound" must be fixed or justified in a comment.
Master target −16 LUFS (−14 for loud social, −23 broadcast); report the LUFS/LRA you measured.
```

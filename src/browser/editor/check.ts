// "Check text": finds text that leaves the frame (cheap, runs right in the preview). Contrast and flashing need pixels: use `seekframe review`.
import { probeText } from '../../core/probe';
import { S } from './state';
import { pause, seek, sceneName } from './film';
import * as Timeline from '../../core/timeline';

export interface TextIssue { scene: string; frame: number; text: string; px: number }
function scanHere(): Array<{ text: string; px: number }> {
  const r = probeText(S.film as unknown as Window), out: Array<{ text: string; px: number }> = [];
  for (const it of r.items) { const over = Math.max(-it.x, -it.y, it.x + it.w - r.W, it.y + it.h - r.H); if (over > 6) out.push({ text: it.text, px: Math.round(over) }); }
  return out;
}
export function checkCurrent(): TextIssue[] {
  const clip = Timeline.clipAt(S.tl, S.frame); return scanHere().map(i => ({ ...i, scene: sceneName(clip.scene), frame: Math.round(S.frame) }));
}
/** looks at a mid and a late frame of every scene (the playhead is restored afterwards) */
export function scanAll(): TextIssue[] {
  pause(); const keep = S.frame, seen = new Set<string>(), out: TextIssue[] = [];
  for (const c of S.tl.clips) for (const k of [.5, .85]) {
    const f = Math.round(c.t0 + (c.t1 - c.t0) * k); seek(f);
    for (const i of scanHere()) { const key = c.scene + i.text; if (!seen.has(key)) { seen.add(key); out.push({ ...i, scene: sceneName(c.scene), frame: f }); } }
  }
  seek(keep); return out;
}

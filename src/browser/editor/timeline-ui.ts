// The timeline under the preview: scene segments (drag or arrow-key the right edge to change length), scrubbing, waveform + cue markers, snapping.
import * as Timeline from '../../core/timeline';
import { $, $$, clamp, el, esc } from './dom';
import { S, bus } from './state';
import { changed, gotoClip, pause, retime, saveSoon, seek, sceneName, timeLabel } from './film';
import { waveSource } from './playback';
import { t } from './i18n';

/* ---------- waveform ---------- */
const peakCache = new Map<string, Promise<Float32Array | null>>();
const PPS = 100;                                              // peaks per second of source audio
function peaks(url: string): Promise<Float32Array | null> {
  if (!peakCache.has(url)) peakCache.set(url, (async () => {
    try {
      const buf = await (await fetch(url)).arrayBuffer(); const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const a = await new Ctx().decodeAudioData(buf), ch = a.getChannelData(0), per = Math.floor(a.sampleRate / PPS), out = new Float32Array(Math.ceil(ch.length / per));
      for (let i = 0; i < out.length; i++) { let m = 0; for (let k = i * per, e = Math.min(ch.length, k + per); k < e; k += 4) m = Math.max(m, Math.abs(ch[k])); out[i] = m; }
      return out;
    } catch { return null; }
  })());
  return peakCache.get(url)!;
}
/** cue positions on the EDITED timeline (frames): source frame -> clip.t0 + (f - in) / rate; a cue inside a duplicated scene appears twice */
export function cueTimes(): number[] {
  const out: number[] = [];
  for (const c of S.manifest.cues || []) for (const k of S.tl.clips) if (c.f >= k.in && c.f < k.out) out.push(k.t0 + (c.f - k.in) / k.rate);
  return out.sort((a, b) => a - b);
}
let drawToken = 0;
export async function drawWave(): Promise<void> {
  const cv = $<HTMLCanvasElement>('#wave'), tr = $('#track'); if (!cv || !S.tl) return;
  const W = tr.clientWidth, H = tr.clientHeight, dpr = window.devicePixelRatio || 1, my = ++drawToken;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const g = cv.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const css = getComputedStyle(document.documentElement), wave = css.getPropertyValue('--wave').trim() || '#84ff00', cue = css.getPropertyValue('--cue').trim() || '#ffb84d';
  const src = waveSource(), data = src ? await peaks(src.url) : null; if (my !== drawToken) return;
  const px = W / S.tl.total, mid = H * 0.62, amp = H * 0.36;
  if (data) {
    g.fillStyle = wave; g.globalAlpha = .55;
    for (let x = 0; x < W; x++) {
      const f0 = x / px, f1 = (x + 1) / px;                                 // edited frames covered by this pixel column
      let s0: number, s1: number;
      if (src!.sync === 'free') { s0 = f0 / S.fps - src!.offset; s1 = f1 / S.fps - src!.offset; }
      else { const c = Timeline.clipAt(S.tl, (f0 + f1) / 2); s0 = (c.in + (f0 - c.t0) * c.rate) / S.fps; s1 = (c.in + (f1 - c.t0) * c.rate) / S.fps; }
      if (s1 < 0) continue; let m = 0; for (let i = Math.max(0, Math.floor(s0 * PPS)); i <= Math.min(data.length - 1, Math.ceil(s1 * PPS)); i++) m = Math.max(m, data[i]);
      const h = Math.max(1, m * amp); g.fillRect(x, mid - h, 1, h * 1.6);
    }
  }
  g.globalAlpha = 1; g.fillStyle = cue;                                      // cue markers: little ticks along the top
  for (const f of cueTimes()) { const x = Math.round(f * px); g.fillRect(x, 3, 2, 8); }
}

/* ---------- segments ---------- */
function build(): void {
  const tr = $('#track'); tr.querySelectorAll('.seg').forEach(e => e.remove());
  S.tl.clips.forEach((_c, i) => {
    const seg = el('div', 'seg', '<span class="lbl"></span><span class="grip" role="separator" aria-orientation="vertical" tabindex="0"></span>'); tr.insertBefore(seg, $('#head'));
    seg.addEventListener('dblclick', () => gotoClip(i));
    const grip = seg.querySelector<HTMLElement>('.grip')!;
    grip.addEventListener('pointerdown', e => startResize(e, i));
    grip.addEventListener('keydown', e => {                                       // keyboard: ←/→ ±0.1 s, shift ±1 s
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); e.stopPropagation();
      const d = (e.key === 'ArrowRight' ? 1 : -1) * Math.round((e.shiftKey ? 1 : 0.1) * S.fps);
      S.project.clips[i].frames = Math.max(Timeline.MIN_FRAMES, S.tl.clips[i].t1 - S.tl.clips[i].t0 + d); retime(); changed();
    });
  });
  update();
}
function update(): void {
  $$('.seg').forEach((d, i) => {
    const c = S.tl.clips[i]; if (!c) return; const len = (c.t1 - c.t0) / S.fps;
    d.style.flex = `${c.t1 - c.t0} 1 0`; ($('.lbl', d)).textContent = `${i + 1} ${sceneName(c.scene)}`;
    d.setAttribute('aria-label', `${t('tab.scenes')} ${i + 1}: ${sceneName(c.scene)}, ${len.toFixed(1)} s`);
    const g = $('.grip', d); g.setAttribute('aria-label', `${t('scene.length')} · ${sceneName(c.scene)} (${len.toFixed(2)} s)`); g.setAttribute('aria-valuenow', len.toFixed(2));
  });
  void drawWave();
}
function startResize(e: PointerEvent, i: number): void {
  e.stopPropagation(); e.preventDefault(); pause();
  const grip = e.currentTarget as HTMLElement; grip.setPointerCapture(e.pointerId);
  const x0 = e.clientX, f0 = S.project.clips[i].frames, pxPerFrame = $('#track').getBoundingClientRect().width / S.tl.total, startEnd = S.tl.clips[i].t0;
  const cues = e.shiftKey ? [] : cueTimes();
  const move = (ev: PointerEvent) => {
    let frames = Math.round(f0 + (ev.clientX - x0) / pxPerFrame);
    if (!ev.shiftKey) {                                                           // snap the scene's end to a nearby cue (hold shift to disable)
      const end = startEnd + frames; let best = 0, bd = 7 / pxPerFrame;           // 7 px
      for (const c of cues) { const d = Math.abs(c - end); if (d < bd) { bd = d; best = c; } }
      if (best) frames = Math.round(best - startEnd);
    }
    S.project.clips[i].frames = Math.max(Timeline.MIN_FRAMES, frames); retime(); saveSoon();
  };
  const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); changed(); };
  grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
}

/* ---------- scrubbing + playhead ---------- */
export function initTimeline(): void {
  const tr = $('#track'); let drag = false;
  const at = (e: PointerEvent) => { const r = tr.getBoundingClientRect(); return (e.clientX - r.left) / r.width * S.tl.total; };
  tr.addEventListener('pointerdown', e => {
    if ((e.target as HTMLElement).classList.contains('grip')) return;
    drag = true; tr.setPointerCapture(e.pointerId); pause(); seek(at(e)); bus.emit('select', Timeline.clipAt(S.tl, S.frame).i);
  });
  tr.addEventListener('pointermove', e => { if (drag) seek(at(e)); });
  tr.addEventListener('pointerup', () => { drag = false; });
  const slider = $('#scrub');                                                    // keyboard + screen-reader access to the playhead
  slider.addEventListener('keydown', e => {
    const step = e.shiftKey ? S.fps : 1; let f = S.frame;
    if (e.key === 'ArrowRight') f += step; else if (e.key === 'ArrowLeft') f -= step; else if (e.key === 'Home') f = 0; else if (e.key === 'End') f = S.tl.total - 1;
    else if (e.key === 'PageUp') { const c = Timeline.clipAt(S.tl, S.frame); f = (S.tl.clips[Math.max(0, c.i - 1)]).t0; } else if (e.key === 'PageDown') { const c = Timeline.clipAt(S.tl, S.frame); f = (S.tl.clips[Math.min(S.tl.clips.length - 1, c.i + 1)]).t0; } else return;
    e.preventDefault(); pause(); seek(Math.round(f));
  });
  bus.on('timeline', (rebuild: boolean) => { if (rebuild || $$('.seg').length !== S.tl.clips.length) build(); else update(); });
  bus.on('tracks', () => void drawWave());
  bus.on('frame', (f: number, clipIndex: number) => {
    $('#head').style.left = (f / S.tl.total * 100) + '%';
    $('#time').innerHTML = `${timeLabel(f)}<small>/ ${timeLabel(S.tl.total)} · ${t('frame')} ${Math.round(f)}</small>`;
    $$('.seg').forEach((e, i) => e.classList.toggle('cur', i === clipIndex));
    slider.setAttribute('aria-valuemax', String(S.tl.total - 1)); slider.setAttribute('aria-valuenow', String(Math.round(f))); slider.setAttribute('aria-valuetext', `${timeLabel(f)} of ${timeLabel(S.tl.total)}, ${sceneName(S.tl.clips[clipIndex].scene)}`);
  });
  new ResizeObserver(() => void drawWave()).observe(tr);
}
export { esc };

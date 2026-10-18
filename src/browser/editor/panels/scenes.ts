import * as Timeline from '../../../core/timeline';
import { $, $$, el, esc } from '../dom';
import { S, bus } from '../state';
import { changed, gotoClip, retime, sceneName, timeLabel, seek, pause } from '../film';
import { control, resetControls } from '../controls';
import { t } from '../i18n';
import { setTab } from '../tabs';

export function selectClip(i: number, scrub = true): void {
  $$('.seg').forEach((e, k) => e.classList.toggle('sel', k === i));
  const d = document.querySelector<HTMLDetailsElement>(`details.scene[data-i="${i}"]`); if (!d) return;
  setTab('scenes'); d.open = true; d.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  if (scrub) gotoClip(i);
}
function clipOp(op: string, i: number): void {
  const cl = S.project.clips; pause();
  if (op === 'up' && i > 0) [cl[i - 1], cl[i]] = [cl[i], cl[i - 1]];
  else if (op === 'down' && i < cl.length - 1) [cl[i + 1], cl[i]] = [cl[i], cl[i + 1]];
  else if (op === 'dup') cl.splice(i + 1, 0, { ...cl[i], id: 'c' + Date.now().toString(36) });
  else if (op === 'del') { if (cl.length < 2) return; cl.splice(i, 1); }
  else return;
  changed(); retime({ panels: true }); build();
  const ni = op === 'up' ? i - 1 : op === 'down' || op === 'dup' ? i + 1 : Math.min(i, cl.length - 1);
  seek(S.tl.clips[Math.max(0, ni)].t0 + 1); selectClip(Math.max(0, ni), false);
}
export function build(): void {
  resetControls();
  const root = $('#p-scenes'), open = new Set($$('details[open]', root).map(d => d.dataset.i)); root.innerHTML = '';
  const dup: Record<string, number> = {}; S.tl.clips.forEach(c => { dup[c.scene] = (dup[c.scene] || 0) + 1; });
  el('p', 'note', esc(t('scenes.note')), root);
  S.tl.clips.forEach((c, i) => {
    const d = el('details', 'scene'); d.dataset.i = String(i); if (open.has(String(i))) d.open = true;
    const first = S.tl.clips.findIndex(x => x.scene === c.scene) === i;
    d.innerHTML = `<summary><span class="num">${i + 1}</span><span class="nm">${esc(sceneName(c.scene))}${first ? '' : `<i>${t('scene.copy')}</i>`}</span><span class="rng"></span>
        <span class="ops"><button class="btn sm" type="button" data-op="up" title="${t('scene.up')}" aria-label="${t('scene.up')}">↑</button><button class="btn sm" type="button" data-op="down" title="${t('scene.down')}" aria-label="${t('scene.down')}">↓</button><button class="btn sm" type="button" data-op="dup" title="${t('scene.dup')}" aria-label="${t('scene.dup')}">⧉</button><button class="btn sm" type="button" data-op="del" title="${t('scene.del')}" aria-label="${t('scene.del')}">✕</button></span></summary>
      <div class="body">
        <div class="row"><label>${t('scene.length')}</label><button class="btn sm" type="button" data-d="-1" aria-label="−0.1 s">−</button><input type="number" data-k="len" min="0.1" step="0.1" aria-label="${t('scene.length')} (s)"><span class="spd">s</span><button class="btn sm" type="button" data-d="1" aria-label="+0.1 s">+</button><span class="spd grow end" data-k="spd"></span></div>
        <details class="adv"><summary>${t('scene.trim')}</summary>
          <div class="row"><label>${t('scene.start')}</label><input type="number" data-k="in" step="0.1" aria-label="${t('scene.start')} (s)"><span class="spd">s</span><label class="auto">${t('scene.end')}</label><input type="number" data-k="out" step="0.1" aria-label="${t('scene.end')} (s)"><span class="spd">s</span></div></details>
        <div class="params"></div>
        ${dup[c.scene] > 1 ? `<div class="shared">${t('scene.shared')}</div>` : ''}
      </div>`;
    root.appendChild(d);
    $('summary', d).addEventListener('click', e => { if ((e.target as HTMLElement).closest('.ops')) return; gotoClip(i); selectClip(i, false); });
    $$('[data-op]', d).forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); clipOp(b.dataset.op!, i); }));
    const len = $<HTMLInputElement>('[data-k=len]', d), setLen = (s: number) => { S.project.clips[i].frames = Math.max(Timeline.MIN_FRAMES, Math.round(s * S.fps)); changed(); retime(); };
    len.addEventListener('change', () => setLen(+len.value || 1));
    $$('[data-d]', d).forEach(b => b.addEventListener('click', () => setLen(S.project.clips[i].frames / S.fps + (+b.dataset.d!) * 0.1)));
    (['in', 'out'] as const).forEach(k => $<HTMLInputElement>(`[data-k=${k}]`, d).addEventListener('change', e => { S.project.clips[i][k] = Math.round(+(e.target as HTMLInputElement).value * S.fps); changed(); retime(); }));
    const ps = (S.manifest.params || []).filter(p => p.scene === c.scene), box = $('.params', d);
    ps.forEach(p => box.appendChild(control(p)));
    if (!ps.length) el('div', 'spd mt', esc(t('scene.noOptions')), box);
  });
  refresh();
}
function refresh(): void {
  const byId = Object.fromEntries(S.manifest.scenes.map(s => [s.id, s])), cur = Timeline.clipAt(S.tl, S.frame).i;
  $$<HTMLDetailsElement>('details.scene').forEach(d => {
    const i = +d.dataset.i!, c = S.tl.clips[i]; if (!c) return;
    $('.rng', d).textContent = `${timeLabel(c.t0)} – ${timeLabel(c.t1)}`;
    const len = $<HTMLInputElement>('[data-k=len]', d); if (document.activeElement !== len) len.value = ((c.t1 - c.t0) / S.fps).toFixed(2);
    const sp = $('[data-k=spd]', d); sp.textContent = `${c.rate.toFixed(2)}× ${t('scene.speed')}`; sp.classList.toggle('warn', c.rate < 0.25 || c.rate > 4); sp.title = c.rate < 0.25 || c.rate > 4 ? 'Audio can only follow between 0.25× and 4×' : '';
    const sc = byId[c.scene], inp = $<HTMLInputElement>('[data-k=in]', d), out = $<HTMLInputElement>('[data-k=out]', d);
    if (document.activeElement !== inp) { inp.value = (c.in / S.fps).toFixed(2); inp.min = String(sc.start / S.fps); inp.max = String(sc.end / S.fps); }
    if (document.activeElement !== out) { out.value = (c.out / S.fps).toFixed(2); out.min = String(sc.start / S.fps); out.max = String(sc.end / S.fps); }
    d.classList.toggle('cur', i === cur);
  });
}
export function initScenes(): void {
  bus.on('panels', build); bus.on('timeline', (rebuild: boolean) => { if (!rebuild) refresh(); });
  bus.on('frame', (_f: number, i: number) => $$('details.scene').forEach((e, k) => e.classList.toggle('cur', k === i)));
  bus.on('select', (i: number) => selectClip(i, false));
}

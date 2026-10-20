// Export tab: size, frame rate, and the render queue (several exports, progress, ETA, cancel, notifications).
import * as Timeline from '../../../core/timeline';
import { api, type QueueJob } from '../api';
import { $, el, esc, fmtTime, announce, toast } from '../dom';
import { S, bus } from '../state';
import { mountFilm, apply, pause, saveNow, saveSoon, stripped } from '../film';
import { t } from '../i18n';

function sizeSelect(): void {
  const m = S.film.manifest, s = $<HTMLSelectElement>('#size'); s.innerHTML = '';
  const list = [{ id: `${m.width}x${m.height}`, label: `${m.width}×${m.height} (native)` }, ...(m.sizes || []).map(x => ({ id: `${x.width}x${x.height}`, label: `${x.label || ''} ${x.width}×${x.height}`.trim() }))];
  list.forEach(o => { const e = el('option', '', esc(o.label), s); e.value = o.id; });
  s.value = S.project.output.size || list[0].id; $('#sizeField').style.display = list.length > 1 ? '' : 'none';
  s.onchange = async () => { S.project.output.size = s.value === list[0].id ? undefined : s.value; saveSoon(); pause(); await mountFilm(S.project.output.size); apply({ panels: true }); };
}
const eta = (j: QueueJob): string => {
  if (j.state !== 'rendering' || !j.started) return '';
  const p = j.phase === 'frames' ? (j.done / Math.max(1, j.total)) * 0.92 : j.phase === 'encoding' ? 0.96 : 0.02, el_ = (Date.now() - j.started) / 1000;
  return p > 0.05 ? t('export.eta', { s: Math.max(1, Math.round(el_ / p * (1 - p))) }) : '';
};
const pct = (j: QueueJob) => j.state === 'done' ? 100 : j.phase === 'encoding' ? 96 : j.phase === 'frames' ? Math.round(j.done / Math.max(1, j.total) * 92) : 2;
let timer = 0; const known = new Map<string, string>();
async function refresh(): Promise<void> {
  let jobs: QueueJob[] = []; try { jobs = await api.jobs(); } catch { return; }
  const box = $('#queue'); box.innerHTML = '';
  if (!jobs.length) box.innerHTML = `<p class="note">${esc(t('export.empty'))}</p>`;
  for (const j of [...jobs].reverse()) {
    const li = el('div', 'job ' + j.state, '', box);
    li.innerHTML = `<div class="jh"><b>${esc(j.film)} · ${esc(j.name)}</b> <small>${j.fps} fps${j.size ? ' · ' + j.size : ''}</small>${j.state === 'queued' || j.state === 'rendering' ? `<button class="btn sm" type="button" data-cancel aria-label="${t('export.cancel')}">${t('export.cancel')}</button>` : ''}</div>`;
    if (j.state === 'queued') li.insertAdjacentHTML('beforeend', '<div class="spd">queued</div>');
    else if (j.state === 'rendering') li.insertAdjacentHTML('beforeend', `<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(j)}"><i style="width:${pct(j)}%"></i></div><div class="spd">${j.phase === 'frames' ? `frames ${j.done} / ${j.total}` : j.phase === 'encoding' ? 'encoding MP4…' : 'preparing…'} · ${eta(j)}</div>`);
    else if (j.state === 'done') li.insertAdjacentHTML('beforeend', `<video controls preload="none" src="${j.file}"></video><div class="spd"><a href="${j.file}" download>${t('export.download')} ${esc(j.outName || '')}</a> · ${fmtTime(Math.round((j.length || 0) * S.fps), S.fps)} · ${j.started && j.ended ? Math.round((j.ended - j.started) / 1000) : '?'} s</div>`);
    else if (j.state === 'error') li.insertAdjacentHTML('beforeend', `<pre class="err">${esc(j.error || 'failed')}</pre>`);
    li.querySelector('[data-cancel]')?.addEventListener('click', async () => { await api.cancel(j.id); void refresh(); });
    const prev = known.get(j.id); known.set(j.id, j.state);
    if (prev && prev !== j.state && (j.state === 'done' || j.state === 'error')) finished(j);
  }
  const active = jobs.some(j => j.state === 'queued' || j.state === 'rendering');
  clearTimeout(timer); if (active) timer = window.setTimeout(refresh, 800);
  $<HTMLButtonElement>('#go').disabled = false;
}
function finished(j: QueueJob): void {
  const msg = j.state === 'done' ? `✓ ${j.outName}` : `✗ ${j.film} ${j.name}`; document.title = msg + ' · ' + t('app.title'); announce(msg); toast(msg, j.state === 'done' ? 'ok' : 'err');
  if ($<HTMLInputElement>('#notify').checked && 'Notification' in window && Notification.permission === 'granted') new Notification(t('app.title'), { body: msg, icon: '/assets/brand/favicon.png' });
}
export function initExport(): void {
  bus.on('project', () => { sizeSelect(); $('#outname').textContent = `${t('export.output')}: output/${S.filmId}-${S.version}.mp4 · ${fmtTime(S.tl.total, S.fps)}`; });
  bus.on('tab:export', () => void refresh());
  $('#notify').addEventListener('change', e => { if ((e.target as HTMLInputElement).checked && 'Notification' in window && Notification.permission === 'default') void Notification.requestPermission(); });
  $('#go').addEventListener('click', async () => {
    pause(); await saveNow();
    try { await api.render({ film: S.filmId, name: S.version, project: stripped(), fps: +$<HTMLSelectElement>('#fps').value, size: S.project.output.size || null }); known.clear(); void refresh(); }
    catch (e: any) { toast(e.message, 'err'); }
  });
  const pack = $<HTMLAnchorElement>('#packBtn'), fileIn = $<HTMLInputElement>('#importFile');
  bus.on('project', () => { pack.href = api.packUrl(S.filmId); pack.download = `${S.filmId}.seekframe.tgz`; });
  pack.addEventListener('click', async e => {      // autosave first, so the file has the latest edits; fetch it so a failure says why instead of a dead download
    e.preventDefault(); pause(); await saveNow();
    try {
      const r = await fetch(api.packUrl(S.filmId)); if (!r.ok) throw new Error(r.status === 404 ? t('export.restart') : `${r.status} ${r.statusText}`);
      const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = `${S.filmId}.seekframe.tgz`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    } catch (err: any) { toast(err.message, 'err'); }
  });
  $('#importBtn').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files?.[0]; fileIn.value = ''; if (!f) return;
    let name: string | undefined, force = false;
    for (;;) {
      try { const r = await api.importProject(f, { name, force }); toast(t('export.imported', { id: r.id }), 'ok'); location.search = `?film=${r.id}`; return; }
      catch (e: any) {
        const m = /films\/([\w-]+) already exists/.exec(e.message);
        if (!m) { toast(e.message, 'err'); return; }
        const ans = window.prompt(t('export.exists', { id: m[1] }), m[1]); if (ans === null) return;
        name = ans.trim() || m[1]; force = name === m[1];
      }
    }
  });
  void refresh();
}
export { Timeline };

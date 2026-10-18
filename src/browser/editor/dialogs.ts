import { api } from './api';
import { $, el, esc, toast, copyText } from './dom';
import { t } from './i18n';
import { S } from './state';
import * as History from './history';
import { checkCurrent, scanAll, type TextIssue } from './check';
import { replaceProject, seek, changed } from './film';

/* ---------- modal with focus trap, Esc, and focus restore ---------- */
export function modal(title: string, body: HTMLElement | string, o: { wide?: boolean } = {}): { root: HTMLElement; content: HTMLElement; close: () => void } {
  const prev = document.activeElement as HTMLElement | null;
  const back = el('div', 'backdrop', '', document.body), id = 'dlg-' + Math.random().toString(36).slice(2, 6);
  const box = el('div', { class: 'dialog' + (o.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id }, '', back);
  const head = el('div', 'dh', `<h2 id="${id}">${esc(title)}</h2>`, box), closeBtn = el('button', { class: 'btn sm', type: 'button', 'aria-label': t('close') }, '✕', head);
  const content = el('div', 'db', '', box); if (typeof body === 'string') content.innerHTML = body; else content.appendChild(body);
  const close = () => { document.removeEventListener('keydown', onKey, true); back.remove(); prev?.focus?.(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...box.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.hasAttribute('disabled') && x.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  closeBtn.addEventListener('click', close); back.addEventListener('pointerdown', e => { if (e.target === back) close(); }); document.addEventListener('keydown', onKey, true);
  setTimeout(() => (box.querySelector<HTMLElement>('input, select, textarea, button:not([aria-label])') || closeBtn).focus(), 30);
  return { root: back, content, close };
}

/* ---------- new film wizard ---------- */
const FORMATS = [{ id: '16x9', label: '16:9 · 1920×1080', w: 1920, h: 1080 }, { id: '9x16', label: '9:16 · 1080×1920', w: 1080, h: 1920 }, { id: '1x1', label: '1:1 · 1080×1080', w: 1080, h: 1080 }, { id: '4x5', label: '4:5 · 1080×1350', w: 1080, h: 1350 }];
export async function openNewFilm(): Promise<void> {
  const brand = await api.brand().catch(() => null);
  const form = el('form', 'form', `
    <label>${t('wizard.name')}<input name="name" type="text" required pattern="[A-Za-z0-9 _-]+" placeholder="spring-sale" autocomplete="off"></label>
    <fieldset><legend>${t('wizard.format')}</legend>${FORMATS.map((f, i) => `<label class="radio"><input type="radio" name="fmt" value="${f.id}" ${i === 0 ? 'checked' : ''}> ${f.label}</label>`).join('')}</fieldset>
    <label>${t('export.fps')}<select name="fps"><option value="30" selected>30</option><option value="24">24</option><option value="60">60</option></select></label>
    <label class="sw"><input type="checkbox" name="brand" ${brand?.exists ? 'checked' : 'disabled'}> ${t('wizard.brand')}${brand?.exists ? ` (${esc(brand.brand.name)})` : ''}</label>
    <div class="err" id="wizerr" role="alert"></div>
    <div class="actions"><button class="btn" type="button" data-cancel>${t('wizard.cancel')}</button><button class="btn primary" type="submit">${t('wizard.create')}</button></div>`);
  const m = modal(t('wizard.title'), form);
  form.querySelector('[data-cancel]')!.addEventListener('click', m.close);
  form.addEventListener('submit', async e => {
    e.preventDefault(); const d = new FormData(form), f = FORMATS.find(x => x.id === d.get('fmt'))!, name = String(d.get('name') || '').trim().replace(/\s+/g, '-');
    try { const r = await api.newFilm({ name, width: f.w, height: f.h, fps: +String(d.get('fps')) }); location.search = `?film=${r.id}`; }
    catch (err: any) { $('#wizerr', form).textContent = err.message; }
  });
}

/* ---------- setup check ---------- */
export async function openSetup(auto = false): Promise<void> {
  const box = el('div', 'setup'), render = async () => {
    box.innerHTML = '<p class="note">…</p>'; const r = await api.doctor();
    box.innerHTML = `<ul class="checks">${r.checks.map(c => `<li class="${c.ok ? 'ok' : 'bad'}"><b>${c.ok ? '✓' : '✗'}</b> <span><strong>${esc(c.name)}</strong><br><small>${esc(c.detail)}</small>${!c.ok && c.fix ? `<br><code>${esc(c.fix)}</code> <button class="btn sm" data-copy="${esc(c.fix)}">${t('copy')}</button>` : ''}</span></li>`).join('')}</ul><p class="note">${r.ok ? t('setup.ok') : t('setup.fix')}</p><div class="actions"><button class="btn" data-re>${t('setup.recheck')}</button></div>`;
    box.querySelector('[data-re]')!.addEventListener('click', render);
    box.querySelectorAll<HTMLElement>('[data-copy]').forEach(b => b.addEventListener('click', () => copyText(b.dataset.copy!)));
    if (auto && r.ok) { auto = false; m.close(); }
  };
  const m = modal(t('setup.title'), box); await render();
}

/* ---------- keyboard help ---------- */
export const SHORTCUTS: Array<[string, string]> = [['Space', 'play / pause'], ['← →', 'previous / next frame'], ['Shift + ← →', 'back / forward one second'], ['Home / End', 'start / end of the film'], ['[  ]', 'previous / next scene'], ['Ctrl/⌘ + Z', 'undo'], ['Ctrl/⌘ + Shift + Z', 'redo'], ['Ctrl/⌘ + S', 'save now'], ['?', 'this help'], ['Esc', 'close a dialog']];
export function openShortcuts(): void { modal(t('keys.title'), `<table class="keys">${SHORTCUTS.map(([k, d]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(d)}</td></tr>`).join('')}</table>`); }

/* ---------- text check ---------- */
export function openCheck(): void {
  const box = el('div', 'check'), show = (issues: TextIssue[]) => {
    box.innerHTML = issues.length ? `<ul class="issues">${issues.map(i => `<li><button class="link" data-f="${i.frame}">${esc(i.scene)} · ${(i.frame / S.fps).toFixed(1)} s</button> “${esc(i.text)}” ${t('check.issue', { px: i.px })}</li>`).join('')}</ul>` : `<p class="note">${t('check.none')}</p>`;
    box.insertAdjacentHTML('beforeend', `<div class="actions"><button class="btn" data-scan>${t('check.scan')}</button></div><p class="note">Contrast and flashing: <code>seekframe review ${esc(S.filmId)}</code></p>`);
    box.querySelector('[data-scan]')!.addEventListener('click', () => show(scanAll()));
    box.querySelectorAll<HTMLElement>('[data-f]').forEach(b => b.addEventListener('click', () => { seek(+b.dataset.f!); m.close(); }));
  };
  const m = modal(t('check.title'), box, { wide: true }); show(checkCurrent());
}

/* ---------- version history ---------- */
export async function openHistory(): Promise<void> {
  const box = el('div', 'hist'), snaps = await api.history(S.filmId, S.version).catch(() => []);
  const cur = JSON.parse(JSON.stringify(S.project));
  const m = modal(t('history.title') + ` · ${S.version}`, box, { wide: true });
  if (!snaps.length) { box.innerHTML = `<p class="note">${t('history.none')}</p>`; return; }
  box.innerHTML = `<ul class="snaps">${snaps.map(s => `<li data-id="${esc(s.id)}"><b>${new Date(s.at).toLocaleString()}</b> <span class="d" aria-live="polite">…</span> <button class="btn sm" data-restore>${t('history.restore')}</button></li>`).join('')}</ul>`;
  for (const li of box.querySelectorAll<HTMLElement>('li')) {
    const snap = await api.snapshot(S.filmId, S.version, li.dataset.id!), diff = History.diffProjects(snap, curStripped(cur));
    li.querySelector('.d')!.textContent = diff.length ? `${t('history.changed')}: ${diff.join(' · ')}` : t('history.same');
    li.querySelector('[data-restore]')!.addEventListener('click', () => { replaceProject(snap); changed(); m.close(); toast(t('history.restore')); });
  }
}
const curStripped = (p: any) => { const q = JSON.parse(JSON.stringify(p)); const d = Object.fromEntries((S.manifest.params || []).map(x => [x.id, x.default])); Object.keys(q.params || {}).forEach(k => { if (q.params[k] === d[k]) delete q.params[k]; }); (q.clips || []).forEach((c: any) => { const s = S.manifest.scenes.find(x => x.id === c.scene)!; if (c.in === s.start) delete c.in; if (c.out === s.end) delete c.out; }); return q; };

// Seekframe editor: boot, header, wiring. Everything film-specific comes from the film page's manifest (docs/FILM_SPEC.md).
import * as Timeline from '../../core/timeline';
import { api } from './api';
import { $, el, esc, toast } from './dom';
import { S, bus } from './state';
import { LANGS, applyDirection, applyI18n, lang, setLang, t } from './i18n';
import { apply, fit, mountFilm, replaceProject, saveNow, seek, stripped, toggle } from './film';
import * as History from './history';
import { buildAudioEls } from './playback';
import { initTimeline } from './timeline-ui';
import { initTabs, setTab } from './tabs';
import { initShortcuts } from './shortcuts';
import { openCheck, openHistory, openNewFilm, openSetup, openShortcuts } from './dialogs';
import { initScenes } from './panels/scenes';
import { initStyle } from './panels/style';
import { initVariants } from './panels/variants';
import { initBrand } from './panels/brand';
import { initAudio } from './panels/audio';
import { initExport } from './panels/export';

const qs = new URLSearchParams(location.search);
const PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>', PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h4v12H3zM9 2h4v12H9z" fill="currentColor"/></svg>';

/* ---------- theme ---------- */
const THEMES = ['auto', 'light', 'dark'];
function applyTheme(): void { let th = 'auto'; try { th = localStorage.getItem('sf-theme') || 'auto'; } catch { /* storage may be blocked */ } document.documentElement.dataset.theme = th; $('#theme').textContent = `◐ ${t(th)}`; }
function cycleTheme(): void { let th = 'auto'; try { th = localStorage.getItem('sf-theme') || 'auto'; localStorage.setItem('sf-theme', THEMES[(THEMES.indexOf(th) + 1) % 3]); } catch { /* ignore */ } applyTheme(); }

/* ---------- boot ---------- */
// ?film= wins, then the film opened last, then your own films, then the launch example, then whatever comes first
function pickFilm(films: Array<{ id: string; root: string }>): string {
  const ids = films.map(f => f.id); let last = ''; try { last = localStorage.getItem('sf-film') || ''; } catch { /* storage may be blocked */ }
  const own = films.find(f => f.root === 'films');
  const id = [qs.get('film') || '', last, own ? own.id : '', 'seekframe-launch'].find(x => x && ids.includes(x)) || ids[0];
  try { localStorage.setItem('sf-film', id); } catch { /* ignore */ }
  return id;
}

async function boot(): Promise<void> {
  applyDirection(); applyI18n(); applyTheme();
  $('#play').innerHTML = PLAY; $('#play').setAttribute('aria-label', t('play'));
  const films = await api.films(), ids = films.map(f => f.id);
  S.filmId = pickFilm(films); S.filmRoot = (films.find(f => f.id === S.filmId) || { root: 'films' }).root;
  S.version = (qs.get('v') || 'default').replace(/[^\w-]/g, '') || 'default';
  const fsel = $<HTMLSelectElement>('#filmSel'); films.forEach(f => { const o = el('option', '', esc(f.id) + (f.root === 'examples' ? '  · example' : ''), fsel); o.value = f.id; }); fsel.value = S.filmId;
  fsel.addEventListener('change', () => { location.search = `?film=${fsel.value}`; });
  const lsel = $<HTMLSelectElement>('#langSel'); LANGS.forEach(l => { const o = el('option', '', l.label, lsel); o.value = l.id; }); lsel.value = lang();
  lsel.addEventListener('change', () => { setLang(lsel.value); location.reload(); });
  $('#theme').addEventListener('click', cycleTheme);
  $('#newFilm').addEventListener('click', () => void openNewFilm()); $('#setup').addEventListener('click', () => void openSetup()); $('#keys').addEventListener('click', openShortcuts);
  bus.on('saved', (m: string) => { $('#saved').textContent = m; });
  bus.on('playing', (p: boolean) => { $('#play').innerHTML = p ? PAUSE : PLAY; $('#play').setAttribute('aria-label', p ? t('pause') : t('play')); });
  bus.on('history', () => { ($('#undo') as HTMLButtonElement).disabled = !History.canUndo(); ($('#redo') as HTMLButtonElement).disabled = !History.canRedo(); });
  $('#undo').addEventListener('click', () => History.undo()); $('#redo').addEventListener('click', () => History.redo());
  $('#play').addEventListener('click', toggle);
  initTabs(); initTimeline(); initScenes(); initStyle(); initVariants(); initBrand(); initAudio(); initExport(); initShortcuts();
  bus.on('project', buildAudioEls);
  await loadFilm();
  try { if (!sessionStorage.getItem('sf-setup-checked')) { sessionStorage.setItem('sf-setup-checked', '1'); const r = await api.doctor(); if (!r.ok) void openSetup(true); } } catch { /* offline */ }
}

async function loadFilm(): Promise<void> {
  const saved = await api.getProject(S.filmId, S.version), vers = await api.versions(S.filmId);
  const vs = $<HTMLSelectElement>('#verSel'); vs.innerHTML = ''; [...new Set(['default', ...vers, S.version])].forEach(v => { const o = el('option', '', esc(v), vs); o.value = v; }); vs.value = S.version;
  vs.addEventListener('change', () => { location.search = `?film=${S.filmId}&v=${vs.value}`; });
  await mountFilm(saved.output && saved.output.size);
  S.manifest = S.film.manifest; S.fps = S.manifest.fps; S.project = Timeline.normalize(S.manifest, saved as any);
  $('#loading').hidden = true; $('#frameBox').hidden = false; fit();
  History.reset(JSON.stringify(stripped()));
  apply({ panels: true });
  const poster = S.manifest.poster != null ? Timeline.timelineFrame(S.tl, S.manifest.poster) : null;   // open on a frame that shows the film
  if (poster != null) seek(poster);
  $('#saveAs').addEventListener('click', async () => {
    const n = (prompt(t('prompt.name'), '') || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''); if (!n) return;
    await saveNow(); await api.putProject(S.filmId, n, stripped()); location.search = `?film=${S.filmId}&v=${n}`;
  });
  $('#delVer').addEventListener('click', async () => { if (!confirm(t('confirm.delete'))) return; await api.deleteProject(S.filmId, S.version); location.search = `?film=${S.filmId}`; });
  $('#resetAll').addEventListener('click', () => { if (!confirm(t('confirm.reset'))) return; replaceProject({ output: S.project.output.size ? { size: S.project.output.size } : {} }); History.push(JSON.stringify(stripped())); void saveNow(); });
  $('#hist').addEventListener('click', () => void openHistory());
  $('#checkBtn').addEventListener('click', openCheck);
  const safe = $('#safe'), sb = $('#safeBtn'); sb.addEventListener('click', () => { const on = safe.hidden; safe.hidden = !on; sb.setAttribute('aria-pressed', String(on)); });
}
boot().catch(e => { document.body.insertAdjacentHTML('afterbegin', `<pre class="fatal">${esc(e.stack || e)}</pre>`); toast(String(e.message || e), 'err'); });
export { setTab };

import { api } from '../api';
import { $, el, esc } from '../dom';
import { S, bus } from '../state';
import { changed, replaceProject } from '../film';
import { t } from '../i18n';
import { setTab } from '../tabs';

export async function build(): Promise<void> {
  const root = $('#p-variants'); root.innerHTML = ''; const V = S.manifest.variants || {};
  el('p', 'note', esc(t('variants.note')), root); const grid = el('div', 'vgrid', '', root);
  const vers = await api.versions(S.filmId), presets = V.presets || [];
  const cards = [...presets.map(p => ({ kind: 'preset', id: p.id, label: p.label || p.id, params: p.params || {} })), ...vers.filter(v => !presets.some(p => p.id === v)).map(v => ({ kind: 'version', id: v, label: v, params: {} }))];
  if (!cards.length) { el('div', 'empty', esc(t('variants.none')), root); return; }
  for (const c of cards) {
    const b = el('button', { class: 'vcard', type: 'button', 'aria-label': `${c.kind === 'preset' ? 'Apply preset' : 'Open version'} ${c.label}` }, `<img alt="" loading="lazy"><b>${esc(c.label)}</b><small>${c.kind === 'preset' ? 'preset' : 'saved version'}</small>`, grid);
    if (c.kind === 'version' && c.id === S.version) b.classList.add('on');
    (async () => { const proj = c.kind === 'version' ? await api.getProject(S.filmId, c.id) : { params: c.params }; try { const r = await api.thumb(S.filmId, proj, V.thumbFrame ?? -1); b.querySelector('img')!.src = r.url; } catch { /* no thumbnail */ } })();
    b.addEventListener('click', () => { if (c.kind === 'version') { location.search = `?film=${S.filmId}&v=${c.id}`; return; } replaceProject({ ...S.project, params: { ...c.params } }); changed(); setTab('scenes'); });
  }
}
export const initVariants = () => bus.on('tab:variants', () => void build());

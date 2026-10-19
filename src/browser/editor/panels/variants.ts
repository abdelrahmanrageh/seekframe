import { api } from '../api';
import { $, el, esc } from '../dom';
import { S, bus } from '../state';
import { changed, replaceProject } from '../film';
import { t } from '../i18n';
import { setTab } from '../tabs';

type Card = { kind: string; id: string; label: string; params: Record<string, unknown> };
// thumbnails are cached per film: the server keeps one warm page, so they are quick after the first one
const thumbs = new Map<string, Promise<string | null>>();
function thumbFor(c: Card): Promise<string | null> {
  const key = `${S.filmId}|${c.kind}|${c.id}`;
  if (!thumbs.has(key)) thumbs.set(key, (async () => {
    try { const proj = c.kind === 'version' ? await api.getProject(S.filmId, c.id) : { params: c.params }; return (await api.thumb(S.filmId, proj, (S.manifest.variants || {}).thumbFrame ?? -1)).url; }
    catch { thumbs.delete(key); return null; }
  })());
  return thumbs.get(key)!;
}
/** start rendering preset thumbnails in the background once the film is loaded, so the tab opens with pictures */
export function prefetchThumbs(): void {
  const presets = (S.manifest && S.manifest.variants && S.manifest.variants.presets) || [];
  presets.reduce((p, pr) => p.then(() => thumbFor({ kind: 'preset', id: pr.id, label: pr.label || pr.id, params: pr.params || {} })), Promise.resolve(null as string | null));
}

export async function build(): Promise<void> {
  const root = $('#p-variants'); root.innerHTML = ''; const V = S.manifest.variants || {};
  el('p', 'note', esc(t('variants.note')), root); const grid = el('div', 'vgrid', '', root);
  const vers = await api.versions(S.filmId), presets = V.presets || [];
  const cards = [...presets.map(p => ({ kind: 'preset', id: p.id, label: p.label || p.id, params: p.params || {} })), ...vers.filter(v => !presets.some(p => p.id === v)).map(v => ({ kind: 'version', id: v, label: v, params: {} }))];
  if (!cards.length) { el('div', 'empty', esc(t('variants.none')), root); return; }
  for (const c of cards) {
    const b = el('button', { class: 'vcard', type: 'button', 'aria-label': `${c.kind === 'preset' ? 'Apply preset' : 'Open version'} ${c.label}` }, `<img alt="" loading="lazy"><b>${esc(c.label)}</b><small>${c.kind === 'preset' ? 'preset' : 'saved version'}</small>`, grid);
    if (c.kind === 'version' && c.id === S.version) b.classList.add('on');
    const img = b.querySelector('img')!; img.classList.add('loading');
    img.addEventListener('load', () => img.classList.remove('loading'));
    void thumbFor(c).then(url => { if (url) img.src = url; else img.classList.remove('loading'); });
    b.addEventListener('click', () => { if (c.kind === 'version') { location.search = `?film=${S.filmId}&v=${c.id}`; return; } replaceProject({ ...S.project, params: { ...c.params } }); changed(); setTab('scenes'); });
  }
}
export const initVariants = () => bus.on('tab:variants', () => void build());

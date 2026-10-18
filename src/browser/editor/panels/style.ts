import { $, el, esc } from '../dom';
import { S, bus } from '../state';
import { control } from '../controls';
import { t } from '../i18n';

export function build(): void {
  const root = $('#p-style'); root.innerHTML = '';
  const ids = new Set(S.manifest.scenes.map(s => s.id)), globals = (S.manifest.params || []).filter(p => !p.scene || !ids.has(p.scene));
  if (!globals.length) { el('div', 'empty', esc(t('style.none')), root); return; }
  el('p', 'note', esc(t('style.note')), root); globals.forEach(p => root.appendChild(control(p)));
}
export const initStyle = () => bus.on('panels', build);

import { api } from '../api';
import { $, el, esc, toast } from '../dom';
import { S, bus } from '../state';
import { changed } from '../film';
import { control } from '../controls';
import { allTracks, buildAudioEls, setTrackVolume } from '../playback';
import { t } from '../i18n';

export function build(): void {
  const root = $('#p-audio'); root.innerHTML = '';
  // sound style: the film's sound options (params with group 'sound') and the theme they produce
  const soundParams = (S.manifest.params || []).filter(p => p.group === 'sound');
  if (soundParams.length || S.manifest.soundtrack) {
    const box = el('section', 'sndstyle', `<h3>${esc(t('audio.style'))}</h3>`, root);
    soundParams.forEach(p => box.appendChild(control(p)));
    el('p', 'note', '', box).id = 'sndTheme'; themeLabel();
  }
  el('p', 'note', esc(t('audio.note')), root);
  const tracks = allTracks();
  tracks.forEach(tr => {
    const b = el('div', 'trk', `<div class="h"><label class="sw"><input type="checkbox" ${tr.enabled ? 'checked' : ''}><b>${esc(tr.label || tr.id)}</b></label>${tr.custom ? `<button class="btn sm" type="button" data-rm aria-label="${t('scene.del')}">✕</button>` : ''}</div>
      <div class="rest"><div class="c2"><span class="spd">${t('audio.volume')}</span><input type="range" min="0" max="1.5" step="0.05" value="${tr.volume}" aria-label="${t('audio.volume')} · ${esc(tr.label || tr.id)}"></div>
      ${tr.custom ? `<div class="c2"><span class="spd">${t('audio.sync')}</span><select data-sync aria-label="${t('audio.sync')}"><option value="free">${t('audio.free')}</option><option value="timeline">${t('audio.follows')}</option></select><span class="spd">${t('audio.offset')}</span><input type="number" data-off min="0" step="0.1" value="${tr.offset || 0}" aria-label="${t('audio.offset')} (s)"><span class="spd">s</span></div>` : `<div class="spd">${tr.generated ? t('audio.generated') + ' · ' : ''}${tr.sync === 'free' ? t('audio.free') : t('audio.follows')}${tr.group ? ' · ' + esc(tr.group) : ''}</div>`}</div>`, root);
    const st = () => tr.custom ? S.project.audio.custom.find(x => x.id === tr.id)! : (S.project.audio.tracks[tr.id] = S.project.audio.tracks[tr.id] || {});
    b.querySelector<HTMLInputElement>('input[type=checkbox]')!.addEventListener('change', e => {
      st().enabled = (e.target as HTMLInputElement).checked;
      if ((e.target as HTMLInputElement).checked && tr.group) tracks.filter(o => o.group === tr.group && o.id !== tr.id && !o.custom).forEach(o => { (S.project.audio.tracks[o.id] = S.project.audio.tracks[o.id] || {}).enabled = false; });
      changed(); build(); buildAudioEls();
    });
    b.querySelector<HTMLInputElement>('input[type=range]')!.addEventListener('input', e => { const v = +(e.target as HTMLInputElement).value; st().volume = v; changed(); setTrackVolume(tr.id, v); });
    if (tr.custom) {
      const sel = b.querySelector<HTMLSelectElement>('[data-sync]')!; sel.value = tr.sync || 'free';
      sel.addEventListener('change', () => { (st() as any).sync = sel.value; changed(); buildAudioEls(); });
      b.querySelector<HTMLInputElement>('[data-off]')!.addEventListener('change', e => { (st() as any).offset = Math.max(0, +(e.target as HTMLInputElement).value || 0); changed(); buildAudioEls(); });
      b.querySelector('[data-rm]')!.addEventListener('click', () => { S.project.audio.custom = S.project.audio.custom.filter(x => x.id !== tr.id); changed(); build(); buildAudioEls(); });
    }
  });
  const add = el('div', 'mt', `<button class="btn" type="button">${t('audio.add')}</button><input type="file" accept="audio/*" hidden>`, root), fi = add.querySelector('input')!;
  add.querySelector('button')!.addEventListener('click', () => fi.click());
  fi.addEventListener('change', async () => {
    const fl = fi.files![0]; if (!fl) return;
    try { const j = await api.uploadFile(S.filmId, fl); S.project.audio.custom.push({ id: 'u' + Date.now().toString(36), label: fl.name, src: j.path, sync: 'free', offset: 0, volume: 1, enabled: true }); changed(); build(); buildAudioEls(); }
    catch (e: any) { toast(e.message, 'err'); }
  });
}
function themeLabel(): void {
  const n = document.getElementById('sndTheme'), st = S.manifest.soundtrack || {}; if (!n) return;
  n.textContent = `${t('audio.theme')}: ${st.theme || 'deep'} · ${t('audio.loud')} ${st.loudness ?? -16} LUFS`;
}
export const initAudio = () => { bus.on('panels', build); bus.on('project', themeLabel); };

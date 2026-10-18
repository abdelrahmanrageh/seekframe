// Brand tab: everything `seekframe brand …` does, as a GUI. Logo (drop a PNG/JPG/SVG), colours with live WCAG contrast, fonts with licence handling.
import { api, type BrandPayload, type LogoResult } from '../api';
import { $, $$, debounce, el, esc, toast } from '../dom';
import { S, bus } from '../state';
import { contrastHex, grade, isHex, PAIRS } from '../../../core/color';
import { t } from '../i18n';
import { saveNow } from '../film';

let data: BrandPayload | null = null, suggestion: LogoResult | null = null;
const ROLES = ['accent', 'ink', 'paper', 'muted'], ROLE_LABEL: Record<string, string> = { accent: 'Accent', ink: 'Ink (dark)', paper: 'Paper (light)', muted: 'Muted' };
const WEIGHTS = ['300', '400', '500', '600', '700', '800', '900', '600 700', '800 900'];

export async function build(): Promise<void> {
  const root = $('#p-brand'); root.innerHTML = '<p class="note">…</p>';
  try { data = await api.brand(); } catch (e: any) { root.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  render(root);
}
function contrastRows(colors: Record<string, string>): string {
  return PAIRS.filter(([, a, b]) => isHex(colors[a] || '') && isHex(colors[b] || '')).map(([label, a, b]) => {
    const r = contrastHex(colors[a], colors[b]), g = grade(r), cls = r >= 4.5 ? 'good' : r >= 3 ? 'mid' : 'bad';
    return `<tr><td><span class="sw-pair" style="background:${colors[b]};color:${colors[a]}" aria-hidden="true">Aa</span> ${esc(label)}</td><td>${r.toFixed(2)}:1</td><td><span class="chip ${cls}">${esc(g)}</span></td></tr>`;
  }).join('');
}
function render(root: HTMLElement): void {
  const b = data!.brand;
  root.innerHTML = `
    <p class="note">${esc(t('brand.note'))}</p>
    ${data!.exists ? '' : `<p class="note warn">${esc(t('brand.none'))}</p>`}
    <section aria-labelledby="b-id"><h3 id="b-id">${t('brand.name')}</h3>
      <div class="field"><label for="b-name">${t('brand.name')}</label><input id="b-name" type="text" value="${esc(b.name)}"></div>
      <div class="field"><label for="b-tag">${t('brand.tagline')}</label><input id="b-tag" type="text" value="${esc(b.voice?.tagline || '')}"></div>
      <div class="field"><label for="b-tone">${t('brand.tone')}</label><input id="b-tone" type="text" value="${esc(b.voice?.tone || '')}"></div></section>
    <section aria-labelledby="b-logo"><h3 id="b-logo">${t('brand.logo')}</h3><p class="note">${esc(t('brand.logoHelp'))}</p>
      <div id="drop" class="drop" role="group" aria-label="${t('brand.upload')}"><span>${t('brand.drop')}</span><button class="btn" type="button">${t('brand.upload')}</button><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></div>
      <div id="logo-out" class="logo-out" aria-live="polite">${data!.assets.svg ? `<figure><img src="${data!.assets.svg}?t=${Date.now()}" alt="Traced logo"><figcaption>SVG</figcaption></figure>` : ''}${data!.assets.strokesPreview ? `<figure><img src="${data!.assets.strokesPreview}?t=${Date.now()}" alt="Logo strokes"><figcaption>Strokes</figcaption></figure>` : ''}</div>
      <div id="sugg"></div></section>
    <section aria-labelledby="b-col"><h3 id="b-col">${t('brand.colors')}</h3>
      ${ROLES.map(r => `<div class="field"><label for="c-${r}">${ROLE_LABEL[r]}</label><div class="c2"><input type="color" id="c-${r}" value="${isHex(b.colors[r] || '') ? b.colors[r] : '#000000'}"><input type="text" id="h-${r}" value="${esc(b.colors[r] || '')}" spellcheck="false" aria-label="${ROLE_LABEL[r]} (hex)"></div></div>`).join('')}
      <h4>${t('brand.contrast')}</h4><table class="contrast"><tbody id="contrast">${contrastRows(b.colors)}</tbody></table></section>
    <section aria-labelledby="b-fonts"><h3 id="b-fonts">${t('brand.fonts')}</h3>
      <ul class="fonts">${b.fonts.length ? b.fonts.map(f => `<li><div><b>${esc(f.family)}</b> <small>${esc(Object.keys(f.files).join(', '))}</small><br><small>${esc(f.license || 'unknown')}${f.redistributable === false ? ' · <span class="chip mid">not committed to git</span>' : ''}</small></div><button class="btn sm" type="button" data-rm="${esc(f.family)}" aria-label="${t('scene.del')} ${esc(f.family)}">✕</button></li>`).join('') : `<li class="note">${esc(t('brand.fallback'))}</li>`}</ul>
      <form id="fontform" class="form"><label>${t('brand.fontFile')}<input name="file" type="file" accept=".woff2,.woff,.ttf,.otf" required></label>
        <div class="c2"><label class="grow">${t('brand.family')}<input name="family" type="text" required></label><label>${t('brand.weight')}<select name="weight">${WEIGHTS.map(w => `<option ${w === '400' ? 'selected' : ''}>${w}</option>`).join('')}</select></label></div>
        <label>${t('brand.license')}<select name="license">${['OFL', 'free-no-redistribute', 'commercial-no-redistribute', 'unknown'].map(l => `<option value="${l}" ${l === 'unknown' ? 'selected' : ''}>${esc(t('lic.' + l))}</option>`).join('')}</select></label>
        <p class="note">${esc(t('lic.warn'))}</p><button class="btn" type="submit">${t('brand.addFont')}</button></form></section>
    <section><button id="apply" class="btn primary" type="button">${t('brand.apply')}</button></section>`;
  wire(root);
}
function wire(root: HTMLElement): void {
  const saveIdentity = debounce(async () => {
    try { data = await api.saveBrand({ name: ($<HTMLInputElement>('#b-name', root)).value, voice: { tagline: ($<HTMLInputElement>('#b-tag', root)).value, tone: ($<HTMLInputElement>('#b-tone', root)).value } }); } catch (e: any) { toast(e.message, 'err'); }
  }, 500);
  ['#b-name', '#b-tag', '#b-tone'].forEach(s => $(s, root).addEventListener('input', saveIdentity));

  // Logo picker button is keyboard-accessible; the surrounding group also accepts a dropped file.
  const drop = $('#drop', root), fi = $<HTMLInputElement>('input', drop);
  const take = async (f: File | undefined) => {
    if (!f) return; $('#logo-out', root).innerHTML = '<p class="note">…</p>';
    try { suggestion = await api.brandLogo(f); data = suggestion; render(root); showSuggestion(root); toast(t('brand.stray')); } catch (e: any) { toast(e.message, 'err'); render(root); }
  };
  $('button', drop).addEventListener('click', e => { e.stopPropagation(); fi.click(); }); drop.addEventListener('click', () => fi.click());
  fi.addEventListener('change', () => take(fi.files?.[0]));
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => take((e as DragEvent).dataTransfer?.files?.[0]));
  if (suggestion) showSuggestion(root);

  // colours (live contrast)
  const colors = () => Object.fromEntries(ROLES.map(r => [r, ($<HTMLInputElement>('#h-' + r, root)).value]));
  const saveColors = debounce(async () => { try { data = await api.saveBrand({ colors: colors() }); } catch (e: any) { toast(e.message, 'err'); } }, 500);
  ROLES.forEach(r => {
    const c = $<HTMLInputElement>('#c-' + r, root), h = $<HTMLInputElement>('#h-' + r, root);
    const upd = () => { $('#contrast', root).innerHTML = contrastRows(colors()); saveColors(); };
    c.addEventListener('input', () => { h.value = c.value; upd(); }); h.addEventListener('input', () => { if (isHex(h.value)) c.value = h.value; upd(); });
  });

  // fonts
  $$('[data-rm]', root).forEach(b => b.addEventListener('click', async () => { try { data = await api.removeFont(b.dataset.rm!); render(root); } catch (e: any) { toast(e.message, 'err'); } }));
  $<HTMLFormElement>('#fontform', root).addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target as HTMLFormElement, d = new FormData(f), file = d.get('file') as File;
    try { const r = await api.brandFont(file, { family: String(d.get('family')), weight: String(d.get('weight')), role: 'both', license: String(d.get('license')) }); data = r; render(root); toast(r.ignored ? `${t('lic.warn')}` : r.warning || 'OK', r.warning ? 'warn' : 'ok'); } catch (err: any) { toast(err.message, 'err'); }
  });

  $('#apply', root).addEventListener('click', async () => {
    try { await saveNow(); await api.applyBrand(S.filmId); toast(t('brand.applied')); setTimeout(() => location.reload(), 500); } catch (e: any) { toast(e.message, 'err'); }
  });
}
function showSuggestion(root: HTMLElement): void {
  const s = suggestion, box = $('#sugg', root); if (!s || !s.palette) return;
  box.innerHTML = `<div class="swatches" role="list">${s.palette.map(c => `<span role="listitem" class="swatch" style="background:${c.hex}" title="${c.hex} · ${(c.share * 100).toFixed(0)}%"></span>`).join('')}</div>${s.roles ? `<button class="btn" type="button" id="use-sugg">${t('brand.suggested')}</button>` : ''}`;
  $('#use-sugg', box)?.addEventListener('click', async () => { try { data = await api.saveBrand({ colors: s.roles! }); suggestion = null; render(root); } catch (e: any) { toast(e.message, 'err'); } });
}
export const initBrand = () => bus.on('tab:brand', () => void build());

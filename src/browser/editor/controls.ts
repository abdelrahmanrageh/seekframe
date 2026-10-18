// One control per manifest param type. Controls of the same param (e.g. on duplicated scenes) stay in sync through `ctrls`.
import type { Param } from '../../types';
import { api } from './api';
import { el, esc, toast } from './dom';
import { S, filmBase } from './state';
import { changed, applySoon } from './film';

const ctrls: Record<string, Array<(v: any) => void>> = {};
export const resetControls = () => { for (const k of Object.keys(ctrls)) delete ctrls[k]; };
const reg = (id: string, fn: (v: any) => void) => { (ctrls[id] = ctrls[id] || []).push(fn); };
function setParam(p: Param, v: any, origin?: (v: any) => void): void {
  if (v === p.default) delete S.project.params[p.id]; else S.project.params[p.id] = v;
  (ctrls[p.id] || []).forEach(f => f !== origin && f(v));
  changed(); applySoon();
}
export function control(p: Param): HTMLElement {
  const f = el('div', 'field'), cur = () => S.project.params[p.id] == null ? p.default : S.project.params[p.id];
  const id = 'c-' + p.id.replace(/[^\w-]/g, '_') + '-' + Math.random().toString(36).slice(2, 6), label = esc(p.label || p.id);
  f.innerHTML = `<label for="${id}">${label}</label>`;
  const mark = (node: HTMLElement, v: unknown) => node.classList.toggle('mod', v !== p.default);
  let setter: ((v: any) => void) | undefined;
  if (p.type === 'text') {
    const ta = el(p.multiline ? 'textarea' : 'input', { id }, '', f) as HTMLInputElement & HTMLTextAreaElement;
    if (!p.multiline) ta.type = 'text'; else ta.rows = 1; ta.spellcheck = false; if (p.maxLength) ta.maxLength = p.maxLength;
    const grow = () => { if (p.multiline) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; } };
    setter = v => { ta.value = v; mark(ta, v); grow(); }; setter(cur());
    ta.addEventListener('input', () => { mark(ta, ta.value); grow(); setParam(p, ta.value, setter); });
    new MutationObserver(grow).observe(f, { attributes: true }); requestAnimationFrame(grow);
  } else if (p.type === 'number') {
    const row = el('div', 'c2', '', f), r = el('input', { type: 'range', id, 'aria-label': p.label || p.id }, '', row), n = el('input', { type: 'number', 'aria-label': (p.label || p.id) + ' (number)' }, '', row);
    [r, n].forEach(i => { i.min = String(p.min ?? 0); i.max = String(p.max ?? 100); i.step = String(p.step ?? 1); });
    setter = v => { r.value = n.value = String(v); mark(n, +v); }; setter(cur());
    const on = (i: HTMLInputElement) => () => { const v = +i.value; if (Number.isNaN(v)) return; setter!(v); setParam(p, v, setter); };
    r.addEventListener('input', on(r)); n.addEventListener('input', on(n));
    if (p.unit) el('span', 'spd', esc(p.unit), row);
  } else if (p.type === 'color') {
    const row = el('div', 'c2', '', f), c = el('input', { type: 'color', id, 'aria-label': p.label || p.id }, '', row), tx = el('input', { type: 'text', spellcheck: 'false', 'aria-label': (p.label || p.id) + ' (hex)' }, '', row);
    const hex = (v: string) => /^#[0-9a-f]{6}$/i.test(v) ? v : '#000000';
    setter = v => { c.value = hex(v); tx.value = v; mark(tx, v); }; setter(cur());
    c.addEventListener('input', () => { setter!(c.value); setParam(p, c.value, setter); });
    tx.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(tx.value)) c.value = tx.value; mark(tx, tx.value); setParam(p, tx.value, setter); });
  } else if (p.type === 'boolean') {
    f.innerHTML = ''; const l = el('label', 'sw', `<input type="checkbox" id="${id}"> ${label}`, f), cb = l.querySelector('input')!;
    setter = v => { cb.checked = !!v; }; setter(cur()); cb.addEventListener('change', () => setParam(p, cb.checked, setter));
  } else if (p.type === 'select') {
    const s = el('select', { id }, '', f);
    (p.options || []).forEach(o => { const v = typeof o === 'object' ? o.value : o; const op = el('option', '', esc(typeof o === 'object' ? o.label || o.value : o), s); op.value = v; });
    setter = v => { s.value = v; mark(s, v); }; setter(cur()); s.addEventListener('change', () => { mark(s, s.value); setParam(p, s.value, setter); });
  } else if (p.type === 'image') {
    const row = el('div', 'img', '<img alt=""><button class="btn" type="button">Choose image…</button><button class="btn" type="button">Default</button><input type="file" accept="image/*" hidden>', f);
    const img = row.querySelector('img')!, file = row.querySelector('input')!, [pick, dflt] = row.querySelectorAll('button');
    setter = v => { img.src = v ? filmBase() + v : ''; img.style.visibility = v ? 'visible' : 'hidden'; (dflt as HTMLButtonElement).disabled = v === p.default; }; setter(cur());
    pick.addEventListener('click', () => file.click()); dflt.addEventListener('click', () => { setter!(p.default); setParam(p, p.default, setter); });
    file.addEventListener('change', async () => { const fl = file.files![0]; if (!fl) return; try { const j = await api.uploadFile(S.filmId, fl); setter!(j.path); setParam(p, j.path, setter); } catch (e: any) { toast(e.message, 'err'); } });
  } else f.innerHTML += `<div class="spd warn">unsupported param type “${esc(p.type)}”</div>`;
  if (p.help) el('div', 'spd', esc(p.help), f);
  if (setter) reg(p.id, setter);
  return f;
}

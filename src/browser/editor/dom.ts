export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T => root.querySelector(sel) as T;
export const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T[] => [...root.querySelectorAll(sel)] as T[];
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;
/** el('button', {class:'btn', onclick: fn}, 'Save') or el('div', 'cls', '<b>html</b>') */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: string | Attrs, html?: string | Node | Array<Node | string>, parent?: Element | null): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (typeof attrs === 'string') e.className = attrs;
  else for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') (e as any)[k] = v;
    else if (k === 'class') e.className = String(v); else e.setAttribute(k, v === true ? '' : String(v));
  }
  if (typeof html === 'string') e.innerHTML = html; else if (html instanceof Node) e.appendChild(html); else if (Array.isArray(html)) html.forEach(h => e.append(h));
  if (parent) parent.appendChild(e);
  return e;
}
export const fmtTime = (frames: number, fps: number): string => { const s = frames / fps, m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`; };

/** Polite screen-reader announcement (also used for save/render status). */
export function announce(msg: string): void { const l = document.getElementById('live'); if (l) { l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30); } }
/** Small transient message. */
export function toast(msg: string, kind: 'ok' | 'warn' | 'err' = 'ok'): void {
  const box = document.getElementById('toasts') || el('div', { id: 'toasts', 'aria-hidden': 'true' }, '', document.body);
  const t = el('div', 'toast ' + kind, esc(msg), box); announce(msg); setTimeout(() => t.remove(), 4200);
}
export const debounce = <A extends unknown[]>(fn: (...a: A) => void, ms: number) => { let h = 0; return (...a: A) => { clearTimeout(h); h = window.setTimeout(() => fn(...a), ms); }; };
export async function copyText(s: string): Promise<void> { try { await navigator.clipboard.writeText(s); toast('Copied'); } catch { toast('Copy failed', 'warn'); } }

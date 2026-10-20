// Ready-made building blocks for kit films (SF.ui) and the responsive canvas (SF.canvas). Plain DOM + CSS variables
// (--acc, --accInk, --fg, --bg, --u), so brand colours apply. They only build elements; the motion kit animates them.
const STYLE_ID = 'sf-ui-css';
const CSS = `
.sf-blobs{position:absolute;inset:0;overflow:hidden;pointer-events:none}.sf-blobs i{position:absolute;border-radius:50%;filter:blur(calc(90*var(--u,1)*1px));opacity:.55}
.sf-pill{display:inline-flex;align-items:center;gap:.5em;padding:.45em 1em;border-radius:999px;background:color-mix(in srgb,var(--fg,#fff) 12%,transparent);border:1px solid color-mix(in srgb,var(--fg,#fff) 22%,transparent);font-size:calc(30*var(--u,1)*1px);font-weight:600;white-space:nowrap}
.sf-pill.acc{background:var(--acc);color:var(--accInk,#000);border-color:transparent}
.sf-card{border-radius:calc(28*var(--u,1)*1px);padding:calc(36*var(--u,1)*1px);background:color-mix(in srgb,var(--fg,#fff) 9%,transparent);border:1px solid color-mix(in srgb,var(--fg,#fff) 18%,transparent);box-shadow:0 calc(30*var(--u,1)*1px) calc(80*var(--u,1)*1px) rgba(0,0,0,.28)}
.sf-card h3{font-size:calc(52*var(--u,1)*1px);line-height:1.1;margin-bottom:.3em}.sf-card p{font-size:calc(34*var(--u,1)*1px);opacity:.85;line-height:1.3}
.sf-chips{display:flex;flex-wrap:wrap;gap:calc(16*var(--u,1)*1px)}
.sf-frame{position:relative;border-radius:calc(26*var(--u,1)*1px);overflow:hidden;background:var(--bg,#111);border:1px solid color-mix(in srgb,var(--fg,#fff) 20%,transparent);box-shadow:0 calc(40*var(--u,1)*1px) calc(100*var(--u,1)*1px) rgba(0,0,0,.4)}
.sf-bar{display:flex;align-items:center;gap:calc(10*var(--u,1)*1px);padding:calc(18*var(--u,1)*1px) calc(24*var(--u,1)*1px);background:color-mix(in srgb,var(--fg,#fff) 8%,transparent);font-size:calc(24*var(--u,1)*1px)}
.sf-bar b{width:calc(14*var(--u,1)*1px);height:calc(14*var(--u,1)*1px);border-radius:50%;background:color-mix(in srgb,var(--fg,#fff) 35%,transparent)}.sf-bar span{margin-inline-start:calc(16*var(--u,1)*1px);opacity:.7}
.sf-screen{position:relative;width:100%;flex:1}.sf-browser{display:flex;flex-direction:column}
.sf-phone{border-radius:calc(64*var(--u,1)*1px);padding:calc(16*var(--u,1)*1px);border:calc(8*var(--u,1)*1px) solid color-mix(in srgb,var(--fg,#fff) 30%,transparent)}.sf-phone .sf-screen{border-radius:calc(48*var(--u,1)*1px);overflow:hidden;height:100%}
.sf-composer{display:flex;align-items:flex-start;gap:calc(20*var(--u,1)*1px);padding:calc(28*var(--u,1)*1px);border-radius:calc(30*var(--u,1)*1px);background:color-mix(in srgb,var(--fg,#fff) 10%,transparent);border:1px solid color-mix(in srgb,var(--fg,#fff) 22%,transparent)}
.sf-composer .in{flex:1;min-height:calc(120*var(--u,1)*1px);font-size:calc(40*var(--u,1)*1px);line-height:1.3}.sf-send{flex:none;width:calc(76*var(--u,1)*1px);height:calc(76*var(--u,1)*1px);border-radius:50%;background:var(--acc);color:var(--accInk,#000);display:grid;place-items:center;font-size:calc(40*var(--u,1)*1px);font-weight:800}
.sf-counter{display:flex;flex-direction:column;gap:.15em}.sf-counter .v{font-size:calc(150*var(--u,1)*1px);font-weight:800;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}.sf-counter .l{font-size:calc(34*var(--u,1)*1px);opacity:.75}
.sf-ticker{position:relative;overflow:hidden;white-space:nowrap;width:100%}.sf-ticker .t{display:inline-flex;gap:calc(48*var(--u,1)*1px);will-change:transform}
.sf-logo{display:flex;flex-direction:column;align-items:center;gap:calc(28*var(--u,1)*1px);text-align:center}.sf-logo .mark{max-height:calc(300*var(--u,1)*1px);max-width:70%}.sf-logo .word{font-size:calc(150*var(--u,1)*1px);font-weight:800;letter-spacing:-.03em;line-height:1}.sf-logo .tag{font-size:calc(34*var(--u,1)*1px);letter-spacing:.18em;text-transform:uppercase;opacity:.8}
`;
const el = (tag: string, cls: string, parent?: Element | null, html?: string): HTMLElement => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const ensure = () => { if (!document.getElementById(STYLE_ID)) { const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = CSS; document.head.appendChild(s); } };

export interface Drawn { el: HTMLElement; draw(f: number): void }
export interface UI {
  /** soft moving colour blobs; marked as background (not counted as content). Call `draw(f)` from your seek. */
  blobs(parent: Element, o?: { colors?: string[]; count?: number; speed?: number }): Drawn;
  pill(parent: Element, text: string, o?: { accent?: boolean }): HTMLElement;
  card(parent: Element, o?: { title?: string; body?: string }): HTMLElement;
  /** a row of pills; returns each pill so you can `T.pop(chips, at)` them */
  chips(parent: Element, labels: string[], o?: { accent?: boolean }): { row: HTMLElement; chips: HTMLElement[] };
  browser(parent: Element, o?: { url?: string; width?: number; height?: number }): { el: HTMLElement; screen: HTMLElement };
  phone(parent: Element, o?: { width?: number; height?: number }): { el: HTMLElement; screen: HTMLElement };
  /** a prompt box: type into `input` with `T.type`, press `send` with `T.press` */
  composer(parent: Element, o?: { width?: number }): { el: HTMLElement; input: HTMLElement; send: HTMLElement };
  counter(parent: Element, o?: { label?: string }): { el: HTMLElement; value: HTMLElement; label: HTMLElement };
  /** endless scrolling items (marked as a ticker). Call `draw(f)` from your seek; `speed` is px per frame. */
  ticker(parent: Element, items: string[], o?: { speed?: number }): Drawn;
  /** a logo (image, or your own element in `mark`), a wordmark and a tagline, ready for `T.reveal` */
  logo(parent: Element, o?: { src?: string; word?: string; tagline?: string }): { el: HTMLElement; mark: HTMLElement; word: HTMLElement; tag: HTMLElement };
}
export const ui: UI = {
  blobs(parent, o = {}) {
    ensure(); const box = el('div', 'sf-blobs', parent); box.setAttribute('data-sf-bg', ''); box.setAttribute('aria-hidden', 'true');
    const cols = o.colors || ['var(--acc)', 'var(--fg)'], n = o.count || 4, speed = o.speed ?? 1, bl = Array.from({ length: n }, (_, i) => { const b = el('i', '', box); b.style.background = cols[i % cols.length]; const s = 28 + hash(i + 1) * 22; b.style.width = b.style.height = s + '%'; return b; });
    return { el: box, draw(f) { bl.forEach((b, i) => { const t = f * .004 * speed, x = 50 + 38 * Math.sin(t * (1 + hash(i) * .7) + i * 2.1), y = 50 + 34 * Math.cos(t * (.8 + hash(i + 9) * .6) + i * 1.3); b.style.left = `calc(${x}% - ${(28 + hash(i + 1) * 22) / 2}%)`; b.style.top = `calc(${y}% - ${(28 + hash(i + 1) * 22) / 2}%)`; }); } };
  },
  pill(parent, text, o = {}) { ensure(); return el('span', 'sf-pill' + (o.accent ? ' acc' : ''), parent, esc(text)); },
  card(parent, o = {}) { ensure(); return el('div', 'sf-card', parent, (o.title ? `<h3>${esc(o.title)}</h3>` : '') + (o.body ? `<p>${esc(o.body)}</p>` : '')); },
  chips(parent, labels, o = {}) { ensure(); const row = el('div', 'sf-chips', parent); return { row, chips: labels.map(l => ui.pill(row, l, o)) }; },
  browser(parent, o = {}) {
    ensure(); const w = el('div', 'sf-frame sf-browser', parent); if (o.width) w.style.width = o.width + 'px'; if (o.height) w.style.height = o.height + 'px';
    el('div', 'sf-bar', w, `<b></b><b></b><b></b><span>${esc(o.url || '')}</span>`); return { el: w, screen: el('div', 'sf-screen', w) };
  },
  phone(parent, o = {}) {
    ensure(); const w = el('div', 'sf-frame sf-phone', parent); w.style.width = (o.width || 420) + 'px'; w.style.height = (o.height || 860) + 'px'; return { el: w, screen: el('div', 'sf-screen', w) };
  },
  composer(parent, o = {}) {
    ensure(); const w = el('div', 'sf-composer', parent); if (o.width) w.style.width = o.width + 'px';
    const input = el('div', 'in', w), send = el('div', 'sf-send', w, '↑'); send.setAttribute('aria-hidden', 'true'); return { el: w, input, send };
  },
  counter(parent, o = {}) { ensure(); const w = el('div', 'sf-counter', parent), value = el('div', 'v', w, '0'), label = el('div', 'l', w, esc(o.label || '')); return { el: w, value, label }; },
  ticker(parent, items, o = {}) {
    ensure(); const w = el('div', 'sf-ticker', parent); w.setAttribute('data-sf-ticker', ''); const t = el('div', 't', w, [...items, ...items, ...items].map(s => `<span>${esc(s)}</span>`).join(''));
    const speed = o.speed ?? 3; return { el: w, draw(f) { const one = t.scrollWidth / 3, dir = document.documentElement.dir === 'rtl' ? 1 : -1; t.style.transform = `translateX(${dir * ((f * speed) % one) - (dir < 0 ? 0 : one)}px)`; } };
  },
  logo(parent, o = {}) {
    ensure(); const w = el('div', 'sf-logo', parent), mark = o.src ? el('img', 'mark', w) : el('div', 'mark', w); if (o.src) (mark as HTMLImageElement).src = o.src;
    return { el: w, mark, word: el('div', 'word', w, esc(o.word || '')), tag: el('div', 'tag', w, esc(o.tagline || '')) };
  },
};

/* ---------- responsive canvas ---------- */
export interface CanvasOpts { /** design size per aspect (px); `default` is used when the aspect has none */ design: Partial<Record<'16x9' | '9x16' | '1x1' | 'default', [number, number]>> }
export interface Canvas { root: HTMLElement; w: number; h: number; scale: number; aspect: string; portrait: boolean }
/** One canvas, every size: `root` is a fixed w x h design space (chosen by the frame's aspect), scaled to fit and centred.
    Write the layout once per aspect (a row on 16:9, a column on 9:16); the frame size does the rest. */
export function canvas(parent: Element, o: CanvasOpts): Canvas {
  const W = window.innerWidth, H = window.innerHeight, r = W / H, aspect = Math.abs(r - 16 / 9) < .05 ? '16x9' : Math.abs(r - 9 / 16) < .05 ? '9x16' : Math.abs(r - 1) < .05 ? '1x1' : r > 1 ? 'wide' : 'tall';
  const [w, h] = (o.design as any)[aspect] || o.design.default || o.design['16x9'] || [1920, 1080], scale = Math.min(W / w, H / h);
  const root = el('div', 'sf-canvas', parent); Object.assign(root.style, { position: 'absolute', left: '0', top: '0', width: w + 'px', height: h + 'px', transformOrigin: '0 0', transform: `translate(${(W - w * scale) / 2}px,${(H - h * scale) / 2}px) scale(${scale})` });
  root.style.setProperty('--u', '1'); return { root, w, h, scale, aspect, portrait: H > W };
}

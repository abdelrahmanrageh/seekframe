import { $, $$ } from './dom';
import { bus } from './state';

export function setTab(name: string): void {
  $$('#tabs button').forEach(b => { const on = b.dataset.t === name; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  $$('.pane').forEach(p => { const on = p.id === 'p-' + name; p.classList.toggle('on', on); p.hidden = !on; });
  bus.emit('tab:' + name);
}
export function initTabs(): void {
  const btns = $$('#tabs button');
  btns.forEach((b, i) => {
    b.addEventListener('click', () => setTab(b.dataset.t!));
    b.addEventListener('keydown', e => {                                    // roving tabindex: ←/→ move between tabs, Home/End jump
      const rtl = document.documentElement.dir === 'rtl'; let n = i;
      if (e.key === 'ArrowRight') n = i + (rtl ? -1 : 1); else if (e.key === 'ArrowLeft') n = i + (rtl ? 1 : -1); else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = btns.length - 1; else return;
      e.preventDefault(); n = (n + btns.length) % btns.length; btns[n].focus(); setTab(btns[n].dataset.t!);
    });
  });
  setTab('scenes');
}

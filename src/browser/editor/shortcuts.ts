import { S } from './state';
import { toggle, seek, pause, saveNow, gotoClip } from './film';
import * as History from './history';
import * as Timeline from '../../core/timeline';
import { openShortcuts } from './dialogs';

export function initShortcuts(): void {
  addEventListener('keydown', e => {
    const tag = (document.activeElement?.tagName || '').toLowerCase(), typing = /^(input|textarea|select)$/.test(tag) || (document.activeElement as HTMLElement)?.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); void saveNow(); return; }
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? History.redo() : History.undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); History.redo(); return; }
    if (typing || mod || e.altKey || document.querySelector('.backdrop')) return;
    if (e.key === '?') { e.preventDefault(); openShortcuts(); }
    else if (e.code === 'Space' && !/^(button|summary|a)$/.test(tag)) { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { if ((document.activeElement as HTMLElement)?.classList.contains('grip') || document.activeElement?.id === 'scrub') return; e.preventDefault(); pause(); seek(Math.round(S.frame) + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? S.fps : 1)); }
    else if (e.key === 'Home') { pause(); seek(0); } else if (e.key === 'End') { pause(); seek(S.tl.total - 1); }
    else if (e.key === '[' || e.key === ']') { const c = Timeline.clipAt(S.tl, S.frame); gotoClip(c.i + (e.key === ']' ? 1 : -1)); }
  });
}

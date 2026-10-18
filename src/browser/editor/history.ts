// Undo/redo over project snapshots (the project is plain JSON), plus a human-readable diff for the version-history dialog.
import { bus } from './state';

const undoStack: string[] = [], redoStack: string[] = [];
let current = '';
const LIMIT = 100;
let restore: (json: string) => void = () => {};

export function registerRestore(fn: (json: string) => void): void { restore = fn; }
export function reset(snapshot: string): void { undoStack.length = 0; redoStack.length = 0; current = snapshot; bus.emit('history'); }
export function push(snapshot: string): void {
  if (snapshot === current) return;
  if (current) undoStack.push(current); if (undoStack.length > LIMIT) undoStack.shift();
  current = snapshot; redoStack.length = 0; bus.emit('history');
}
export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;
export function undo(): boolean { if (!undoStack.length) return false; redoStack.push(current); current = undoStack.pop()!; restore(current); bus.emit('history'); return true; }
export function redo(): boolean { if (!redoStack.length) return false; undoStack.push(current); current = redoStack.pop()!; restore(current); bus.emit('history'); return true; }

/** what changed between two stored projects, in words */
export function diffProjects(a: any, b: any): string[] {
  const out: string[] = [], pa = a.params || {}, pb = b.params || {};
  const ids = [...new Set([...Object.keys(pa), ...Object.keys(pb)])].filter(k => JSON.stringify(pa[k]) !== JSON.stringify(pb[k]));
  if (ids.length) out.push(`${ids.length} option${ids.length > 1 ? 's' : ''}: ${ids.slice(0, 6).join(', ')}${ids.length > 6 ? ', …' : ''}`);
  const ca = (a.clips || []).map((c: any) => `${c.scene}:${c.frames ?? ''}:${c.in ?? ''}:${c.out ?? ''}`).join('|'), cb = (b.clips || []).map((c: any) => `${c.scene}:${c.frames ?? ''}:${c.in ?? ''}:${c.out ?? ''}`).join('|');
  if (ca !== cb) out.push('scene order, length or trim');
  if (JSON.stringify(a.audio || {}) !== JSON.stringify(b.audio || {})) out.push('audio');
  if (JSON.stringify(a.output || {}) !== JSON.stringify(b.output || {})) out.push('output size');
  return out;
}

// Pure colour maths (WCAG 2.1 contrast). No Node APIs: shared by the CLI, the review tool and the editor's Brand panel.
export type RGB = [number, number, number];
export const hex = (c: number[]): string => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const unhex = (h: string): RGB => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) || 0) as RGB; };
export const isHex = (s: string): boolean => /^#[0-9a-f]{6}$/i.test(s);
const lin = (c: number) => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
export const lum = (c: number[]): number => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
export const contrast = (a: number[], b: number[]): number => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + .05) / (Math.min(la, lb) + .05); };
export const contrastHex = (a: string, b: string): number => contrast(unhex(a), unhex(b));
/** 'AAA' | 'AA' | 'AA large text only' | 'FAILS' */
export const grade = (ratio: number): string => ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large text only' : 'FAILS';
/** the pairs a brand should check: [label, foreground role, background role] */
export const PAIRS: Array<[string, string, string]> = [['ink on paper', 'ink', 'paper'], ['muted on paper', 'muted', 'paper'], ['accent on ink', 'accent', 'ink'], ['accent on paper', 'accent', 'paper'], ['ink on accent', 'ink', 'accent'], ['paper on ink', 'paper', 'ink']];

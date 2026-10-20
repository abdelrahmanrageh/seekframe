// Runs INSIDE a film page (Playwright's page.evaluate in `review`, or directly on the iframe window in the editor).
// It must stay a single self-contained function: it is serialised when sent to the page.
export interface TextBox { text: string; x: number; y: number; w: number; h: number; color: string; fill: string; size: number; weight: number; op: number; ticker?: boolean; words: number;   /* reading load: characters / 6 */ allow: string[] }
export interface ProbeResult { items: TextBox[]; W: number; H: number }

// everything the page can tell us about visible text at the current frame
export function probeText(win: Window = window): ProbeResult {
  const out: TextBox[] = [], W = win.innerWidth, H = win.innerHeight;
  const walker = win.document.createTreeWalker(win.document.body, 4 /* NodeFilter.SHOW_TEXT */);
  const seen = new Set<Element>();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = (n.nodeValue || '').trim(); if (!t) continue; const e = n.parentElement; if (!e || seen.has(e) || ['SCRIPT', 'STYLE'].includes(e.tagName)) continue; seen.add(e);
    const allow: string[] = []; let op = 1, vis = true, ticker = false; for (let x: HTMLElement | null = e; x; x = x.parentElement) { const cs = win.getComputedStyle(x); const al = x.getAttribute('data-sf-allow'); if (al) allow.push(al); op *= parseFloat(cs.opacity); if (cs.display === 'none' || cs.visibility === 'hidden' || x.hasAttribute('data-sf-decorative') || x.getAttribute('aria-hidden') === 'true') vis = false; if (x.hasAttribute('data-sf-ticker')) ticker = true; }   // mock UI marked data-sf-decorative is illustration, not copy
    if (!vis || op < .6) continue;
    const range = win.document.createRange(); range.selectNodeContents(e); const r = range.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
    const cs = win.getComputedStyle(e);
    out.push({ text: t.slice(0, 40), x: r.left, y: r.top, w: r.width, h: r.height, color: cs.color, fill: cs.webkitTextFillColor, size: parseFloat(cs.fontSize), weight: +cs.fontWeight || 400, op, ticker, words: t.length / 6, allow });   // ticker: text that scrolls through the frame on purpose (no overflow check)
  }
  return { items: out, W, H };
}

export interface Box { x: number; y: number; w: number; h: number }
export interface BoxesResult { W: number; H: number; boxes: Box[] }
// Boxes of everything that reads as content (text, images, svg, canvas, video, cards with a fill, border or shadow) at the current frame.
// Left out: elements marked data-sf-bg, blurred glows, anything covering most of the frame (a background), and anything faded below 0.3.
// Must stay a single self-contained function (it is serialised into the page).
export function probeBoxes(win: Window = window): BoxesResult {
  const W = win.innerWidth, H = win.innerHeight, out: Box[] = [];
  const own = (e: Element) => { for (const n of Array.from(e.childNodes)) if (n.nodeType === 3 && (n.nodeValue || '').trim()) return true; return false; };
  for (const e of Array.from(win.document.body.querySelectorAll('*')) as HTMLElement[]) {
    if (['SCRIPT', 'STYLE', 'LINK', 'META', 'DEFS', 'FILTER', 'CLIPPATH', 'MASK', 'LINEARGRADIENT', 'RADIALGRADIENT', 'STOP', 'TITLE'].includes(e.tagName.toUpperCase())) continue;
    let op = 1, skip = false;
    for (let x: HTMLElement | null = e; x; x = x.parentElement) { const cs = win.getComputedStyle(x); op *= parseFloat(cs.opacity); if (cs.display === 'none' || cs.visibility === 'hidden' || x.hasAttribute('data-sf-bg') || /blur\(/.test(cs.filter) || x.id === 'grain') { skip = true; break; } }
    if (skip || op < .3) continue;
    const cs = win.getComputedStyle(e), tag = e.tagName.toLowerCase();
    const media = ['img', 'canvas', 'video'].includes(tag) || (tag === 'svg' && !e.closest('svg:not(:scope)'));
    const painted = (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) || (cs.backgroundImage && cs.backgroundImage !== 'none') || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') || (cs.boxShadow && cs.boxShadow !== 'none');
    if (!media && !painted && !own(e)) continue;
    let r: DOMRect;
    if (own(e) && !media && !painted) { const range = win.document.createRange(); range.selectNodeContents(e); r = range.getBoundingClientRect(); } else r = e.getBoundingClientRect();
    const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(W, r.right), y1 = Math.min(H, r.bottom);
    if (x1 - x0 < 6 || y1 - y0 < 6) continue;
    if ((x1 - x0) * (y1 - y0) > .8 * W * H) continue;
    out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  return { W, H, boxes: out };
}

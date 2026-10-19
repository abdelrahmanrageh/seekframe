// Runs INSIDE a film page (Playwright's page.evaluate in `review`, or directly on the iframe window in the editor).
// It must stay a single self-contained function: it is serialised when sent to the page.
export interface TextBox { text: string; x: number; y: number; w: number; h: number; color: string; fill: string; size: number; weight: number; op: number; ticker?: boolean }
export interface ProbeResult { items: TextBox[]; W: number; H: number }

// everything the page can tell us about visible text at the current frame
export function probeText(win: Window = window): ProbeResult {
  const out: TextBox[] = [], W = win.innerWidth, H = win.innerHeight;
  const walker = win.document.createTreeWalker(win.document.body, 4 /* NodeFilter.SHOW_TEXT */);
  const seen = new Set<Element>();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = (n.nodeValue || '').trim(); if (!t) continue; const e = n.parentElement; if (!e || seen.has(e) || ['SCRIPT', 'STYLE'].includes(e.tagName)) continue; seen.add(e);
    let op = 1, vis = true, ticker = false; for (let x: HTMLElement | null = e; x; x = x.parentElement) { const cs = win.getComputedStyle(x); op *= parseFloat(cs.opacity); if (cs.display === 'none' || cs.visibility === 'hidden' || x.hasAttribute('data-sf-decorative') || x.getAttribute('aria-hidden') === 'true') vis = false; if (x.hasAttribute('data-sf-ticker')) ticker = true; }   // mock UI marked data-sf-decorative is illustration, not copy
    if (!vis || op < .6) continue;
    const range = win.document.createRange(); range.selectNodeContents(e); const r = range.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
    const cs = win.getComputedStyle(e);
    out.push({ text: t.slice(0, 40), x: r.left, y: r.top, w: r.width, h: r.height, color: cs.color, fill: cs.webkitTextFillColor, size: parseFloat(cs.fontSize), weight: +cs.fontWeight || 400, op, ticker });   // ticker: text that scrolls through the frame on purpose (no overflow check)
  }
  return { items: out, W, H };
}

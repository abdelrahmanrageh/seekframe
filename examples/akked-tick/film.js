/* Akked — "The Tick". Horizontal brand film, 1920x1080 @30 fps, 35 s. Script: docs/akked-horizontal-brief.md.
   Contract: docs/FILM_SPEC.md — seek(f) is a pure function of f.
   One code base, two pages: films/akked-tick (EN) and films/akked-tick-ar (AR, right-to-left; sets window.FILM_LANG).
   Variants are params: hook (doubt / counter / cod), theme (mono / dark / lime), cards (bubbles / tiles). */
'use strict';
const LANG = SF.lang.code === 'ar' ? 'ar' : 'en', RTL = SF.lang.rtl, BASE = window.ASSET_BASE || '';
const W = 1920, H = 1080, FPS = 30;
const { clamp, lerp, rng, E, kf, el, css, esc, wipe, pop } = SF;       // shared helpers from the Seekframe runtime
const $ = (s, r = document) => r.querySelector(s);
const X = x => SF.X(x, W);                         // mirror horizontal layout for right-to-left
const words = SF.words;

/* ---------- text (per language) ---------- */
const TEXT = {
  en: {
    newOrder: 'New order', pills: ['Is it real?', 'Will they answer?', 'Will they pay?', 'Will it come back?'],
    count: '100', countA: 'orders.', countB: 'calls.', codA: 'Cash on [delivery.]', codB: 'Or cash on [return?]', returned: 'Returned',
    call: "Calling every customer doesn't scale.", missed: 'Missed call',
    line1: 'Akked confirms every order', line2: 'on WhatsApp [before you ship it.]',
    cards: ['Confirmed', 'Replied', 'Shipped', 'Recovered'],
    caption: 'Order confirmation  ·  AI replies  ·  Shipping updates',
    orders: 'Orders', today: 'Today', pending: 'Pending', confirmed: 'Confirmed',
    names: ['Sara M.', 'Omar K.', 'Mona A.', 'Youssef H.', 'Laila S.'], amounts: ['EGP 1,250', 'EGP 890', 'EGP 2,140', 'EGP 640', 'EGP 1,780'],
    chatName: 'Sara M.', online: 'online', chatOut: 'Hi Sara 👋 Your order #1021 is ready. Confirm it?', chatBtn: 'Confirm order', chatIn: 'Confirmed 👍', ai: 'Akked AI is replying…',
    burst: ['Confirmed', 'Delivered', 'Cart recovered', 'Shipped', '1,240 customers', 'Campaign sent', 'On its way', 'Replied'],
    tagline: 'Every order. Confirmed.', url: 'akked.app', year: '2026',
  },
  ar: {
    newOrder: 'أوردر جديد', pills: ['هو حقيقي؟', 'هيرد عليك؟', 'هيدفع؟', 'هيرجّعه؟'],
    count: '100', countA: 'أوردر.', countB: 'مكالمة.', codA: 'الدفع عند [الاستلام.]', codB: 'ولا [الرجوع] عند الاستلام؟', returned: 'مرتجع',
    call: 'مش هتقدر تكلم كل عميل بنفسك.', missed: 'مكالمة فائتة',
    line1: 'أكّد بيأكد كل أوردر', line2: 'على واتساب [قبل ما تشحنه.]',
    cards: ['اتأكد', 'اترد عليه', 'اتشحن', 'السلة رجعت'],
    caption: 'تأكيد الأوردرات  ·  ردود بالذكاء الاصطناعي  ·  تحديثات الشحن',
    orders: 'الأوردرات', today: 'النهارده', pending: 'مستني', confirmed: 'اتأكد',
    names: ['سارة م.', 'عمر ك.', 'منى أ.', 'يوسف ح.', 'ليلى س.'], amounts: ['1,250 ج.م', '890 ج.م', '2,140 ج.م', '640 ج.م', '1,780 ج.م'],
    chatName: 'سارة م.', online: 'متصلة', chatOut: 'أهلاً سارة 👋 طلبك رقم 1021 جاهز. تأكديه؟', chatBtn: 'تأكيد الطلب', chatIn: 'تمام أكدت 👍', ai: 'أكّد الذكي بيرد…',
    burst: ['اتأكد', 'اتسلم', 'السلة رجعت', 'اتشحن', '1,240 عميل', 'الحملة اتبعتت', 'في الطريق', 'اترد عليه'],
    tagline: 'كل أوردر. متأكّد.', url: 'akked.app', year: '2026',
  },
}[LANG];

/* ---------- themes ---------- */
const THEMES = {
  mono: {
    a: { bg: '#0B0B0B', fg: '#FFFFFF', muted: '#8E9590', acc: '#84FF00', accInk: '#0B0B0B', markA: '#FFFFFF', markC: '#84FF00', panel: 'rgba(255,255,255,.08)', line: 'rgba(255,255,255,.16)', wmInv: 1 },
    b: { bg: '#FFFFFF', fg: '#0B0B0B', muted: '#8E9590', acc: '#84FF00', accInk: '#0B0B0B', markA: '#0B0B0B', markC: '#84FF00', panel: '#EEF0EA', line: '#E1E4DC', wmInv: 0 },
    x: { bg: '#84FF00', fg: '#0B0B0B' }, glow: false,
  },
  dark: {
    a: { bg: 'radial-gradient(ellipse 75% 70% at 50% 45%,#0E3A1C 0%,#07230F 55%,#03120A 100%)', fg: '#FFFFFF', muted: '#86A892', acc: '#84FF00', accInk: '#06210D', markA: '#FFFFFF', markC: '#84FF00', panel: 'rgba(160,255,120,.10)', line: 'rgba(160,255,120,.28)', wmInv: 1 },
    b: { bg: 'radial-gradient(ellipse 80% 75% at 50% 40%,#123F20 0%,#0A2A14 60%,#05170B 100%)', fg: '#FFFFFF', muted: '#86A892', acc: '#84FF00', accInk: '#06210D', markA: '#FFFFFF', markC: '#84FF00', panel: 'rgba(160,255,120,.10)', line: 'rgba(160,255,120,.28)', wmInv: 1 },
    x: { bg: '#84FF00', fg: '#06210D' }, glow: true,
  },
  lime: {
    a: { bg: '#0B0B0B', fg: '#FFFFFF', muted: '#8E9590', acc: '#84FF00', accInk: '#0B0B0B', markA: '#FFFFFF', markC: '#84FF00', panel: 'rgba(255,255,255,.08)', line: 'rgba(255,255,255,.16)', wmInv: 1 },
    b: { bg: '#84FF00', fg: '#0B0B0B', muted: '#3C6300', acc: '#0B0B0B', accInk: '#84FF00', markA: '#0B0B0B', markC: '#FFFFFF', panel: 'rgba(11,11,11,.10)', line: 'rgba(11,11,11,.22)', wmInv: 0 },
    x: { bg: '#FFFFFF', fg: '#0B0B0B' }, glow: false,
  },
};

/* ---------- scenes (source timeline, frames @30) ---------- */
const SCENES = [
  { id: 'hook-1', name: 'Hook 1', start: 0, end: 90, act: 'A' },
  { id: 'hook-2', name: 'Hook 2', start: 90, end: 210, act: 'A' },
  { id: 'call', name: 'The call', start: 210, end: 285, act: 'A' },
  { id: 'construct', name: 'Logo construction', start: 285, end: 435, act: 'B' },
  { id: 'line', name: 'The line', start: 435, end: 540, act: 'B' },
  { id: 'cards', name: 'Cards', start: 540, end: 636, act: 'B' },
  { id: 'product', name: 'Product', start: 636, end: 798, act: 'A' },
  { id: 'burst', name: 'Burst', start: 798, end: 870, act: 'A' },
  { id: 'breath', name: 'Breath', start: 870, end: 891, act: 'B' },
  { id: 'end', name: 'End card', start: 891, end: 1050, act: 'B' },
];

/* ---------- params (the list depends on the chosen hook) ---------- */
const DEF = {
  hook: 'doubt', theme: 'mono', cards: 'bubbles', accent: '#84FF00', size: 100,
  newOrder: TEXT.newOrder, pill1: TEXT.pills[0], pill2: TEXT.pills[1], pill3: TEXT.pills[2], pill4: TEXT.pills[3],
  count: TEXT.count, countA: TEXT.countA, countB: TEXT.countB, codA: TEXT.codA, codB: TEXT.codB, returned: TEXT.returned,
  call: TEXT.call, missed: TEXT.missed, line1: TEXT.line1, line2: TEXT.line2,
  card1: TEXT.cards[0], card2: TEXT.cards[1], card3: TEXT.cards[2], card4: TEXT.cards[3], caption: TEXT.caption,
  chatOut: TEXT.chatOut, chatIn: TEXT.chatIn,
  b1: TEXT.burst[0], b2: TEXT.burst[1], b3: TEXT.burst[2], b4: TEXT.burst[3], b5: TEXT.burst[4], b6: TEXT.burst[5], b7: TEXT.burst[6], b8: TEXT.burst[7],
  tagline: TEXT.tagline, url: TEXT.url,
};
let P = {};
const V = id => (P[id] == null ? DEF[id] : P[id]);
function paramList() {
  const L = [], t = (id, label, scene, extra) => L.push({ id, type: 'text', label, scene, default: DEF[id], ...extra });
  L.push({ id: 'hook', type: 'select', label: 'Hook (opening)', default: DEF.hook, options: [{ value: 'doubt', label: 'Doubt — a new order, four questions' }, { value: 'counter', label: 'Counter — 100 orders, 100 calls' }, { value: 'cod', label: 'Cash on delivery — or on return?' }] });
  L.push({ id: 'theme', type: 'select', label: 'Style', default: DEF.theme, options: [{ value: 'mono', label: 'Mono — black & white, lime accent' }, { value: 'dark', label: 'Deep green — glow' }, { value: 'lime', label: 'Lime — lime brand acts' }] });
  L.push({ id: 'cards', type: 'select', label: 'Card shape (scene 6)', default: DEF.cards, options: [{ value: 'bubbles', label: 'Chat bubbles' }, { value: 'tiles', label: 'Folded tiles' }] });
  L.push({ id: 'accent', type: 'color', label: 'Accent colour', default: DEF.accent });
  L.push({ id: 'size', type: 'number', label: 'Headline size', default: DEF.size, min: 70, max: 130, step: 5, unit: '%' });
  const h = V('hook');
  if (h === 'doubt') { t('newOrder', 'Label under the dot', 'hook-1'); ['pill1', 'pill2', 'pill3', 'pill4'].forEach((id, i) => t(id, `Question ${i + 1}`, 'hook-2')); }
  if (h === 'counter') { t('count', 'Number', 'hook-1'); t('countA', 'Word after the number', 'hook-1'); t('countB', 'Second word', 'hook-2'); }
  if (h === 'cod') { t('codA', 'First line ([word] = highlighted)', 'hook-1'); t('codB', 'Second line ([word] = highlighted)', 'hook-2'); t('returned', 'Box label', 'hook-2'); }
  t('call', 'Line', 'call'); t('missed', 'Ghost card', 'call');
  t('line1', 'Line 1', 'line'); t('line2', 'Line 2 ([..] = highlighted)', 'line');
  ['card1', 'card2', 'card3', 'card4'].forEach((id, i) => t(id, `Card ${i + 1}`, 'cards'));
  t('caption', 'Caption', 'product'); t('chatOut', 'Message to customer', 'product', { multiline: true }); t('chatIn', 'Customer reply', 'product');
  ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'].forEach((id, i) => t(id, `Flash ${i + 1}`, 'burst'));
  t('tagline', 'Tagline', 'end'); t('url', 'URL', 'end');
  return L;
}

/* ---------- shared drawing pieces ---------- */
const MARK_A = 'M520 500 L392 594 C350 628 306 612 308 568 C326 460 470 112 560 112 C650 112 735 280 757 372';
const MARK_C = 'M563 428 L650 552 L1002 316';
const CK = [[563, 428], [650, 552], [1002, 316]];
const CK_L1 = Math.hypot(87, 124), CK_L = CK_L1 + Math.hypot(352, 236);
const ICONS = {
  check: 'M5 12.5l4.5 4.5L19 7', ticks: 'M1.5 12.5l4.5 4.5L15.5 7M10.5 16.5L20.5 7', chat: 'M12 3.5c4.9 0 8.5 3.3 8.5 7.6s-3.6 7.6-8.5 7.6c-1 0-2-.1-2.9-.4L4.5 20l1.2-3.7C4.3 14.9 3.5 13.1 3.5 11.1 3.5 6.8 7.1 3.5 12 3.5z',
  box: 'M12 2.5l8.5 4.2v10.6L12 21.5l-8.5-4.2V6.7zM3.5 6.7L12 11l8.5-4.3M12 11v10.5', cart: 'M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2M9.5 20.5h.01M17 20.5h.01',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5M16 3.5a4 4 0 0 1 0 7.5M22 21c0-3-1.6-5.2-4.5-6.1', send: 'M3 11.5L21 3l-6 18-3.5-7.5L3 11.5zM11.5 13.5L21 3',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  phone: 'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z',
};
const icon = (name, color = 'currentColor', w = 2) => `<svg viewBox="0 0 24 24" width="100%" height="100%" style="overflow:visible"><path d="${ICONS[name]}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// mark + wordmark lock-up centred at (cx, cy). Returns helpers to map mark coords to screen.
function lockup(parent, cx, cy, markW = 420) {
  const s = markW / 820, mh = 600 * s, wmH = 300, wmW = wmH * 1022 / 748, gap = 50, total = markW + gap + wmW;
  const x0 = cx - total / 2, my = cy - mh / 2;
  const svg = el('div', 'abs', parent, `<svg width="${markW}" height="${mh}" viewBox="230 50 820 600" style="overflow:visible;display:block">
    <path class="mA" d="${MARK_A}" fill="none" style="stroke:var(--markA)" stroke-width="84" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/>
    <path class="mC" d="${MARK_C}" fill="none" style="stroke:var(--markC)" stroke-width="86" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/></svg>`);
  css(svg, { left: x0 + 'px', top: my + 'px' });
  svg.firstChild.classList.add('gl');
  const wm = el('img', 'wm', parent); wm.src = BASE + 'assets/wordmark.png'; css(wm, { left: (x0 + markW + gap) + 'px', top: (cy - wmH / 2) + 'px', height: wmH + 'px' });
  const map = (X_, Y_) => ({ x: x0 + (X_ - 230) * s, y: my + (Y_ - 50) * s });
  const tip = p => { let d = clamp(p) * CK_L; const [a, b, c] = CK; if (d <= CK_L1) { const k = d / CK_L1; return map(lerp(a[0], b[0], k), lerp(a[1], b[1], k)); } const k = (d - CK_L1) / (CK_L - CK_L1); return map(lerp(b[0], c[0], k), lerp(b[1], c[1], k)); };
  return { svg, A: svg.querySelector('.mA'), C: svg.querySelector('.mC'), wm, map, tip, box: { x: x0, y: cy - Math.max(mh, wmH) / 2, w: total, h: Math.max(mh, wmH) }, wmX: x0 + markW + gap, wmW };
}
const dash = SF.dash;
function setDot(d, x, y, s = 1, o = 1) { d.style.transform = `translate(${x}px,${y}px) scale(${s})`; d.style.opacity = o; }

/* ---------- build ---------- */
let S = {};                                         // scene id -> {e, R}
function build() {
  const st = $('#stage'); st.innerHTML = ''; S = {};
  st.dir = RTL ? 'rtl' : 'ltr';
  const th = THEMES[V('theme')] || THEMES.mono, acc = V('accent');
  const swap = v => (typeof v === 'string' ? v.replace(/#84FF00/gi, acc) : v);
  for (const act of ['a', 'b']) for (const k in th[act]) st.style.setProperty(`--${act}-${k}`, swap(th[act][k]));
  st.style.setProperty('--x-bg', swap(th.x.bg)); st.style.setProperty('--x-fg', swap(th.x.fg));
  st.classList.toggle('glow', !!th.glow);
  const Z = V('size') / 100;
  for (const sc of SCENES) { const e = el('div', 'sc ' + sc.act, st); e.style.display = 'block'; S[sc.id] = { e, R: BUILD[sc.id](e, Z) || {} }; e.style.display = 'none'; } // shown while building so text can be measured
}

const BUILD = {
  'hook-1'(e, Z) {
    const h = V('hook'), R = { h };
    if (h === 'doubt') {
      R.dot = el('div', 'dot gl', e); R.ring1 = el('div', 'ring', e); R.ring2 = el('div', 'ring', e);
      R.lab = el('div', 'abs label', e, esc(V('newOrder'))); css(R.lab, { left: '0', width: W + 'px', top: '600px', textAlign: 'center' });
    } else if (h === 'counter') {
      R.t = el('div', 'abs big tx', e); css(R.t, { top: '330px', [RTL ? 'right' : 'left']: '170px', fontSize: 230 * Z + 'px', whiteSpace: 'nowrap' });
      R.num = el('span', 'w', R.t); R.t.appendChild(document.createTextNode(' ')); R.word = words(R.t, V('countA'));
      R.u = el('div', 'abs gl', e, `<svg width="900" height="80" viewBox="0 0 900 80" style="overflow:visible"><path d="M10 52 C180 18 330 70 520 38 S760 22 890 48" fill="none" style="stroke:var(--acc)" stroke-width="14" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/></svg>`);
      css(R.u, { top: (330 + 250 * Z) + 'px', [RTL ? 'right' : 'left']: '160px' }); if (RTL) R.u.style.transform = 'scaleX(-1)';
    } else {
      R.t = el('div', 'abs big tx', e); css(R.t, { top: '380px', [RTL ? 'right' : 'left']: '170px', right: RTL ? '170px' : '120px', fontSize: 170 * Z + 'px' });
      R.w = words(R.t, V('codA'));
    }
    return R;
  },
  'hook-2'(e, Z) {
    const h = V('hook'), R = { h };
    if (h === 'doubt') {
      R.q = el('div', 'qcircle gl', e, '?'); R.pills = ['pill1', 'pill2', 'pill3', 'pill4'].map(id => el('div', 'pill tx', e, esc(V(id))));
      R.pills.forEach(p => { p.style.fontSize = 66 * Z + 'px'; });
      R.pw = R.pills.map(p => p.offsetWidth); R.ph = R.pills.map(p => p.offsetHeight);
    } else if (h === 'counter') {
      R.t1 = el('div', 'abs big', e, `${esc(V('count'))} ${esc(V('countA'))}`); css(R.t1, { top: '250px', [RTL ? 'right' : 'left']: '170px', fontSize: 110 * Z + 'px', color: 'var(--muted)', whiteSpace: 'nowrap' });
      R.t2 = el('div', 'abs big tx', e); css(R.t2, { top: '420px', [RTL ? 'right' : 'left']: '170px', fontSize: 190 * Z + 'px', whiteSpace: 'nowrap' }); R.w = words(R.t2, `${V('count')} ${V('countB')}`);
      R.cells = []; for (let i = 0; i < 100; i++) { const c = el('div', 'cell', e); css(c, { left: X(1190 + (i % 10) * 54 + (RTL ? 30 : 0)) + 'px', top: (270 + Math.floor(i / 10) * 54) + 'px' }); R.cells.push(c); }
    } else {
      R.t1 = el('div', 'abs big', e); css(R.t1, { top: '170px', [RTL ? 'right' : 'left']: '170px', fontSize: 100 * Z + 'px', color: 'var(--muted)' }); words(R.t1, V('codA').replace(/[\[\]]/g, ''));
      R.t2 = el('div', 'abs big tx', e); css(R.t2, { top: '310px', [RTL ? 'right' : 'left']: '170px', right: RTL ? '170px' : '100px', fontSize: 150 * Z + 'px' }); R.w = words(R.t2, V('codB'));
      R.w.forEach(w => { if (w.classList.contains('hl')) w.classList.add('grey'); });
      R.track = el('div', 'abs', e, `<svg width="1580" height="10"><line x1="0" y1="5" x2="1580" y2="5" stroke="currentColor" stroke-width="4" stroke-dasharray="2 16" stroke-linecap="round" opacity=".35"/></svg>`); css(R.track, { left: '170px', top: '875px' });
      R.boxes = [0, 1, 2].map(() => { const b = el('div', 'abs', e, `<div style="width:120px;height:120px;color:var(--muted)">${icon('box', 'currentColor', 1.6)}</div><div class="label" style="position:absolute;top:126px;left:50%;transform:translateX(-50%);font-size:22px;white-space:nowrap">${esc(V('returned'))}</div>`); css(b, { left: '0px', top: '0px' }); return b; });
    }
    return R;
  },
  call(e, Z) {
    const R = {};
    R.ph = el('div', 'abs', e, `<div style="width:170px;height:170px;color:var(--muted)">${icon('phone', 'currentColor', 1.4)}</div>`); css(R.ph, { left: (W / 2 - 85) + 'px', top: '250px' });
    R.arcs = el('div', 'abs', e, `<svg width="420" height="240" viewBox="0 0 420 240"><path d="M80 50q-40 70 0 140M40 20q-62 100 0 200M340 50q40 70 0 140M380 20q62 100 0 200" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>`);
    css(R.arcs, { left: (W / 2 - 210) + 'px', top: '215px', color: 'var(--muted)' });
    R.gh = [0, 1, 2].map(i => { const g = el('div', 'ghost', e, `<span style="width:30px;height:30px;display:inline-block">${icon('phone', 'currentColor', 2)}</span>${esc(V('missed'))} ×${3 + i * 2}`); return g; });
    R.t = el('div', 'abs big tx', e); css(R.t, { left: '0', width: W + 'px', top: '600px', textAlign: 'center', fontSize: 84 * Z + 'px', padding: '0 160px' });
    R.w = words(R.t, V('call'));
    return R;
  },
  construct(e) {
    const R = { L: lockup(e, W / 2, H / 2) };
    const { map } = R.L, gl = [], an = [];
    const line = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy); return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, ux: dx / n, uy: dy / n }; };
    const p1 = map(...CK[0]), p2 = map(...CK[1]), p3 = map(...CK[2]), top = map(560, 112), aL = map(308, 568), aE = map(757, 372), aS = map(520, 500);
    [line({ x: 0, y: p1.y }, { x: W, y: p1.y }), line({ x: 0, y: p2.y }, { x: W, y: p2.y }), line(p1, p2), line(p2, p3), line({ x: 0, y: top.y }, { x: W, y: top.y }), line({ x: aL.x, y: 0 }, { x: aL.x, y: H }), line({ x: p3.x, y: 0 }, { x: p3.x, y: H })]
      .forEach(g => gl.push(g));
    const svg = el('div', 'abs', e, `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible">${gl.map(() => '<line class="guide"/>').join('')}${[p1, p2, p3, top, aL, aE, aS].map(p => `<rect class="anchor" x="${p.x - 7}" y="${p.y - 7}" width="14" height="14"/>`).join('')}
      <rect class="guide sp" x="${R.L.box.x - 70}" y="${R.L.box.y - 70}" width="${R.L.box.w + 140}" height="${R.L.box.h + 140}"/>
      ${[[R.L.box.x - 70, R.L.box.y - 70], [R.L.box.x + R.L.box.w + 70, R.L.box.y - 70], [R.L.box.x - 70, R.L.box.y + R.L.box.h + 70], [R.L.box.x + R.L.box.w + 70, R.L.box.y + R.L.box.h + 70]].map(([x, y]) => `<g class="sp"><rect x="${x - 26}" y="${y - 26}" width="52" height="52" fill="var(--panel)"/><text class="glabel" x="${x}" y="${y + 6}" text-anchor="middle">1x</text></g>`).join('')}</svg>`);
    css(svg, { left: '0px', top: '0px' }); R.lines = [...svg.querySelectorAll('line')]; R.anchors = [...svg.querySelectorAll('.anchor')]; R.sp = [...svg.querySelectorAll('.sp')]; R.gl = gl;
    R.dot = el('div', 'dot gl', e);
    return R;
  },
  line(e, Z) {
    const R = {};
    R.wm = el('img', 'wm', e); R.wm.src = BASE + 'assets/wordmark.png'; css(R.wm, { top: '90px', height: '84px', [RTL ? 'right' : 'left']: '170px' });
    R.t = el('div', 'abs big tx', e); css(R.t, { top: '350px', [RTL ? 'right' : 'left']: '170px', width: '1640px', fontSize: 116 * Z + 'px' });
    const l1 = el('div', '', R.t), l2 = el('div', '', R.t); R.w1 = words(l1, V('line1')); R.w2 = words(l2, V('line2'));
    R.hls = R.w2.filter(w => w.classList.contains('hl'));
    R.foot = el('div', 'abs', e, `<span>${esc(V('url'))}</span><span>${esc(TEXT.year)}</span>`); css(R.foot, { left: '170px', right: '170px', bottom: '80px', display: 'flex', justifyContent: 'space-between', fontSize: '26px', color: 'var(--muted)' });
    return R;
  },
  cards(e) {
    const R = { cards: [] }, ic = ['check', 'chat', 'box', 'cart'], kind = V('cards');
    ['card1', 'card2', 'card3', 'card4'].forEach((id, i) => {
      const w = kind === 'tiles' ? 330 : 390, h = kind === 'tiles' ? 330 : 240;
      const shape = kind === 'tiles' ? `<path d="M0 0H210L${w} 120V${h}H0Z" style="fill:var(--acc)"/>` : `<path d="M36 0H${w - 36}a36 36 0 0 1 36 36V${h - 50}a36 36 0 0 1-36 36H78L26 ${h + 30}V${h - 14}A36 36 0 0 1 0 ${h - 50}V36A36 36 0 0 1 36 0Z" style="fill:var(--acc)"/>`;
      const c = el('div', 'card', e, `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="${RTL ? 'transform:scaleX(-1)' : ''}">${shape}</svg><div class="ico" style="${RTL ? 'right' : 'left'}:36px">${icon(ic[i], 'currentColor', 2.2)}</div><div class="lab" style="${RTL ? 'right' : 'left'}:38px;${kind === 'tiles' ? '' : 'bottom:44px'}">${esc(V(id))}</div>`);
      css(c, { width: w + 'px', height: h + 'px' }); c.firstChild.classList.add('gl');
      R.cards.push({ c, w, h });
    });
    return R;
  },
  product(e) {
    const R = {}, T = TEXT;
    const P = el('div', 'persp', e);
    R.dash = el('div', 'dash', P, `<div class="dh"><i></i>${esc(T.orders)}<span>${esc(T.today)}</span></div>
      <div class="th"><div class="c1">#</div><div class="c2">${RTL ? 'العميل' : 'Customer'}</div><div class="c3">${RTL ? 'المبلغ' : 'Amount'}</div><div class="c4">${RTL ? 'الحالة' : 'Status'}</div></div>
      ${T.names.map((n, i) => `<div class="tr"><div class="c1" style="font-weight:700">#${1021 - i}</div><div class="c2">${esc(n)}</div><div class="c3">${esc(T.amounts[i])}</div><div class="c4"><span class="st ${i ? 'c' : 'p'}">${i ? '✓ ' + esc(T.confirmed) : esc(T.pending)}</span></div></div>`).join('')}`);
    R.dash.dir = RTL ? 'rtl' : 'ltr'; R.dash.setAttribute('data-sf-decorative', '');   // mock UI: illustration, excluded from the contrast review
    R.row = R.dash.querySelector('.tr'); R.pill = R.row.querySelector('.st');
    R.phone = el('div', 'phone', P, `<div class="scr" dir="${RTL ? 'rtl' : 'ltr'}"><div class="hd"><div class="av">${RTL ? 'س' : 'S'}</div><div><div class="nm">${esc(T.chatName)}</div><div class="on">${esc(T.online)}</div></div></div></div>`);
    const scr = R.phone.firstChild; R.phone.setAttribute('data-sf-decorative', '');
    R.m1 = el('div', 'msg o', scr, `${esc(V('chatOut'))}<span class="tk">✓✓</span>`); R.btn = el('div', 'btn', scr, '✅ ' + esc(T.chatBtn)); R.m2 = el('div', 'msg i', scr, esc(V('chatIn')));
    const side = RTL ? 'left' : 'right', other = RTL ? 'right' : 'left';
    css(R.m1, { [side]: '16px', bottom: '250px' }); css(R.btn, { [side]: '16px', bottom: '186px' }); css(R.m2, { [other]: '16px', bottom: '110px' });
    R.chip = el('div', 'chip', scr, `<span style="width:20px;height:20px">${icon('chat', '#2C4A00', 2.4)}</span>${esc(T.ai)}`); css(R.chip, { left: '50%', top: '138px' });
    R.cap = el('div', 'caption', e, esc(V('caption'))); css(R.cap, { [RTL ? 'right' : 'left']: '170px' });
    R.P = P;
    return R;
  },
  burst(e) {
    const ic = ['check', 'ticks', 'cart', 'box', 'users', 'send', 'pin', 'chat'], acts = ['A', 'B', 'X', 'A', 'B', 'X', 'A', 'B'];
    return { items: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'].map((id, i) => { const d = el('div', 'burst ' + acts[i], e, `${icon(ic[i], 'var(--acc)', 1.8)}<div class="tx">${esc(V(id))}</div>`); d.firstChild.classList.add('gl'); return d; }) };
  },
  breath(e) { return { d: el('div', 'dot gl', e) }; },
  end(e, Z) {
    const R = { L: lockup(e, W / 2, 440, 380) };
    R.dot = el('div', 'dot gl', e);
    R.tag = el('div', 'abs big tx', e); css(R.tag, { left: 0, width: W + 'px', top: '690px', textAlign: 'center', fontSize: 84 * Z + 'px' }); R.tw = words(R.tag, V('tagline'));
    R.url = el('div', 'abs', e, esc(V('url'))); css(R.url, { left: 0, width: W + 'px', top: (700 + 120 * Z) + 'px', textAlign: 'center', fontSize: '38px', color: 'var(--muted)', fontWeight: 500 });
    return R;
  },
};

/* ---------- render (lf = local frame) ---------- */
const RENDER = {
  'hook-1'(lf, R) {
    if (R.h === 'doubt') {
      const land = 18, y = lf < land ? lerp(-60, H / 2, E.in(rng(lf, 4, land))) : H / 2;
      const sq = kf(lf, [[land, 1], [land + 3, .62, E.out], [land + 9, 1, E.out]]);
      const exit = E.io(rng(lf, 76, 90));
      R.dot.style.transform = `translate(${lerp(W / 2, X(1340), exit)}px,${y}px) scale(${1 / Math.sqrt(sq) * lerp(1, 1.6, exit)},${sq * lerp(1, 1.6, exit)})`; R.dot.style.opacity = lf >= 4 ? 1 : 0;
      [[R.ring1, 34], [R.ring2, 58]].forEach(([r, a]) => { const t = rng(lf, a, a + 18), s = lerp(40, 220, E.out(t)); css(r, { left: (W / 2 - s / 2) + 'px', top: (H / 2 - s / 2) + 'px', width: s + 'px', height: s + 'px', opacity: lf >= a ? (1 - t) * .8 : 0 }); });
      const lt = rng(lf, 26, 40); R.lab.style.opacity = lt * (1 - rng(lf, 72, 82)); R.lab.style.transform = `translateY(${(1 - E.out(lt)) * 20}px)`;
    } else if (R.h === 'counter') {
      const n = +String(V('count')).replace(/[^\d]/g, '') || 100, ct = E.out(rng(lf, 4, 42));
      R.num.textContent = String(Math.round(n * ct)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      pop([R.num], lf, 2, 4, 8); pop(R.word, lf, 40, 5, 10);
      R.u.firstChild.querySelector('path').style.strokeDashoffset = 1 - E.out(rng(lf, 46, 66));
      R.t.style.transform = `scale(${kf(lf, [[0, 1.06], [30, 1, E.expo], [90, .98, E.io]])})`; R.t.style.transformOrigin = RTL ? '100% 50%' : '0 50%';
    } else {
      pop(R.w, lf, 4, 8, 10, 34);
      const t = E.expo(rng(lf, 34, 44));
      R.w.forEach(w => { if (w.classList.contains('hl')) wipe(w, t); });
      R.t.style.transform = `translateX(${(RTL ? 1 : -1) * lf * .4}px)`;
    }
  },
  'hook-2'(lf, R) {
    if (R.h === 'doubt') {
      const cx = X(1340), cy = H / 2, r = kf(lf, [[0, 32], [14, 120, E.expo]]);
      css(R.q, { left: (cx - r) + 'px', top: (cy - r) + 'px', width: 2 * r + 'px', height: 2 * r + 'px', fontSize: r * 1.1 + 'px' });
      R.q.style.color = lf > 8 ? 'var(--accInk)' : 'transparent';
      const appear = i => 12 + i * 24;
      const SLOTS = [[0, 0, 1, 1, 0, -5], [-60, -150, .78, .6, 2.5, -9], [-20, 150, .72, .45, 3.5, 6], [-120, -290, .6, .28, 5, -12], [-140, 290, .5, .12, 6, 9]];
      const side = RTL ? -1 : 1;
      R.pills.forEach((p, i) => {
        const a = appear(i), t = E.expo(rng(lf, a, a + 12));
        let k = 0; for (let j = i + 1; j < R.pills.length; j++) k += E.io(rng(lf, appear(j), appear(j) + 12));
        const k0 = Math.min(Math.floor(k), SLOTS.length - 2), kk = k - k0, A = SLOTS[k0], B = SLOTS[k0 + 1];
        const sl = A.map((v, n) => lerp(v, B[n], kk));
        const pw = R.pw[i], ph = R.ph[i];
        const tx = cx - side * (r + 70 + pw / 2) + side * sl[0];          // centre of this pill at its slot
        const x = lerp(cx, tx, t), y = cy + sl[1];
        const exit = E.in(rng(lf, 106, 120));
        p.style.transform = `translate(${x - pw / 2}px,${y - ph / 2}px) scale(${lerp(.3, sl[2], t) * (1 - exit * .3)}) rotate(${side * sl[5] * t}deg)`;
        p.style.opacity = (lf >= a ? clamp(t * 1.4) : 0) * sl[3] * (1 - exit); p.style.filter = sl[4] > .1 ? `blur(${sl[4]}px)` : '';
      });
      R.q.style.transform = `scale(${1 - E.in(rng(lf, 108, 120)) * .5})`; R.q.style.opacity = 1 - rng(lf, 112, 120);
    } else if (R.h === 'counter') {
      R.t1.style.opacity = 1 - rng(lf, 100, 116); pop(R.w, lf, 4, 6, 10, 30);
      R.cells.forEach((c, i) => { const a = 10 + i * .82, t = lf - a; c.style.background = t < 0 ? 'var(--line)' : t < 6 ? 'var(--acc)' : 'var(--muted)'; c.style.opacity = t < 0 ? .5 : t < 6 ? 1 : .55; c.style.transform = `scale(${t >= 0 && t < 6 ? 1.15 : 1})`; });
    } else {
      R.t1.style.opacity = .9;
      pop(R.w, lf, 2, 6, 10, 30);
      R.boxes.forEach((b, i) => {
        const go = E.io(rng(lf, 16 + i * 7, 52 + i * 7)), back = E.io(rng(lf, 62 + i * 6, 100 + i * 6));
        const x = lerp(lerp(170, 1600, go), 170, back);
        b.style.transform = `translate(${X(x) - (RTL ? 120 : 0)}px,745px) rotate(${(go - back) * 8}deg)`; b.style.opacity = lf >= 14 + i * 7 ? 1 : 0;
        b.lastChild.style.opacity = rng(lf, 62 + i * 6, 70 + i * 6);
      });
    }
  },
  call(lf, R) {
    const vib = lf > 4 && lf < 48 ? Math.sin(lf * 2.3) * 7 + Math.sin(lf * 5.7) * 3 : 0, end = lf >= 60;
    R.ph.style.transform = `rotate(${vib}deg) scale(${E.expo(rng(lf, 0, 8))})`; R.arcs.style.opacity = lf > 4 && lf < 48 ? .35 + .4 * Math.abs(Math.sin(lf * .7)) : 0;
    R.gh.forEach((g, i) => { const a = 8 + i * 9, t = E.io(rng(lf, a, a + 24)); css(g, { left: (W / 2 - 150) + 'px', top: '330px', opacity: lf >= a ? (1 - t) * .9 : 0, transform: `translate(${(RTL ? 1 : -1) * t * 620}px,${(i - 1) * 90 * t}px) scale(${1 - t * .2})`, filter: `blur(${t * 6}px)` }); });
    pop(R.w, lf, 10, 4, 10);
    [R.ph, R.arcs, R.t].forEach(x => { x.style.visibility = end ? 'hidden' : 'visible'; });
    R.gh.forEach(g => { g.style.visibility = end ? 'hidden' : 'visible'; });
  },
  construct(lf, R) {
    const L = R.L;
    // dot: centre -> start of the check, then rides the check tip while it draws
    const st = L.tip(0), ckP = E.io(rng(lf, 30, 56));
    const d0 = E.io(rng(lf, 2, 18)), tp = L.tip(ckP);
    const dx = lf < 30 ? lerp(W / 2, st.x, d0) : tp.x, dy = lf < 30 ? lerp(H / 2, st.y, d0) : tp.y;
    setDot(R.dot, dx, dy, lf < 30 ? 1 : 1 + ckP * .3, 1 - rng(lf, 54, 60));
    R.lines.forEach((ln, i) => {
      const g = R.gl[i], p = E.out(rng(lf, 6 + i * 4, 30 + i * 4)) * 2400, o = 1 - rng(lf, 118, 136);
      ln.setAttribute('x1', g.mx - g.ux * p); ln.setAttribute('y1', g.my - g.uy * p); ln.setAttribute('x2', g.mx + g.ux * p); ln.setAttribute('y2', g.my + g.uy * p); ln.style.opacity = o;
    });
    R.anchors.forEach((a, i) => { const t = rng(lf, 14 + i * 5, 18 + i * 5); a.style.opacity = (lf >= 14 + i * 5 ? 1 : 0) * (1 - rng(lf, 112, 128)); a.style.transform = `scale(${lerp(1.8, 1, E.out(t))})`; a.style.transformBox = 'fill-box'; a.style.transformOrigin = 'center'; });
    dash(L.C, ckP); dash(L.A, E.io(rng(lf, 50, 80)));
    const wt = E.expo(rng(lf, 72, 96)); L.wm.style.clipPath = RTL ? `inset(0 0 0 ${(1 - wt) * 100}%)` : `inset(0 ${(1 - wt) * 100}% 0 0)`; L.wm.style.transform = `translateX(${(1 - wt) * 40}px)`;
    R.sp.forEach(s => { s.style.opacity = rng(lf, 92, 104) * (1 - rng(lf, 120, 134)); });
    const settle = kf(lf, [[0, 1.08], [24, 1, E.expo], [132, 1], [135, .985, E.out], [142, 1, E.out]]);
    [L.svg, L.wm].forEach(x => { x.style.scale = settle; x.style.transformOrigin = `${W / 2 - x.offsetLeft}px ${H / 2 - x.offsetTop}px`; });
  },
  line(lf, R) {
    R.wm.style.opacity = rng(lf, 0, 10);
    pop(R.w1, lf, 6, 4, 10); pop(R.w2, lf, 6 + R.w1.length * 4, 4, 10);
    const t = E.expo(rng(lf, 66, 78));
    R.hls.forEach(w => wipe(w, t, 'var(--muted)'));
    R.foot.style.opacity = rng(lf, 20, 34);
    R.t.style.transform = `translateY(${-lf * .25}px)`;
  },
  cards(lf, R) {
    const n = R.cards.length, gap = 60, tw = R.cards.reduce((a, c) => a + c.w, 0) + gap * (n - 1);
    let x = (W - tw) / 2;
    R.cards.forEach((c, i) => {
      const k = RTL ? n - 1 - i : i; let px = (W - tw) / 2; for (let j = 0; j < k; j++) px += R.cards[RTL ? n - 1 - j : j].w + gap;
      const a = i * 24, t = rng(lf, a, a + 10), s = kf(lf, [[a, 0], [a + 6, 1.07, E.out], [a + 11, 1, E.io]]);
      const exit = E.in(rng(lf, 84, 96)), yo = (i % 2 ? 40 : -40);
      c.c.style.left = px + 'px'; c.c.style.top = (H / 2 - c.h / 2 + yo) + 'px';
      c.c.style.transform = `translateY(${-exit * 900 + (1 - E.out(t)) * 40}px) scale(${s}) rotate(${(1 - E.out(t)) * (i % 2 ? 6 : -6)}deg)`;
      c.c.style.opacity = lf >= a ? 1 : 0;
      c.c.style.filter = exit > .02 ? `blur(${exit * 10}px)` : '';
    });
  },
  product(lf, R) {
    const side = RTL ? -1 : 1;
    const dIn = E.expo(rng(lf, 0, 26)), pIn = E.expo(rng(lf, 26, 50)), rack = E.io(rng(lf, 114, 132));
    css(R.dash, { left: (X(760) - 530) + 'px', top: '200px', transform: `translateX(${side * -(1 - dIn) * 300}px) rotateY(${side * 16}deg) rotateX(7deg) rotate(${side * -2}deg)`, opacity: dIn, filter: `blur(${lerp(lerp(8, 0, dIn), 5, rack)}px)` });
    css(R.phone, { left: (X(1440) - 195) + 'px', top: '150px', transform: `translateX(${side * (1 - pIn) * 520}px) translateY(${-lf * .25}px) rotateY(${side * -12}deg) rotate(${side * 3}deg)`, opacity: pIn, filter: `blur(${lerp(3, 0, rack)}px)` });
    const flip = lf >= 54; R.pill.className = 'st ' + (flip ? 'c' : 'p'); R.pill.textContent = flip ? '✓ ' + TEXT.confirmed : TEXT.pending;
    R.row.style.background = `rgba(201,255,122,${flip ? .55 * (1 - rng(lf, 54, 100)) + .15 : 0})`;
    const msg = (m, a) => { const t = rng(lf, a, a + 8); m.style.opacity = lf >= a ? 1 : 0; m.style.transform = `scale(${lerp(.85, 1, E.expo(t))})`; m.style.transformOrigin = '50% 100%'; };
    msg(R.m1, 60); msg(R.btn, 68); msg(R.m2, 90);
    const ct = rng(lf, 96, 104) * (1 - rng(lf, 120, 128)); R.chip.style.opacity = ct; R.chip.style.transform = `translateX(-50%) scale(${.9 + .1 * ct})`;
    R.cap.style.opacity = rng(lf, 20, 36);
    R.P.style.transform = `scale(${lerp(1, 1.06, E.io(rng(lf, 0, 162)))})`;
  },
  burst(lf, R) {
    const i = Math.min(R.items.length - 1, Math.floor(lf / 9)), l = lf - i * 9;
    R.items.forEach((d, k) => { d.style.display = k === i ? 'flex' : 'none'; });
    const d = R.items[i], t = E.expo(rng(l, 0, 5));
    d.style.transform = `scale(${lerp(1.18, 1, t)})`; d.style.filter = t < 1 ? `blur(${(1 - t) * 10}px)` : '';
  },
  breath(lf, R) { setDot(R.d, W / 2, H / 2, 1 + .3 * Math.sin(Math.PI * lf / 21)); },   // one slow breath
  end(lf, R) {
    const L = R.L, st = L.tip(0), ckP = E.io(rng(lf, 10, 30)), tp = L.tip(ckP);
    const d0 = E.io(rng(lf, 0, 10));
    setDot(R.dot, lf < 10 ? lerp(W / 2, st.x, d0) : tp.x, lf < 10 ? lerp(H / 2, st.y, d0) : tp.y, 1, 1 - rng(lf, 28, 32));
    dash(L.C, ckP); dash(L.A, E.io(rng(lf, 20, 42)));
    const wt = E.expo(rng(lf, 34, 54)); L.wm.style.clipPath = RTL ? `inset(0 0 0 ${(1 - wt) * 100}%)` : `inset(0 ${(1 - wt) * 100}% 0 0)`; L.wm.style.transform = `translateX(${(1 - wt) * 40}px)`;
    pop(R.tw, lf, 50, 5, 10); R.url.style.opacity = rng(lf, 64, 78);
  },
};

/* ---------- sound cues ----------
   Events for the generated score (docs/SOUND.md), on the same frames as the animation above. Each hook has its own cues for
   scenes 1–2 (they follow that hook's motion); scenes 3–10 are shared. Arabic mirrors every pan automatically. */
const T = id => SCENES.find(s => s.id === id).start;
function cuesFor() {
  const c = SF.cues(), h1 = T('hook-1'), h2 = T('hook-2'), hook = V('hook');
  c.drone(6, T('construct') - 15, { gain: .045, open0: 260, open1: 1100 });                          // Act 1 bed
  if (hook === 'doubt') {                       // a dot lands and glows twice; four questions click in on the 0.8 s grid
    c.boom(h1 + 18, { gain: .5, decay: 1.6 }); c.tick(h1 + 34, { gain: .14, freq: 2300, pan: -.2 }); c.tick(h1 + 58, { gain: .14, freq: 2500, pan: .2 });
    c.whoosh(h2, { dur: .5, gain: .14 });
    for (let i = 0; i < 4; i++) { const t = h2 + 12 + i * 24; c.tick(t, { gain: .16, freq: 1900 + i * 150, pan: i % 2 ? .3 : -.3 }); c.boom(t, { gain: .2, decay: .7, f0: 70, f1: 45 }); }
  } else if (hook === 'counter') {              // odometer counts up and lands; marker underlines; one ring blip per lit cell
    c.boom(h1 + 2, { gain: .45, decay: 1.3, f0: 66, f1: 40 }); c.tick(h1 + 2, { gain: .12, freq: 2000 });
    for (let k = 1; k <= 20; k++) { const u = 1 - Math.cbrt(1 - k / 20); c.tick(h1 + 4 + u * 38, { gain: .06 + .05 * k / 20, freq: 1500 + k * 45, pan: k % 2 ? .22 : -.22 }); }   // follows the ease-out count (f4–42)
    c.whoosh(h1 + 37, { dur: .3, gain: .06, p0: -.2, p1: .2 });
    c.boom(h1 + 42, { gain: .35, decay: 1, f0: 70, f1: 42 }); c.pluck(h1 + 42, { freq: 73.42, gain: .22 });
    c.scribble(h1 + 46, h1 + 66, { gain: .16, p0: -.45, p1: .45 });                                   // underline draws f46–66
    c.boom(h2 + 4, { gain: .3, decay: .8, f0: 68, f1: 44 }); c.tick(h2 + 4, { gain: .1, freq: 2100, pan: -.15 });
    c.boom(h2 + 10, { gain: .42, decay: 1.2, f0: 60, f1: 38 }); c.tick(h2 + 10, { gain: .12, freq: 2400, pan: .15 });
    for (let i = 0; i < 100; i++) c.blip(h2 + 10 + i * .82, { gain: .035 + .03 * i / 100, pan: ((i % 10) - 4.5) / 4.5 * .55, freq: 430 + Math.floor(i / 10) * 6 });
    c.riser(h2 + 36, h2 + 92, { gain: .14 }); c.boom(h2 + 92, { gain: .25, decay: 1.4, f0: 52, f1: 34 }); c.whoosh(h2 + 100, { dur: .5, gain: .05, p0: .3, p1: -.3 });
  } else {                                      // "Cash · on · delivery." land like stamps; boxes ship out, get stamped, slide back
    [4, 12, 20].forEach((f, i) => { c.kick(h1 + f, { gain: i === 2 ? .45 : .3 }); c.tick(h1 + f, { gain: .1, freq: 1900 + i * 200, pan: (i - 1) * .3 }); });
    c.boom(h1 + 20, { gain: .3, decay: 1.1, f0: 62, f1: 40 }); c.swipe(h1 + 34, { dur: .36, gain: .14, p0: -.5, p1: .5 }); c.pluck(h1 + 44, { freq: 146.83, gain: .26 });
    [2, 8, 14].forEach((f, i) => c.tick(h2 + f, { gain: .08 + .02 * i, freq: 1800 + i * 150, pan: (i - 1) * .25 }));
    c.boom(h2 + 20, { gain: .42, decay: 1.1, f0: 56, f1: 34 }); c.tick(h2 + 20, { gain: .12, freq: 1500 });
    for (let i = 0; i < 3; i++) { const a = h2 + 16 + i * 7, b = h2 + 52 + i * 7; c.slide(a, b, { p0: -.95, p1: .95, gain: .1 }); c.thud(b - 1, { gain: .13, pan: .85 }); }
    for (let i = 0; i < 3; i++) { const a = h2 + 62 + i * 6, b = h2 + 100 + i * 6; c.stamp(a, { gain: .3 - i * .03, pan: .85 }); c.slide(a + 2, b, { p0: .95, p1: -.95, gain: .09, cut: 420 }); c.thud(b - 1, { gain: .12, pan: -.85 }); }
  }
  // 3 · The call: a muffled ring, ghost cards slide off, then hard silence
  const ca = T('call'), cn = T('construct'), li = T('line'), cd = T('cards'), pr = T('product'), bu = T('burst'), br = T('breath'), en = T('end');
  c.ring(ca + 4.5, { dur: .9 }); c.ring(ca + 37.5, { dur: .7, gain: .1 });
  [8, 17, 26].forEach(f => c.whoosh(ca + f, { dur: .5, gain: .06, p0: .2, p1: -.6 }));
  // 4 · Construct: the big boom, anchor clicks, the check draws, a riser into the settle hit
  c.boom(cn, { gain: 1, decay: 3.6 }); c.whoosh(cn - 4.5, { dur: .7, gain: .22, p0: .6, p1: -.2 });
  for (let i = 0; i < 7; i++) c.tick(cn + 14 + i * 5, { gain: .1, freq: 1700 + (i % 3) * 120, pan: (i - 3) * .12 });
  c.whoosh(cn + 30, { dur: .9, gain: .1, p0: -.4, p1: .4 }); c.whoosh(cn + 50, { dur: 1, gain: .08, p0: .4, p1: -.4 }); c.whoosh(cn + 72, { dur: .8, gain: .1, p0: -.2, p1: .5 });
  c.riser(cn + 92, cn + 135, { gain: .3 }); c.boom(cn + 135, { gain: .6, decay: 2 }); c.dtick(cn + 56, { gain: .16 });
  // 5 · The line: warm pad, a soft key tick per word, a pluck when the keyword lights up
  c.pad(li - 3, cd + 3, { gain: .03 });
  for (let i = 0; i < 10; i++) c.tick(li + 6 + i * 4, { gain: .05, freq: 1600 + (i % 4) * 90, pan: i % 2 ? .25 : -.25 });
  c.pluck(li + 66, { freq: 146.83, gain: .25 });
  // 6 · Cards: four deep plucks on the beat, stepping up D–F–A–D
  [73.42, 87.31, 110, 146.83].forEach((f, i) => { const t = cd + i * 24; c.pluck(t, { freq: f, gain: .5 }); c.boom(t, { gain: .3, decay: .8, f0: 64, f1: 40 }); c.tick(t, { gain: .07, freq: 2000 + i * 200, pan: (i - 1.5) * .3 }); });
  c.whoosh(cd + 84, { dur: .5, gain: .16, p0: -.3, p1: .3 });
  // 7 · Product: a dark 75 bpm pulse, UI clicks on the row flip and the messages, a low hit on the focus rack
  c.boom(pr, { gain: .65, decay: 1.5 }); c.whoosh(pr - 6, { dur: .6, gain: .18 }); c.drone(pr, bu, { gain: .03, open0: 200, open1: 500, fadeIn: .4, fadeOut: .05 });
  for (let t = pr; t < bu - 3; t += 24) { c.kick(t, { gain: .22 }); c.shaker(t + 12, { gain: .03 }); }
  c.dtick(pr + 54, { gain: .2 }); c.tick(pr + 60, { gain: .1, freq: 2200 }); c.tick(pr + 68, { gain: .1, freq: 2400 }); c.tick(pr + 90, { gain: .12, freq: 2600 });
  c.whoosh(pr + 96, { dur: .6, gain: .05 }); c.boom(pr + 114, { gain: .45, decay: 1.2, f0: 50, f1: 32 });
  // 8 · Burst: a hit on every 0.3 s cut, then a hard stop
  for (let i = 0; i < 8; i++) { const t = bu + i * 9; c.boom(t, { gain: .5, decay: .32, f0: 75, f1: 42 }); c.tick(t, { gain: .1, freq: 2000 + i * 110, pan: i % 2 ? .4 : -.4 }); c.whoosh(t - 2.4, { dur: .22, gain: .05, p0: i % 2 ? .5 : -.5, p1: 0 }); }
  // 9 · Breath: nothing but room tone (the 0.5 s black at the end of "The call" is silent too)
  c.silence(ca + 60, cn); c.silence(br, en); c.roomtone(br, en);
  // 10 · End card: the final boom, the brand double tick when the check completes, then decay to silence
  c.boom(en, { gain: 1, decay: 4.6 }); c.whoosh(en - 6, { dur: .8, gain: .2, p0: -.5, p1: .5 }); c.dtick(en + 30, { gain: .28 });
  for (let i = 0; i < 3; i++) c.tick(en + 50 + i * 5, { gain: .05, freq: 1700, pan: (i - 1) * .3 });
  c.pad(en + 40, 1050, { gain: .018 });
  return c.list;
}

/* ---------- contract (SF.define wires up manifest, applyParams, seek, ready) ---------- */
SF.define({
  title: RTL ? 'Akked — The Tick (AR)' : 'Akked — The Tick', width: W, height: H, fps: FPS, duration: 1050, scenes: SCENES.map(({ act, ...s }) => s),
  params: values => { P = values; return paramList(); },
  cues: () => cuesFor(), soundtrack: { theme: 'deep' },
  audio: [{ id: 'score', label: 'Generated score (deep)', generated: 'cues', default: true }],
  variants: {
    thumbFrame: 100,                                   // which frame the editor's Variants view shows (where the hooks differ)
    axes: [{ id: 'hook', label: 'Hook' }, { id: 'theme', label: 'Style' }, { id: 'cards', label: 'Card shape' }],
    presets: [{ id: 'v1-doubt-mono', label: 'Doubt · mono', params: {} }, { id: 'v2-counter-deep', label: 'Counter · deep green', params: { hook: 'counter', theme: 'dark', cards: 'tiles' } }, { id: 'v3-cod-lime', label: 'Cash on delivery · lime', params: { hook: 'cod', theme: 'lime' } }],
  },
  build: () => build(),
  seek(f) {
    const sc = SCENES.find(s => f >= s.start && f < s.end) || SCENES[SCENES.length - 1];
    for (const s of SCENES) S[s.id].e.style.display = s === sc ? 'block' : 'none';
    RENDER[sc.id](f - sc.start, S[sc.id].R);
  },
});

'use strict';
/* Generic film editor. It knows nothing about a particular film: everything comes from the film page's
   `manifest` (scenes, params, audio, sizes) and `seek(frame)`. See docs/FILM_SPEC.md. */
const $ = (s, r = document) => r.querySelector(s);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const qs = new URLSearchParams(location.search);
const iframe = $('#film');

let filmId, version, film, manifest, project, tl, FPS = 30;
let frame = 0, playing = false, raf = 0, saveT = 0, applyT = 0;
const ctrls = {};                       // paramId -> [setValue fns], keeps duplicate controls in sync
const fmt = f => { const s = f / FPS, m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`; };
const el = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
let filmRoot = 'films';
const filmBase = () => `/${filmRoot}/${filmId}/`;

/* ---------- boot ---------- */
(async () => {
  const films = await (await fetch('/api/films')).json();
  const ids = films.map(f => f.id); filmId = ids.includes(qs.get('film')) ? qs.get('film') : ids[0]; filmRoot = (films.find(f => f.id === filmId) || {}).root || 'films'; version = (qs.get('v') || 'default').replace(/[^\w-]/g, '') || 'default';
  const fs = $('#filmSel'); films.forEach(f => { const o = el('option', '', esc(f.id) + (f.root === 'examples' ? '  (example)' : ''), fs); o.value = f.id; }); fs.value = filmId;
  fs.onchange = () => { location.search = `?film=${fs.value}`; };
  await loadFilm();
})();

async function loadFilm() {
  const saved = await (await fetch(`/api/project/${filmId}/${version}`)).json();
  const vers = await (await fetch(`/api/projects/${filmId}`)).json();
  const vs = $('#verSel'); vs.innerHTML = ''; [...new Set(['default', ...vers, version])].forEach(v => el('option', '', esc(v), vs).value = v); vs.value = version;
  vs.onchange = () => { location.search = `?film=${filmId}&v=${vs.value}`; };
  // probe the manifest first so the iframe can be created at the right size
  await mountFilm(saved.output && saved.output.size);
  project = Timeline.normalize(film.manifest, saved);
  FPS = film.manifest.fps;
  buildSizeSelect();
  $('#loading').style.display = 'none';
  apply({ panels: true });
  poll();
}
async function mountFilm(size) {
  iframe.src = filmBase() + 'film.html';
  await new Promise(r => { iframe.onload = r; });
  await new Promise(r => { const t = setInterval(() => { try { if (iframe.contentWindow.ready) { clearInterval(t); r(); } } catch (e) {} }, 40); });
  film = iframe.contentWindow; await film.ready;
  const m = film.manifest; const [w, h] = size ? size.split('x').map(Number) : [m.width, m.height];
  iframe.style.width = w + 'px'; iframe.style.height = h + 'px'; iframe.dataset.w = w; iframe.dataset.h = h;
  if (size) { iframe.src = filmBase() + 'film.html'; await new Promise(r => { iframe.onload = r; }); await new Promise(r => setTimeout(r, 50)); film = iframe.contentWindow; await film.ready; }
  fit();
}
function fit() {
  const w = $('#stageWrap'), W = +iframe.dataset.w, H = +iframe.dataset.h, pad = 24;
  const s = Math.min((w.clientWidth - pad * 2) / W, (w.clientHeight - pad * 2) / H);
  const box = $('#frameBox'); box.style.width = W * s + 'px'; box.style.height = H * s + 'px';
  iframe.style.transform = `scale(${s})`;
}
addEventListener('resize', fit);

/* ---------- project state ---------- */
function stripped() {                  // what gets stored: no values that equal the film's defaults
  const p = JSON.parse(JSON.stringify(project));
  const byId = Object.fromEntries(manifest.scenes.map(s => [s.id, s]));
  const dflt = Object.fromEntries((manifest.params || []).map(x => [x.id, x.default]));
  Object.keys(p.params).forEach(k => { if (p.params[k] === dflt[k]) delete p.params[k]; });
  p.clips.forEach(c => { const s = byId[c.scene]; if (c.in === s.start) delete c.in; if (c.out === s.end) delete c.out; });
  return p;
}
function saveSoon() {
  $('#saved').textContent = 'Unsaved…'; clearTimeout(saveT);
  saveT = setTimeout(async () => {
    try { await fetch(`/api/project/${filmId}/${version}`, { method: 'PUT', body: JSON.stringify(stripped()) }); $('#saved').textContent = `Saved · ${version}`; }
    catch (e) { $('#saved').textContent = 'Save failed'; }
  }, 500);
}
// params/audio changed -> push into the film (debounced), then redraw the current frame
function applySoon() { clearTimeout(applyT); applyT = setTimeout(() => { pause(); apply(); }, 250); }
let paramSig = '';
function apply(o = {}) {
  Timeline.applyToFilm(film, project.params);
  manifest = film.manifest;
  // a film may expose different options depending on other options (e.g. a "hook" switch): rebuild the panels then
  const sig = (manifest.params || []).map(p => p.id).join('|');
  if (sig !== paramSig) { paramSig = sig; o = { ...o, panels: true }; }
  retime(o);
  if (o.panels) { buildScenes(); buildStyle(); buildAudio(); }
  buildAudioEls(); buildOutName();
}
// timeline-only change (durations, order, trims): no need to touch the film
function retime(o = {}) {
  tl = Timeline.build(manifest, project); project = tl.project;
  if (o.panels || $('#track').querySelectorAll('.seg').length !== tl.clips.length) buildTrack(); else updateTrack();
  refreshClipInfo();
  seek(Math.min(frame, tl.total - 1));
}

/* ---------- transport ---------- */
function seek(f) {
  frame = clamp(f, 0, tl.total - 1);
  const { src, clip } = Timeline.sourceFrame(tl, frame);
  film.seek(src);
  $('#head').style.left = (frame / tl.total * 100) + '%';
  $('#time').innerHTML = `${fmt(frame)}<small>/ ${fmt(tl.total)} · frame ${Math.round(frame)}</small>`;
  document.querySelectorAll('.seg').forEach((e, i) => e.classList.toggle('cur', i === clip.i));
  document.querySelectorAll('.scene').forEach((e, i) => e.classList.toggle('cur', i === clip.i));
}
const PLAY = '<svg viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>', PAUSE = '<svg viewBox="0 0 16 16"><path d="M3 2h4v12H3zM9 2h4v12H9z" fill="currentColor"/></svg>';
$('#play').innerHTML = PLAY;
function play() {
  if (playing) return; playing = true; $('#play').innerHTML = PAUSE;
  if (frame >= tl.total - 1) frame = 0;
  const t0 = performance.now(), f0 = frame;
  syncAudio(true);
  const loop = now => {
    if (!playing) return;
    const f = f0 + (now - t0) / 1000 * FPS;
    if (f >= tl.total - 1) { seek(tl.total - 1); pause(); return; }
    seek(f); syncAudio(); raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
function pause() { playing = false; cancelAnimationFrame(raf); $('#play').innerHTML = PLAY; AUDIO.forEach(a => a.el.pause()); }
$('#play').onclick = () => playing ? pause() : play();
addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); $('#play').click(); }
  else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); pause(); seek(Math.round(frame) + (e.code === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? FPS : 1)); }
});

/* ---------- timeline ---------- */
const sceneName = id => (manifest.scenes.find(s => s.id === id) || {}).name || id;
function buildTrack() {
  const tr = $('#track'); tr.querySelectorAll('.seg').forEach(e => e.remove());
  tl.clips.forEach((c, i) => {
    const d = el('div', 'seg', '<span class="lbl"></span><span class="grip" title="Drag to change length"></span>'); tr.insertBefore(d, $('#head'));
    d.querySelector('.grip').addEventListener('pointerdown', e => startResize(e, i));
  });
  updateTrack();
}
function updateTrack() {
  [...$('#track').querySelectorAll('.seg')].forEach((d, i) => {
    const c = tl.clips[i]; d.style.flex = `${c.t1 - c.t0} 1 0`; d.querySelector('.lbl').textContent = `${i + 1} ${sceneName(c.scene)}`;
  });
}
(() => {
  const tr = $('#track'); let drag = false;
  const at = e => { const r = tr.getBoundingClientRect(); return (e.clientX - r.left) / r.width * tl.total; };
  tr.addEventListener('pointerdown', e => {
    if (e.target.classList.contains('grip')) return;
    drag = true; tr.setPointerCapture(e.pointerId); pause(); seek(at(e));
    const c = Timeline.clipAt(tl, frame); selectClip(c.i, false);
  });
  tr.addEventListener('pointermove', e => { if (drag) seek(at(e)); });
  tr.addEventListener('pointerup', () => drag = false);
})();
function startResize(e, i) {
  e.stopPropagation(); e.preventDefault(); pause();
  const grip = e.currentTarget; grip.setPointerCapture(e.pointerId);
  const x0 = e.clientX, f0 = project.clips[i].frames, pxPerFrame = $('#track').getBoundingClientRect().width / tl.total;
  const move = ev => { project.clips[i].frames = Math.max(Timeline.MIN_FRAMES, Math.round(f0 + (ev.clientX - x0) / pxPerFrame)); retime(); saveSoon(); };
  const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); };
  grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
}
function selectClip(i, scrub = true) {
  document.querySelectorAll('.seg').forEach((e, k) => e.classList.toggle('sel', k === i));
  const d = document.querySelector(`details.scene[data-i="${i}"]`); if (!d) return;
  setTab('scenes'); d.open = true; d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (scrub) { pause(); seek(tl.clips[i].t0 + 1); }
}

/* ---------- param controls (one per manifest param type) ---------- */
function reg(id, fn) { (ctrls[id] = ctrls[id] || []).push(fn); }
function setParam(p, v, origin) {
  if (v === p.default) delete project.params[p.id]; else project.params[p.id] = v;
  (ctrls[p.id] || []).forEach(f => f !== origin && f(v));
  saveSoon(); applySoon();
}
function control(p) {
  const f = el('div', 'field'); const cur = () => project.params[p.id] == null ? p.default : project.params[p.id];
  f.innerHTML = `<label>${esc(p.label || p.id)}</label>`;
  const mark = (node, v) => node.classList.toggle('mod', v !== p.default);
  let setter;
  if (p.type === 'text') {
    const ta = el(p.multiline ? 'textarea' : 'input', '', null, f); if (!p.multiline) ta.type = 'text'; else ta.rows = 1; ta.spellcheck = false; if (p.maxLength) ta.maxLength = p.maxLength;
    const grow = () => { if (p.multiline) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; } };
    setter = v => { ta.value = v; mark(ta, v); grow(); }; setter(cur());
    ta.addEventListener('input', () => { mark(ta, ta.value); grow(); setParam(p, ta.value, setter); });
    new MutationObserver(grow).observe(f, { attributes: true }); requestAnimationFrame(grow);
    f._grow = grow;
  } else if (p.type === 'number') {
    const row = el('div', 'c2', '', f), r = el('input', '', null, row), n = el('input', '', null, row);
    r.type = 'range'; n.type = 'number'; [r, n].forEach(i => { i.min = p.min ?? 0; i.max = p.max ?? 100; i.step = p.step ?? 1; });
    setter = v => { r.value = n.value = v; mark(n, +v); }; setter(cur());
    const on = i => () => { const v = +i.value; if (Number.isNaN(v)) return; setter(v); setParam(p, v, setter); };
    r.addEventListener('input', on(r)); n.addEventListener('input', on(n));
    if (p.unit) el('span', 'spd', esc(p.unit), row);
  } else if (p.type === 'color') {
    const row = el('div', 'c2', '', f), c = el('input', '', null, row), t = el('input', '', null, row); c.type = 'color'; t.type = 'text'; t.spellcheck = false;
    const hex = v => /^#[0-9a-f]{6}$/i.test(v) ? v : '#000000';
    setter = v => { c.value = hex(v); t.value = v; mark(t, v); }; setter(cur());
    c.addEventListener('input', () => { setter(c.value); setParam(p, c.value, setter); });
    t.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(t.value)) c.value = t.value; mark(t, t.value); setParam(p, t.value, setter); });
  } else if (p.type === 'boolean') {
    f.innerHTML = ''; const l = el('label', 'sw', `<input type="checkbox"> ${esc(p.label || p.id)}`, f), cb = l.querySelector('input');
    setter = v => { cb.checked = !!v; }; setter(cur()); cb.addEventListener('change', () => setParam(p, cb.checked, setter));
  } else if (p.type === 'select') {
    const s = el('select', '', null, f); (p.options || []).forEach(o => { const v = typeof o === 'object' ? o.value : o; el('option', '', esc(typeof o === 'object' ? o.label || o.value : o), s).value = v; });
    setter = v => { s.value = v; mark(s, v); }; setter(cur()); s.addEventListener('change', () => { mark(s, s.value); setParam(p, s.value, setter); });
  } else if (p.type === 'image') {
    const row = el('div', 'img', '<img alt=""><button class="btn" type="button">Choose image…</button><button class="btn" type="button">Default</button><input type="file" accept="image/*" hidden>', f);
    const img = row.querySelector('img'), file = row.querySelector('input'), [pick, dflt] = row.querySelectorAll('button');
    setter = v => { img.src = v ? filmBase() + v : ''; img.style.visibility = v ? 'visible' : 'hidden'; dflt.disabled = v === p.default; }; setter(cur());
    pick.onclick = () => file.click(); dflt.onclick = () => { setter(p.default); setParam(p, p.default, setter); };
    file.onchange = async () => { const fl = file.files[0]; if (!fl) return; const r = await fetch(`/api/upload/${filmId}?name=${encodeURIComponent(fl.name)}`, { method: 'POST', body: fl }); const j = await r.json(); if (j.path) { setter(j.path); setParam(p, j.path, setter); } else alert(j.error || 'upload failed'); };
  } else { f.innerHTML += `<div class="spd warn">unsupported param type “${esc(p.type)}”</div>`; }
  if (p.help) el('div', 'spd', esc(p.help), f);
  if (setter) reg(p.id, setter);
  return f;
}

/* ---------- panels ---------- */
function buildScenes() {
  Object.keys(ctrls).forEach(k => delete ctrls[k]);
  const root = $('#p-scenes'); const open = new Set([...root.querySelectorAll('details[open]')].map(d => d.dataset.i)); root.innerHTML = '';
  const dupCount = {}; tl.clips.forEach(c => dupCount[c.scene] = (dupCount[c.scene] || 0) + 1);
  el('p', 'note', 'Reorder, duplicate or remove scenes, change their length (the animation is stretched or squeezed to fit) and edit what each one contains.', root);
  tl.clips.forEach((c, i) => {
    const d = el('details', 'scene'); d.dataset.i = i; if (open.has(String(i))) d.open = true;
    const first = tl.clips.findIndex(x => x.scene === c.scene) === i;
    d.innerHTML = `<summary><span class="num">${i + 1}</span><span class="nm">${esc(sceneName(c.scene))}${first ? '' : '<i>copy</i>'}</span><span class="rng"></span>
        <span class="ops"><button class="btn sm" data-op="up" title="Move earlier">↑</button><button class="btn sm" data-op="down" title="Move later">↓</button><button class="btn sm" data-op="dup" title="Duplicate">⧉</button><button class="btn sm" data-op="del" title="Remove">✕</button></span></summary>
      <div class="body">
        <div class="row"><label>Length</label><button class="btn sm" data-d="-1">−</button><input type="number" data-k="len" min="0.1" step="0.1"><span class="spd">s</span><button class="btn sm" data-d="1">+</button><span class="spd grow" data-k="spd" style="text-align:right"></span></div>
        <details class="adv"><summary>Trim (which part of the scene plays)</summary>
          <div class="row"><label>Start</label><input type="number" data-k="in" step="0.1"><span class="spd">s</span><label style="width:auto;margin-left:8px">End</label><input type="number" data-k="out" step="0.1"><span class="spd">s</span></div></details>
        <div class="params"></div>
        ${dupCount[c.scene] > 1 ? '<div class="shared">Text and style values are shared with the other copies of this scene.</div>' : ''}
      </div>`;
    root.appendChild(d);
    d.querySelector('summary').addEventListener('click', e => { if (e.target.closest('.ops')) return; pause(); seek(tl.clips[i].t0 + 1); selectClip(i, false); });
    d.querySelectorAll('[data-op]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); clipOp(b.dataset.op, i); }));
    const len = d.querySelector('[data-k=len]'), setLen = s => { project.clips[i].frames = Math.max(Timeline.MIN_FRAMES, Math.round(s * FPS)); saveSoon(); retime(); };
    len.addEventListener('change', () => setLen(+len.value || 1));
    d.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => setLen(project.clips[i].frames / FPS + (+b.dataset.d) * 0.1)));
    ['in', 'out'].forEach(k => d.querySelector(`[data-k=${k}]`).addEventListener('change', e => { project.clips[i][k] = Math.round(+e.target.value * FPS); saveSoon(); retime(); }));
    const ps = (manifest.params || []).filter(p => p.scene === c.scene), box = d.querySelector('.params');
    ps.forEach(p => box.appendChild(control(p)));
    if (!ps.length) el('div', 'spd', 'No editable options in this scene.', box).style.marginTop = '10px';
  });
  if (open.size === 0) { const f = root.querySelector('details.scene'); }
  refreshClipInfo();
}
function refreshClipInfo() {
  const byId = Object.fromEntries(manifest.scenes.map(s => [s.id, s]));
  document.querySelectorAll('details.scene').forEach(d => {
    const i = +d.dataset.i, c = tl.clips[i]; if (!c) return;
    d.querySelector('.rng').textContent = `${fmt(c.t0)} – ${fmt(c.t1)}`;
    const len = d.querySelector('[data-k=len]'); if (document.activeElement !== len) len.value = ((c.t1 - c.t0) / FPS).toFixed(2);
    const sp = d.querySelector('[data-k=spd]'); sp.textContent = `${c.rate.toFixed(2)}× speed`; sp.classList.toggle('warn', c.rate < 0.25 || c.rate > 4);
    sp.title = c.rate < 0.25 || c.rate > 4 ? 'Audio can only follow between 0.25× and 4×' : '';
    const sc = byId[c.scene]; const inp = d.querySelector('[data-k=in]'), out = d.querySelector('[data-k=out]');
    if (document.activeElement !== inp) { inp.value = (c.in / FPS).toFixed(2); inp.min = sc.start / FPS; inp.max = sc.end / FPS; }
    if (document.activeElement !== out) { out.value = (c.out / FPS).toFixed(2); out.min = sc.start / FPS; out.max = sc.end / FPS; }
  });
  document.querySelectorAll('details.scene').forEach((e, i) => e.classList.toggle('cur', tl.clips[i] && Timeline.clipAt(tl, frame).i === i));
}
function clipOp(op, i) {
  const cl = project.clips; pause();
  if (op === 'up' && i > 0) [cl[i - 1], cl[i]] = [cl[i], cl[i - 1]];
  else if (op === 'down' && i < cl.length - 1) [cl[i + 1], cl[i]] = [cl[i], cl[i + 1]];
  else if (op === 'dup') cl.splice(i + 1, 0, { ...cl[i], id: 'c' + Date.now().toString(36) });
  else if (op === 'del') { if (cl.length < 2) return; cl.splice(i, 1); }
  else return;
  saveSoon(); retime({ panels: true }); buildScenes();
  const ni = op === 'up' ? i - 1 : op === 'down' ? i + 1 : op === 'dup' ? i + 1 : Math.min(i, cl.length - 1);
  seek(tl.clips[Math.max(0, ni)].t0 + 1); selectClip(Math.max(0, ni), false);
}

function buildStyle() {
  const root = $('#p-style'); root.innerHTML = '';
  const ids = new Set(manifest.scenes.map(s => s.id));
  const globals = (manifest.params || []).filter(p => !p.scene || !ids.has(p.scene));
  if (!globals.length) { el('div', 'empty', 'This film has no global style options. Scene-specific options are in the Scenes tab.', root); return; }
  el('p', 'note', 'Options that apply to the whole film.', root);
  globals.forEach(p => root.appendChild(control(p)));
}

/* ---------- variants ---------- */
// presets declared by the film (manifest.variants.presets) + this film's saved versions, each with a thumbnail
async function buildVariants() {
  const root = $('#p-variants'); root.innerHTML = ''; const V = manifest.variants || {};
  el('p', 'note', 'Pick a look. “Apply” copies its options into this version; saved versions open in place.', root);
  const grid = el('div', 'vgrid', '', root);
  const vers = await (await fetch(`/api/projects/${filmId}`)).json();
  const cards = [...(V.presets || []).map(p => ({ kind: 'preset', id: p.id, label: p.label || p.id, params: p.params || {} })), ...vers.filter(v => !(V.presets || []).some(p => p.id === v)).map(v => ({ kind: 'version', id: v, label: v }))];
  if (!cards.length) { el('div', 'empty', 'This film declares no variants yet. Add manifest.variants.presets (see docs/VARIANTS.md), or use “Save as…” to keep named versions.', root); return; }
  for (const c of cards) {
    const b = el('button', 'vcard', `<img alt="" loading="lazy"><b>${esc(c.label)}</b><small>${c.kind === 'preset' ? 'preset' : 'saved version'}</small>`, grid); b.type = 'button';
    if (c.kind === 'version' && c.id === version) b.classList.add('on'); b.setAttribute('aria-label', `${c.kind === 'preset' ? 'Apply preset' : 'Open version'} ${c.label}`);
    (async () => { let proj = {}; if (c.kind === 'version') proj = await (await fetch(`/api/project/${filmId}/${c.id}`)).json(); else proj = { params: c.params };
      try { const r = await (await fetch('/api/thumb', { method: 'POST', body: JSON.stringify({ film: filmId, project: proj, frame: V.thumbFrame ?? -1, width: 480 }) })).json(); if (r.url) b.querySelector('img').src = r.url; } catch (e) {} })();
    b.onclick = () => { if (c.kind === 'version') { location.search = `?film=${filmId}&v=${c.id}`; return; } project.params = { ...c.params }; saveSoon(); apply({ panels: true }); setTab('scenes'); };
  }
}
document.querySelector('#tabs [data-t=variants]').addEventListener('click', buildVariants);

/* ---------- audio ---------- */
const AUDIO = [];                      // [{el, t}] enabled tracks being previewed
function allTracks() {
  const m = (manifest.audio || []).map(t => { const s = project.audio.tracks[t.id] || {}; return { ...t, custom: false, enabled: s.enabled == null ? !!t.default : s.enabled, volume: s.volume == null ? (t.volume == null ? 1 : t.volume) : s.volume }; });
  const c = project.audio.custom.map(t => ({ ...t, custom: true, enabled: t.enabled !== false, volume: t.volume == null ? 1 : t.volume }));
  return [...m, ...c];
}
function buildAudio() {
  const root = $('#p-audio'); root.innerHTML = '';
  el('p', 'note', 'Timeline-synced tracks are cut and sped up or slowed down together with each scene. “Free” tracks (music, uploads) just play from the start of the film.', root);
  const tracks = allTracks();
  tracks.forEach(t => {
    const b = el('div', 'trk', `<div class="h"><label class="sw"><input type="checkbox" ${t.enabled ? 'checked' : ''}><b>${esc(t.label || t.id)}</b></label>${t.custom ? '<button class="btn sm" data-rm title="Remove">✕</button>' : ''}</div>
      <div class="rest"><div class="c2"><span class="spd">Volume</span><input type="range" min="0" max="1.5" step="0.05" value="${t.volume}"></div>
      ${t.custom ? `<div class="c2"><span class="spd">Sync</span><select data-sync><option value="free">Free (plays from start)</option><option value="timeline">Follows the scenes</option></select><span class="spd">Offset</span><input type="number" data-off min="0" step="0.1" value="${t.offset || 0}"><span class="spd">s</span></div>` : `<div class="spd">${t.generated ? 'Generated from the film\'s cues · ' : ''}${t.sync === 'free' ? 'Free' : 'Follows the scenes'}${t.group ? ' · one of: ' + esc(t.group) : ''}</div>`}</div>`, root);
    const st = () => t.custom ? project.audio.custom.find(x => x.id === t.id) : (project.audio.tracks[t.id] = project.audio.tracks[t.id] || {});
    b.querySelector('input[type=checkbox]').addEventListener('change', e => {
      st().enabled = e.target.checked;
      if (e.target.checked && t.group) tracks.filter(o => o.group === t.group && o.id !== t.id && !o.custom).forEach(o => { (project.audio.tracks[o.id] = project.audio.tracks[o.id] || {}).enabled = false; });
      saveSoon(); buildAudio(); buildAudioEls();
    });
    b.querySelector('input[type=range]').addEventListener('input', e => { st().volume = +e.target.value; saveSoon(); AUDIO.forEach(a => { if (a.t.id === t.id) a.el.volume = clamp(+e.target.value, 0, 1); }); });
    if (t.custom) {
      const sel = b.querySelector('[data-sync]'); sel.value = t.sync || 'free';
      sel.onchange = () => { st().sync = sel.value; saveSoon(); buildAudioEls(); };
      b.querySelector('[data-off]').onchange = e => { st().offset = Math.max(0, +e.target.value || 0); saveSoon(); buildAudioEls(); };
      b.querySelector('[data-rm]').onclick = () => { project.audio.custom = project.audio.custom.filter(x => x.id !== t.id); saveSoon(); buildAudio(); buildAudioEls(); };
    }
  });
  const add = el('div', '', '<button class="btn" type="button">Add audio file…</button><input type="file" accept="audio/*" hidden>', root);
  const fi = add.querySelector('input'); add.querySelector('button').onclick = () => fi.click();
  fi.onchange = async () => {
    const fl = fi.files[0]; if (!fl) return;
    const j = await (await fetch(`/api/upload/${filmId}?name=${encodeURIComponent(fl.name)}`, { method: 'POST', body: fl })).json();
    if (!j.path) return alert(j.error || 'upload failed');
    project.audio.custom.push({ id: 'u' + Date.now().toString(36), label: fl.name, src: j.path, sync: 'free', offset: 0, volume: 1, enabled: true });
    saveSoon(); buildAudio(); buildAudioEls();
  };
}
let scoreKey = '', scoreUrl = null, scoreT = 0;
async function fetchScore() {                     // the generated score depends on the film's cues, so regenerate when they change
  const key = JSON.stringify([manifest.cues, manifest.soundtrack]);
  if (key === scoreKey) return scoreUrl; scoreKey = key; scoreUrl = null;
  try { const r = await fetch('/api/score', { method: 'POST', body: JSON.stringify({ film: filmId, project: stripped() }) }); scoreUrl = (await r.json()).url; } catch (e) { scoreUrl = null; }
  return scoreUrl;
}
function buildAudioEls() {
  const was = playing; AUDIO.forEach(a => { a.el.pause(); a.el.removeAttribute('src'); }); AUDIO.length = 0;
  allTracks().filter(t => t.enabled && t.src && !t.generated).forEach(t => {
    const a = new Audio(new URL(t.src, location.origin + filmBase() + 'film.html').pathname); a.preload = 'auto'; a.volume = clamp(t.volume, 0, 1);
    AUDIO.push({ el: a, t });
  });
  const gen = allTracks().find(t => t.enabled && t.generated);
  if (gen) { clearTimeout(scoreT); scoreT = setTimeout(async () => { const url = await fetchScore(); if (!url || !allTracks().find(t => t.enabled && t.generated)) return; for (let i = AUDIO.length - 1; i >= 0; i--) if (AUDIO[i].t.generated) AUDIO.splice(i, 1); const a = new Audio(url); a.preload = 'auto'; a.volume = clamp(gen.volume, 0, 1); AUDIO.push({ el: a, t: { ...gen, sync: 'timeline' } }); if (playing) syncAudio(true); }, 400); }
  if (was) syncAudio(true);
}
function syncAudio(force) {
  if (!playing) return;
  const { src, rate } = Timeline.sourceFrame(tl, frame);
  AUDIO.forEach(({ el: a, t }) => {
    const free = t.sync === 'free', target = free ? frame / FPS - (t.offset || 0) : src / FPS;
    if (target < 0) { a.pause(); return; }
    if (a.paused) a.play().catch(() => {});
    a.playbackRate = clamp(free ? 1 : rate, 0.25, 4);
    if (force || Math.abs(a.currentTime - target) > 0.2) a.currentTime = target;
  });
}

/* ---------- versions / reset ---------- */
$('#saveAs').onclick = async () => {
  const n = (prompt('Name for this version:', '') || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!n) return; clearTimeout(saveT);
  await fetch(`/api/project/${filmId}/${n}`, { method: 'PUT', body: JSON.stringify(stripped()) });
  location.search = `?film=${filmId}&v=${n}`;
};
$('#delVer').onclick = async () => {
  if (!confirm(`Delete version “${version}”?`)) return;
  await fetch(`/api/project/${filmId}/${version}`, { method: 'DELETE' }); location.search = `?film=${filmId}`;
};
$('#resetAll').onclick = () => {
  if (!confirm('Discard all edits in this version (text, style, scenes, audio)?')) return;
  const size = project.output && project.output.size;
  project = Timeline.normalize(manifest, { output: size ? { size } : {} }); saveSoon(); apply({ panels: true });
};

/* ---------- tabs ---------- */
function setTab(t) { document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + t)); }
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => setTab(b.dataset.t));

/* ---------- export ---------- */
function buildSizeSelect() {
  const m = film.manifest, s = $('#size'); s.innerHTML = '';
  const list = [{ id: `${m.width}x${m.height}`, label: `${m.width}×${m.height} (native)` }, ...(m.sizes || []).map(x => ({ id: `${x.width}x${x.height}`, label: `${x.label || ''} ${x.width}×${x.height}`.trim() }))];
  list.forEach(o => { const e = el('option', '', esc(o.label), s); e.value = o.id; });
  s.value = (project.output && project.output.size) || list[0].id; s.parentElement.style.display = list.length > 1 ? '' : 'none';
  s.onchange = async () => { project.output.size = s.value === list[0].id ? undefined : s.value; saveSoon(); pause(); await mountFilm(project.output.size); apply({ panels: true }); };
}
function buildOutName() { $('#outname').textContent = `Output: output/${filmId}-${version}.mp4 · ${fmt(tl.total)} long. Existing files with that name are replaced.`; }
let pollT = 0;
async function poll() {
  const j = await (await fetch('/api/job')).json(); const go = $('#go'), prog = $('#prog'), msg = $('#msg');
  if (j.state === 'rendering') {
    go.disabled = true; go.textContent = 'Rendering…'; prog.style.display = 'block'; msg.dataset.busy = 1; msg.className = '';
    const pct = j.phase === 'encoding' ? 100 : Math.min(99, Math.round(j.done / Math.max(1, j.total) * 100));
    prog.firstElementChild.style.width = pct + '%';
    msg.textContent = j.phase === 'frames' ? `Rendering frames ${j.done} / ${j.total}` : j.phase === 'encoding' ? 'Encoding MP4…' : 'Preparing…';
    pollT = setTimeout(poll, 600);
  } else {
    go.disabled = false; go.textContent = 'Render MP4'; delete msg.dataset.busy; prog.style.display = 'none';
    if (j.state === 'done') { msg.className = ''; msg.textContent = `Done in ${j.seconds.toFixed(0)} s → output/${j.name}`; $('#result').style.display = 'block'; $('#result video').src = j.file; const a = $('#dl'); a.href = j.file; a.textContent = `Download ${j.name}`; }
    else if (j.state === 'error') { msg.className = 'err'; msg.textContent = j.error; }
  }
}
$('#go').onclick = async () => {
  pause(); clearTimeout(saveT); $('#result').style.display = 'none'; $('#result video').removeAttribute('src');
  const r = await fetch('/api/render', { method: 'POST', body: JSON.stringify({ film: filmId, name: version, project: stripped(), fps: +$('#fps').value, size: (project.output && project.output.size) || null }) });
  if (!r.ok) { const m = $('#msg'); m.className = 'err'; m.textContent = (await r.json()).error; return; }
  await fetch(`/api/project/${filmId}/${version}`, { method: 'PUT', body: JSON.stringify(stripped()) }); $('#saved').textContent = `Saved · ${version}`; poll();
};

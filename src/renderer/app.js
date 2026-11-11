// Writeshaper main window: first-run setup, the Write editor with live suggestions, the Shortcut page and Settings.
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const isMac = ws.platform === 'darwin';
document.body.classList.toggle('win', !isMac);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let S = null;            // state from the main process
let view = 'write';

// ---------- helpers ----------
const keyName = (k) => {
  const mac = { CommandOrControl: '⌘', Command: '⌘', Cmd: '⌘', Control: '⌃', Ctrl: '⌃', Alt: '⌥', Option: '⌥', Shift: '⇧', Space: 'Space', Return: '↵', Enter: '↵' };
  const win = { CommandOrControl: 'Ctrl', Command: 'Ctrl', Control: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Space: 'Space', Super: 'Win' };
  return (isMac ? mac : win)[k] || k;
};
const keysOf = (acc) => acc.split('+').map(keyName);
const kbds = (acc) => keysOf(acc).map((k) => `<span class="kbd">${esc(k)}</span>`).join('');
function paintShortcut() {
  $$('[data-shortcut]').forEach((el) => { el.innerHTML = kbds(S.settings.shortcut); });
  if ($('#keycaps')) $('#keycaps').innerHTML = keysOf(S.settings.shortcut).map((k) => `<div class="cap${k.length > 2 ? ' wide' : ''}">${esc(k)}</div>`).join('');
  $('#recKeys').innerHTML = kbds(S.settings.shortcut);
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = ''; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }
const fmtGB = (b) => (b / 1e9).toFixed(1) + ' GB';
const fmtTime = (s) => s > 90 ? `${Math.round(s / 60)} min left` : `${Math.max(1, Math.round(s))} s left`;

// ---------- views ----------
function go(v, opts = {}) {
  if (v === 'permission') v = 'shortcut';
  if (v === 'setup') { showSetup(); return; }
  view = v;
  for (const sec of $$('.view')) {
    const on = sec.id === 'v-' + v;
    if (on && sec.hidden) { sec.hidden = false; sec.classList.remove('in'); void sec.offsetWidth; sec.classList.add('in'); }
    else if (!on) sec.hidden = true;
  }
  $('#tabs').classList.remove('hidden');
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  moveTabPill();
  if (v === 'write' && !opts.keepFocus) setTimeout(() => $('#ed').focus(), 60);
  if (v === 'shortcut') { refreshPermission(); scene(); }
  if (v === 'settings') paintModels();
}
function moveTabPill() {
  const on = $('#tabs button.on'); const pill = $('.tab-pill');
  if (!on) return;
  pill.style.width = on.offsetWidth + 'px'; pill.style.transform = `translateX(${on.offsetLeft - 0}px)`;
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go(b.dataset.view); });
ws.onGo((v) => go(v));

// ---------- engine pill ----------
function paintEngine(s) {
  const el = $('#engine');
  el.className = 'engine ' + s.state;
  $('#engineText').textContent = {
    ready: S.demo ? 'Ready · demo' : (isMac ? 'Ready · on this Mac' : 'Ready · on this PC'),
    starting: 'Loading model…', nomodel: 'No model yet', error: 'Engine problem', idle: 'Starting…',
  }[s.state] || s.state;
  el.title = s.error || '';
  if (s.state === 'ready') scheduleCheck(50);
}
ws.onEngine((s) => { S.engine = s; paintEngine(s); });

// ---------- setup ----------
let pickModel = 'standard';
function showSetup() {
  for (const sec of $$('.view')) sec.hidden = sec.id !== 'v-setup';
  $('#tabs').classList.add('hidden');
  paintSetup();
}
function paintSetup() {
  const m = S.models.find((x) => x.id === pickModel) || S.models[0];
  const any = S.models.find((x) => x.installed);
  const modelDone = !!any;
  $('#stepModel').classList.toggle('done', modelDone);
  $('#modelPick').hidden = modelDone || S.models.some((x) => x.downloading);
  $('#dlStart').hidden = modelDone || S.models.some((x) => x.downloading);
  $('#dl').hidden = !S.models.some((x) => x.downloading);
  if (modelDone) { $('#stepModel p').textContent = `${any.name} model ready. Writeshaper now works offline.`; }
  else if (m.partial) $('#dlStart').textContent = `Resume (${Math.round(m.partial / m.size * 100)}%)`;
  const needPerm = isMac && !S.demo;
  $('#stepPerm').hidden = !needPerm;
  $('#tryN').textContent = needPerm ? '3' : '2';
  $('#stepPerm').classList.toggle('done', !!S.trusted);
  $('#stepPerm').classList.toggle('dim', !modelDone);
  $('#stepTry').classList.toggle('dim', !modelDone || (needPerm && !S.trusted));
  $('#finish').disabled = !modelDone;
  $('#permBtn').textContent = S.trusted ? 'Allowed' : 'Open Settings';
  $('#permBtn').disabled = !!S.trusted;
}
$('#modelPick').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  pickModel = b.dataset.id;
  $$('#modelPick button').forEach((x) => x.classList.toggle('on', x === b));
});
$('#dlStart').onclick = async () => {
  await ws.setSettings({ model: pickModel });
  ws.downloadModel(pickModel);
  S.models.find((x) => x.id === pickModel).downloading = true;
  paintSetup();
};
$('#dlCancel').onclick = () => { const m = S.models.find((x) => x.downloading); if (m) ws.cancelDownload(m.id); };
$('#permBtn').onclick = async () => { S.trusted = await ws.permission(true); paintSetup(); };
$('#finish').onclick = async () => { await ws.setSettings({ onboarded: true }); S.settings.onboarded = true; go('shortcut'); };

ws.onModelProgress(async (p) => {
  const m = S.models.find((x) => x.id === p.id);
  if (p.done || p.error || p.cancelled) {
    S.models = await ws.models();
    if (p.error) toast(p.error);
    if (p.done) toast('Model ready. Everything now runs offline.');
    paintSetup(); paintModels();
    return;
  }
  if (m) m.downloading = true;
  const pct = p.size ? p.have / p.size : 0;
  $('#dl').hidden = false; $('#modelPick').hidden = true; $('#dlStart').hidden = true;
  $('#dlRing').style.strokeDashoffset = String(119.4 * (1 - pct));
  $('#dlPct').textContent = p.verifying ? 'Checking…' : Math.floor(pct * 100) + '%';
  $('#dlInfo').textContent = p.verifying ? 'Making sure the file is complete' : `${fmtGB(p.have)} of ${fmtGB(p.size)} · ${(p.rate / 1e6).toFixed(1)} MB/s · ${fmtTime(p.eta)}`;
  const bar = document.querySelector(`.model-row[data-id="${p.id}"] .bar i`);
  if (bar) bar.style.width = (pct * 100) + '%';
});

// Poll the Accessibility permission while the user is in System Settings.
async function refreshPermission() {
  if (!isMac || S.demo) { $('#permCard').hidden = true; return; }
  S.trusted = await ws.permission(false);
  $('#permCard').hidden = !!S.trusted;
  if (!$('#v-setup').hidden) paintSetup();
}
window.addEventListener('focus', refreshPermission);
setInterval(() => { if (isMac && !S?.trusted && (view === 'shortcut' || !$('#v-setup').hidden)) refreshPermission(); }, 1500);
$('#permBtn2').onclick = () => ws.permission(true).then(refreshPermission);

// ---------- Write: live suggestions ----------
const ed = $('#ed'), back = $('#edBack');
const cache = new Map();         // paragraph text -> corrected text
const dismissed = new Set();
let checkingRange = null;        // [start, end] being checked now
let checkTimer = null, checkRunning = false, checkJob = null;
let suggestions = [];

const paragraphs = (text) => { const out = []; const re = /[^\n]+/g; let m; while ((m = re.exec(text))) out.push({ start: m.index, text: m[0] }); return out; };
function scheduleCheck(ms = 750) {
  clearTimeout(checkTimer);
  if (!S?.settings.liveCheck) { computeSuggestions(); return; }
  checkTimer = setTimeout(checkLoop, ms);
}
async function checkLoop() {
  if (checkRunning || S.engine.state !== 'ready') return;
  checkRunning = true;
  $('#sideState').classList.add('on'); $('#sideState').textContent = 'Checking';
  try {
    for (;;) {
      const caret = ed.selectionStart;
      const todo = paragraphs(ed.value).filter((p) => p.text.trim().length > 1 && !cache.has(p.text));
      if (!todo.length) break;
      // The paragraph being typed in last, so finished ones come first.
      todo.sort((a, b) => (a.start <= caret && caret <= a.start + a.text.length) - (b.start <= caret && caret <= b.start + b.text.length));
      const p = todo[0];
      checkingRange = [p.start, p.start + p.text.length];
      paintBack();
      const id = checkJob = 'c' + Date.now();
      const r = await ws.rewrite({ id, mode: 'fix', text: p.text });
      checkJob = null;
      if (r.cancelled) break;
      cache.set(p.text, r.text != null ? r.text : p.text);
      checkingRange = null;
      computeSuggestions();
      if (r.error) break;
    }
  } finally {
    checkRunning = false; checkingRange = null;
    $('#sideState').classList.remove('on'); $('#sideState').textContent = '';
    computeSuggestions();
  }
}

function similar(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] <= Math.max(2, Math.floor(Math.max(a.length, b.length) / 3));
}
const KIND = { punct: 'Punctuation', case: 'Capital letter', add: 'Missing word', remove: 'Extra word' };
function kindLabel(c) {
  if (KIND[c.kind]) return KIND[c.kind];
  const f = c.from.trim(), t = c.to.trim();
  if (!/\s/.test(f) && !/\s/.test(t) && similar(f.replace(/[^\p{L}']/gu, ''), t.replace(/[^\p{L}']/gu, ''))) return 'Spelling';
  return 'Grammar';
}

function computeSuggestions() {
  const text = ed.value;
  const list = [];
  for (const p of paragraphs(text)) {
    const fixed = cache.get(p.text);
    if (fixed == null || fixed === p.text) continue;
    for (const c of WSDiff.changes(p.text, fixed)) {
      const key = `${p.text}|${c.start}|${c.from}|${c.to}`;
      if (dismissed.has(key)) continue;
      list.push({ ...c, start: c.start + p.start, end: c.end + p.start, key, label: kindLabel(c), para: p });
    }
  }
  suggestions = list;
  paintBack();
  paintCards();
}

function paintBack() {
  const text = ed.value;
  let html = '', pos = 0;
  const marks = suggestions.map((s, i) => ({ s, i }));
  for (const { s, i } of marks) {
    if (s.start < pos) continue;
    html += seg(text.slice(pos, s.start), pos);
    const inner = text.slice(s.start, s.end);
    html += `<mark data-i="${i}" class="${inner ? '' : 'add'}${hot === i ? ' hot' : ''}">${esc(inner) || '​'}</mark>`;
    pos = s.end;
  }
  html += seg(text.slice(pos), pos);
  back.innerHTML = html + '\n​';
  back.scrollTop = ed.scrollTop;
}
// Wraps the paragraph being checked in a shimmer.
function seg(s, from) {
  if (!checkingRange) return esc(s);
  const [a, b] = checkingRange, to = from + s.length;
  if (b <= from || a >= to) return esc(s);
  const x = Math.max(a, from) - from, y = Math.min(b, to) - from;
  return esc(s.slice(0, x)) + `<span class="checking">${esc(s.slice(x, y))}</span>` + esc(s.slice(y));
}

let hot = -1;
let shownKeys = new Set();
function paintCards() {
  const box = $('#cards');
  const n = suggestions.length;
  const badge = $('#sideBadge');
  badge.textContent = n; badge.classList.toggle('has', n > 0);
  const fc = $('#fixCount');
  if (fc.textContent !== (n ? String(n) : '')) { fc.textContent = n ? String(n) : ''; fc.classList.remove('bump'); void fc.offsetWidth; fc.classList.add('bump'); }
  const hasText = ed.value.trim().length > 0;
  $('#empty').hidden = n > 0;
  $('#empty').classList.toggle('idle', !hasText || checkRunning);
  $('#emptyTitle').textContent = !hasText ? 'Nothing to check yet' : checkRunning ? 'Checking…' : 'Looks great';
  $('#emptyText').textContent = !hasText ? 'Write or paste text on the left. Writeshaper checks it as you go, on this computer.' : checkRunning ? 'Reading your text on this computer.' : 'No spelling or grammar mistakes found.';
  const keys = new Set(suggestions.map((s) => s.key));
  // Remove cards that are gone (with an exit animation), add new ones (with an entrance).
  for (const el of [...box.children]) if (!keys.has(el.dataset.key) && !el.classList.contains('taken')) { el.classList.add('out'); setTimeout(() => el.remove(), 380); }
  suggestions.forEach((s, i) => {
    let el = box.querySelector(`[data-key="${CSS.escape(s.key)}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'card';
      el.dataset.key = s.key;
      el.style.animationDelay = shownKeys.has(s.key) ? '0s' : `${Math.min(i, 6) * 45}ms`;
      const ctxA = s.para.text.slice(Math.max(0, s.start - s.para.start - 28), s.start - s.para.start);
      const ctxB = s.para.text.slice(s.end - s.para.start, s.end - s.para.start + 28);
      el.innerHTML = `<div class="card-kind k-${s.kind}"><i></i>${s.label}</div>
        <div class="card-main">${s.from.trim() ? `<span class="from">${esc(s.from.trim())}</span><span class="arrow">→</span>` : ''}<span class="to">${esc(s.to.trim()) || '<i>remove</i>'}</span></div>
        <div class="card-ctx">…${esc(ctxA)}<b>${esc(s.from) || '‸'}</b>${esc(ctxB)}…</div>
        <div class="card-btns"><button class="btn accept">Accept</button><button class="btn dismiss">Dismiss</button></div>`;
      box.appendChild(el);
    }
    el.dataset.i = i;
    el.style.order = i;
    el.classList.toggle('hot', hot === i);
  });
  shownKeys = keys;
}
$('#cards').addEventListener('click', (e) => {
  const card = e.target.closest('.card'); if (!card) return;
  const s = suggestions.find((x) => x.key === card.dataset.key); if (!s) return;
  if (e.target.closest('.accept')) { card.classList.add('taken'); setTimeout(() => card.remove(), 500); apply([s]); }
  else if (e.target.closest('.dismiss')) { dismissed.add(s.key); computeSuggestions(); }
  else { ed.focus(); ed.setSelectionRange(s.start, s.end); }
});
$('#cards').addEventListener('mouseover', (e) => { const c = e.target.closest('.card'); setHot(c ? +c.dataset.i : -1); });
$('#cards').addEventListener('mouseleave', () => setHot(-1));
function setHot(i) { if (hot === i) return; hot = i; back.querySelectorAll('mark').forEach((m) => m.classList.toggle('hot', +m.dataset.i === i)); $$('#cards .card').forEach((c) => c.classList.toggle('hot', +c.dataset.i === i)); }

// Apply suggestions through the editor's own undo stack, last first so offsets stay right.
function apply(list) {
  const sorted = [...list].sort((a, b) => b.start - a.start);
  const sel = [ed.selectionStart, ed.selectionEnd];
  ed.focus();
  for (const s of sorted) {
    const p = s.para;
    const fixed = cache.get(p.text);
    ed.setSelectionRange(s.start, s.end);
    document.execCommand('insertText', false, s.to);
    // The changed paragraph keeps the same correction, so its other suggestions stay.
    const newPara = paragraphs(ed.value).find((x) => x.start === p.start);
    if (newPara && fixed != null) cache.set(newPara.text, fixed);
  }
  const delta = ed.value.length;
  ed.setSelectionRange(Math.min(sel[0], delta), Math.min(sel[1], delta));
  onEdit(true);
}

function onEdit(immediate) {
  const t = ed.value;
  const w = (t.trim().match(/\S+/g) || []).length;
  $('#stats').textContent = w ? `${w} word${w === 1 ? '' : 's'} · ${Math.max(1, Math.round(w / 238))} min read · ${t.length} characters` : '0 words';
  computeSuggestions();
  if (checkJob && checkingRange && !paragraphs(t).some((p) => p.start === checkingRange[0] && p.start + p.text.length === checkingRange[1])) { ws.cancel(checkJob); }
  scheduleCheck(immediate ? 50 : 750);
}
ed.addEventListener('input', () => onEdit(false));
ed.addEventListener('scroll', () => { back.scrollTop = ed.scrollTop; });
ed.addEventListener('click', () => { const c = ed.selectionStart; const i = suggestions.findIndex((s) => c >= s.start && c <= s.end); setHot(i); if (i >= 0) $(`#cards .card[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
$('#edCopy').onclick = () => { navigator.clipboard.writeText(ed.value); toast('Copied'); };
$('#edClear').onclick = () => { ed.focus(); ed.select(); document.execCommand('delete'); onEdit(true); };

// ---------- Write: rewrite actions ----------
let sheetJob = null, sheetRange = null, sheetOut = '', sheetMode = 'fix', sheetOrig = '';
const TITLES = { fix: 'Fixing', clear: 'Making it clearer', short: 'Shortening', friendly: 'Making it friendlier', pro: 'Making it professional', translate: 'Translating', ask: 'Editing' };
$('#dock').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const m = b.dataset.mode;
  if (m === 'fix') {
    if (suggestions.length) { apply(suggestions); toast(`Fixed ${suggestions.length} ${suggestions.length === 1 ? 'mistake' : 'mistakes'}`); }
    else if (ed.value.trim()) { cache.clear(); scheduleCheck(0); }
    return;
  }
  if (m === 'ask' || m === 'translate') { openAsk(m); return; }
  rewriteSel(m);
});
function openAsk(m) {
  const pop = $('#askPop');
  pop.hidden = false; pop.dataset.mode = m;
  $('#askIn').hidden = m !== 'ask';
  $('#langSel').hidden = m !== 'translate';
  if (m === 'ask') $('#askIn').focus(); else $('#langSel').focus();
}
$('#askGo').onclick = () => goAsk();
$('#askIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') goAsk(); if (e.key === 'Escape') $('#askPop').hidden = true; });
$('#langSel').addEventListener('keydown', (e) => { if (e.key === 'Enter') goAsk(); if (e.key === 'Escape') $('#askPop').hidden = true; });
function goAsk() {
  const m = $('#askPop').dataset.mode;
  const extra = m === 'ask' ? $('#askIn').value.trim() : $('#langSel').value;
  if (!extra) return;
  if (m === 'translate') ws.setSettings({ translateTo: extra });
  $('#askPop').hidden = true;
  rewriteSel(m, extra);
}
async function rewriteSel(m, extra) {
  let [a, b] = [ed.selectionStart, ed.selectionEnd];
  if (a === b) { a = 0; b = ed.value.length; }
  const text = ed.value.slice(a, b);
  if (!text.trim()) { toast('Write or select some text first'); return; }
  if (sheetJob) ws.cancel(sheetJob);
  sheetRange = [a, b]; sheetOrig = text; sheetOut = ''; sheetMode = m; fadeShown = 0;
  const sh = $('#sheet');
  sh.hidden = false; sh.classList.add('working');
  $('#sheetTitle').textContent = TITLES[m];
  $('#sheetCount').textContent = a === 0 && b === ed.value.length ? 'Whole text' : 'Selection';
  $('#sheetUse').disabled = true;
  paintSheet();
  const id = sheetJob = 's' + Date.now();
  const r = await ws.rewrite({ id, mode: m, text, extra: extra || (m === 'translate' ? S.settings.translateTo : undefined) });
  if (id !== sheetJob) return;
  sheetJob = null;
  sh.classList.remove('working');
  if (r.error) { toast(r.error); closeSheet(); return; }
  if (r.cancelled) return;
  sheetOut = r.text;
  $('#sheetUse').disabled = false;
  const a2 = (sheetOrig.trim().match(/\S+/g) || []).length, b2 = (sheetOut.trim().match(/\S+/g) || []).length;
  $('#sheetCount').textContent = `${a2} → ${b2} words`;
  paintSheet();
}
// New words blur in as they stream; words already shown stay still.
let fadeShown = 0;
function fadeWords(text, working) {
  const parts = text.split(/(\s+)/);
  let n = 0;
  const html = parts.map((p) => { if (!p || /^\s+$/.test(p)) return esc(p); n++; return n > fadeShown ? `<span class="w">${esc(p)}</span>` : esc(p); }).join('');
  fadeShown = working ? n : 0;
  return html;
}
function paintSheet() {
  const working = !!sheetJob;
  let html;
  if (sheetMode !== 'fix') html = fadeWords(sheetOut, working);
  else {
    const r = working ? WSDiff.stream(sheetOrig, sheetOut) : { ops: WSDiff.diff(sheetOrig, sheetOut), rest: '' };
    html = r.ops.map((o) => o.op === 'eq' ? esc(o.text) : o.op === 'del' ? `<span class="d-del">${esc(o.text)}</span>` : `<span class="d-ins">${esc(o.text)}</span>`).join('');
    if (working) html += '<span class="caret"></span>' + (r.rest ? `<span class="ghost">${esc(r.rest)}</span>` : '');
  }
  if (working && sheetMode !== 'fix') html += '<span class="caret"></span>';
  $('#sheetText').innerHTML = html;
  const card = document.querySelector('.sheet-card');
  $('#sheet').style.setProperty('--h', card.offsetHeight + 3 + 'px');
}
ws.onStream(({ id, text }) => { if (id === sheetJob) { sheetOut = text; paintSheet(); } });
function closeSheet() { if (sheetJob) ws.cancel(sheetJob); sheetJob = null; $('#sheet').hidden = true; }
$('#sheetDiscard').onclick = closeSheet;
$('#sheetUse').onclick = () => {
  ed.focus(); ed.setSelectionRange(sheetRange[0], sheetRange[1]);
  document.execCommand('insertText', false, sheetOut);
  closeSheet(); onEdit(true);
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet();
  if (e.key === 'Escape' && !$('#askPop').hidden) $('#askPop').hidden = true;
  if (e.key === 'Enter' && (isMac ? e.metaKey : e.ctrlKey) && !$('#sheet').hidden && !sheetJob) $('#sheetUse').click();
});


// ---------- Shortcut page demo loop ----------
const SC_BEFORE = 'hey sam, i think its gonna rain saturday so we should of booked the indoor place';
const SC_AFTER = 'Hey Sam, I think it\u2019s going to rain on Saturday, so we should have booked the indoor place.';
let scTimers = [];
function scene() {
  scTimers.forEach(clearTimeout); scTimers = [];
  const el = $('#scene'); if (!el || view !== 'shortcut') return;
  const at = (ms, f) => scTimers.push(setTimeout(f, ms));
  const set = (...c) => { el.className = 'scene glass ' + c.map((x) => 'p-' + x).join(' '); };
  $('#scWords').textContent = SC_BEFORE; $('#scPt').innerHTML = esc(SC_BEFORE); $('#scSt').textContent = 'Fixing…';
  set();
  at(700, () => set('sel'));
  at(1800, () => set('sel', 'keys'));
  at(2300, () => set('sel', 'keys', 'press'));
  at(2600, () => set('sel', 'panel', 'work'));
  // Stream the fix into the mini panel, with the changes marked.
  const steps = 22;
  for (let i = 1; i <= steps; i++) at(2900 + i * 70, () => {
    const part = SC_AFTER.slice(0, Math.round(SC_AFTER.length * i / steps));
    const r = i < steps ? WSDiff.stream(SC_BEFORE, part) : { ops: WSDiff.diff(SC_BEFORE, part), rest: '' };
    $('#scPt').innerHTML = r.ops.map((o) => o.op === 'eq' ? esc(o.text) : o.op === 'del' ? `<span class="d-del">${esc(o.text)}</span>` : `<span class="d-ins">${esc(o.text)}</span>`).join('') + (i < steps ? '<span class="caret"></span><span class="ghost">' + esc(r.rest) + '</span>' : '');
  });
  at(2900 + steps * 70 + 100, () => { set('sel', 'panel'); $('#scSt').textContent = `${WSDiff.changes(SC_BEFORE, SC_AFTER).length} fixes`; });
  at(5600, () => set('sel', 'panel', 'click'));
  at(5900, () => { set('done'); $('#scWords').textContent = SC_AFTER; });
  at(9000, scene);
}

// ---------- Settings ----------
function paintSettings() {
  const s = S.settings;
  $('#firstAction').value = s.firstAction;
  $('#translateTo').innerHTML = S.langs.map((l) => `<option${l === s.translateTo ? ' selected' : ''}>${esc(l)}</option>`).join('');
  $('#langSel').innerHTML = $('#translateTo').innerHTML;
  for (const k of ['liveCheck', 'openAtLogin', 'autoUpdate']) $('#' + k).classList.toggle('on', !!s[k]);
  $$('#theme button').forEach((b) => b.classList.toggle('on', b.dataset.t === s.theme));
  $('#version').textContent = S.version;
  paintShortcut();
}
async function set(patch) { const r = await ws.setSettings(patch); if (r.ok) { S.settings = r.settings; paintSettings(); } else toast(r.error); return r; }
$('#firstAction').onchange = (e) => set({ firstAction: e.target.value });
$('#translateTo').onchange = (e) => set({ translateTo: e.target.value });
for (const k of ['liveCheck', 'openAtLogin', 'autoUpdate']) $('#' + k).onclick = () => { set({ [k]: !S.settings[k] }).then(() => { if (k === 'liveCheck') { suggestions = []; paintBack(); paintCards(); scheduleCheck(0); } }); };
$('#theme').onclick = (e) => { const b = e.target.closest('button'); if (b) set({ theme: b.dataset.t }); };
$('#studio').onclick = () => ws.openExternal('https://hollowbit.dev/');
$('#checkNow').onclick = async () => {
  const r = await ws.checkUpdates();
  if (r.state === 'available') { toast(`Writeshaper ${r.version} is out`); ws.openExternal(r.url); }
  else toast(r.state === 'error' ? 'Couldn’t reach GitHub. Try again later.' : 'You have the newest version');
};
ws.onUpdate((u) => { if (u.state === 'available') toast(`Writeshaper ${u.version} is available. See Settings → Check now.`); });

// Shortcut recorder
let recording = false;
$('#recorder').onclick = async () => {
  recording = true; $('#recorder').classList.add('rec'); $('#recKeys').textContent = 'Press keys…';
  await ws.pauseShortcut(true);
};
document.addEventListener('keydown', async (e) => {
  if (!recording) return;
  e.preventDefault();
  if (e.key === 'Escape') { stopRec(); return; }
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
  const mods = [];
  if (e.metaKey) mods.push(isMac ? 'Command' : 'Super');
  if (e.ctrlKey) mods.push('Control');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (!mods.length) { $('#recKeys').textContent = 'Add ⌘, ⌃, ⌥ or ⇧'; return; }
  const code = e.code;
  const key = code === 'Space' ? 'Space' : /^Key[A-Z]$/.test(code) ? code.slice(3) : /^Digit\d$/.test(code) ? code.slice(5) : /^F\d+$/.test(code) ? code : null;
  if (!key) return;
  recording = false;
  const r = await set({ shortcut: [...mods, key].join('+') });
  stopRec();
  if (r.ok) toast('Shortcut saved');
});
async function stopRec() { recording = false; $('#recorder').classList.remove('rec'); await ws.pauseShortcut(false); paintShortcut(); }

// Model rows in Settings
async function paintModels() {
  S.models = await ws.models();
  const desc = { standard: 'Fast and accurate. 1.9 GB.', best: 'Catches a little more. 2.7 GB.' };
  $('#modelRows').innerHTML = S.models.map((m) => {
    const active = S.settings.model === m.id && m.installed;
    const btn = m.downloading ? `<button class="btn sm" data-a="cancel">Pause</button>`
      : !m.installed ? `<button class="btn sm" data-a="get">${m.partial ? 'Resume' : 'Download'}</button>`
      : active ? `<button class="btn sm" data-a="del">Delete</button>`
      : `<button class="btn sm" data-a="use">Use</button><button class="btn sm" data-a="del">Delete</button>`;
    return `<div class="row model-row" data-id="${m.id}"><div class="row-text"><b>${m.name}${active ? '<span class="tag">In use</span>' : ''}</b><span>${desc[m.id]}</span>${m.downloading ? '<div class="bar"><i style="width:0"></i></div>' : ''}</div><div style="display:flex;gap:6px">${btn}</div></div>`;
  }).join('');
}
$('#modelRows').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const id = b.closest('.model-row').dataset.id;
  const a = b.dataset.a;
  if (a === 'get') { ws.downloadModel(id); setTimeout(paintModels, 200); }
  if (a === 'cancel') ws.cancelDownload(id);
  if (a === 'use') { await set({ model: id }); paintModels(); }
  if (a === 'del') { if (confirm('Delete this model? You can download it again later.')) { S.models = await ws.deleteModel(id); paintModels(); } }
});

ws.onSettings((s) => { S.settings = s; paintSettings(); });

// ---------- start ----------
(async () => {
  S = await ws.getState();
  paintSettings();
  paintEngine(S.engine);
  onEdit(false);
  if (!S.settings.onboarded || !S.models.some((m) => m.installed)) showSetup();
  else go('write');
  requestAnimationFrame(moveTabPill);
  window.addEventListener('resize', moveTabPill);
})();

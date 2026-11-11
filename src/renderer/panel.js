// The floating panel: shows the selected text being fixed or rewritten, live, with the changes marked.
const $ = (s) => document.querySelector(s);
const frame = $('#frame'), card = $('#card'), result = $('#result'), input = $('#input');
const isMac = ws.platform === 'darwin';
document.body.classList.toggle('win', !isMac);
$('#copyKey').textContent = isMac ? '⌘C' : 'Ctrl C';
for (const b of document.querySelectorAll('#modes button')) b.title = b.title.replace('{MOD}', isMac ? '⌘' : 'Ctrl+');

const LABELS = { fix: 'Fixing', clear: 'Making it clearer', short: 'Shortening', friendly: 'Making it friendlier', pro: 'Making it professional', translate: 'Translating', ask: 'Editing' };
let original = '';      // the text the user selected (or typed)
let output = '';        // the latest rewrite
let mode = 'fix';
let view = 'changes';
let jobId = null;
let working = false;
let langs = [];
let translateTo = 'English';
let hadSelection = true;

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---------- layout ----------
const ro = new ResizeObserver(() => ws.panelSize(document.querySelector('.stage').getBoundingClientRect().height));
ro.observe(document.querySelector('.stage'));

function moveCapsule(container, pill, el) {
  if (!el) { pill.style.width = '0px'; return; }
  pill.style.width = el.offsetWidth + 'px';
  pill.style.transform = `translateX(${el.offsetLeft}px)`;
}
function setMode(m) {
  mode = m;
  for (const b of document.querySelectorAll('#modes button')) b.classList.toggle('on', b.dataset.mode === m);
  moveCapsule($('#modes'), $('#pill'), document.querySelector(`#modes button[data-mode="${m}"]`));
}
function setView(v, quiet) {
  view = v;
  for (const b of document.querySelectorAll('#view button')) b.classList.toggle('on', b.dataset.v === v);
  const on = document.querySelector(`#view button[data-v="${v}"]`);
  const pill = $('#view .seg-pill');
  pill.style.width = on.offsetWidth + 'px'; pill.style.transform = `translateX(${on.offsetLeft - 3}px)`;
  if (!quiet) render();
}

// ---------- rendering ----------
let shownWords = 0;
// In clean view, new words blur in as they stream.
function fadeWords(text) {
  let n = 0;
  const html = text.split(/(\s+)/).map((p) => { if (!p || /^\s+$/.test(p)) return esc(p); n++; return n > shownWords ? `<span class="w">${esc(p)}</span>` : esc(p); }).join('');
  shownWords = working ? n : 0;
  return html;
}
function render() {
  const out = output;
  result.classList.toggle('streaming', working);
  if (!hadSelection && !out && !working) { result.innerHTML = ''; return; }
  let html = '';
  if (view === 'before' || (!out && !working)) {
    html = esc(original);
  } else if (view === 'clean' || mode === 'translate' || !original) {
    html = fadeWords(out);
  } else {
    const r = working ? WSDiff.stream(original, out) : { ops: WSDiff.diff(original, out), rest: '' };
    html = r.ops.map((o) => o.op === 'eq' ? esc(o.text) : o.op === 'del' ? `<span class="d-del">${esc(o.text)}</span>` : `<span class="d-ins">${esc(o.text)}</span>`).join('');
    if (working && r.rest) html += `<span class="ghost">${esc(r.rest)}</span>`;
  }
  if (working) {
    const i = html.lastIndexOf('<span class="ghost">');
    html = i >= 0 ? html.slice(0, i) + '<span class="caret"></span>' + html.slice(i) : html + '<span class="caret"></span>';
  }
  result.innerHTML = html;
  updateCount();
}

function updateCount() {
  const c = $('#count');
  if (working) { c.textContent = ''; return; }
  if (!output) { c.textContent = ''; return; }
  if (mode === 'fix') {
    const n = WSDiff.changes(original, output).length;
    c.innerHTML = n ? `<b>${n}</b> ${n === 1 ? 'fix' : 'fixes'}` : 'Looks good, nothing to fix';
  } else {
    const a = words(original), b = words(output);
    c.textContent = `${a} → ${b} words`;
  }
}
const words = (s) => (s.trim().match(/\S+/g) || []).length;

function setWorking(on) {
  working = on;
  frame.classList.toggle('working', on);
  $('#statusText').textContent = on ? `${LABELS[mode]}…` : (output ? 'Done' : 'Ready');
  $('#replace').disabled = on || !output;
  $('#copy').disabled = on || !output;
  if (!on && output) { frame.classList.remove('flash'); void frame.offsetWidth; frame.classList.add('flash'); }
}

// ---------- running ----------
async function run(m, extra) {
  if (!hadSelection) original = input.value;
  if (!original.trim()) { input.focus(); return; }
  if (m === 'ask' && !extra) { openAsk(); return; }
  if (m === 'translate' && !extra) extra = translateTo;
  if (jobId) ws.cancel(jobId);
  setMode(m);
  $('#ask').hidden = true;
  $('#langs').hidden = true;
  $('#error').hidden = true;
  if (!hadSelection) { input.hidden = true; result.hidden = false; }
  output = ''; shownWords = 0;
  setView(m === 'fix' ? 'changes' : 'clean', true);
  const id = jobId = 'p' + Date.now() + Math.random().toString(16).slice(2, 6);
  setWorking(true);
  render();
  const r = await ws.rewrite({ id, mode: m, text: original, extra });
  if (id !== jobId) return;
  jobId = null;
  if (r.error) { $('#error').textContent = r.error; $('#error').hidden = false; }
  if (r.text != null) output = r.text;
  setWorking(false);
  render();
}
ws.onStream(({ id, text }) => {
  if (id !== jobId) return;
  output = text;
  render();
});

function openAsk() {
  $('#langs').hidden = true;
  $('#ask').hidden = false;
  setMode('ask');
  $('#askInput').focus();
}
function openLangs() {
  $('#ask').hidden = true;
  const box = $('#langs');
  box.innerHTML = langs.map((l) => `<button class="${l === translateTo ? 'on' : ''}">${l}</button>`).join('');
  box.hidden = false;
  setMode('translate');
  box.querySelectorAll('button').forEach((b) => b.onclick = () => {
    translateTo = b.textContent;
    $('#tLabel').textContent = translateTo;
    ws.setSettings({ translateTo });
    run('translate', translateTo);
  });
}

// ---------- events ----------
$('#modes').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const m = b.dataset.mode;
  if (m === 'translate') { if (!$('#langs').hidden) { run('translate', translateTo); } else openLangs(); return; }
  if (m === 'ask') { openAsk(); return; }
  $('#ask').hidden = true;
  run(m);
});
$('#askInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.value.trim()) { e.preventDefault(); e.stopPropagation(); run('ask', e.target.value.trim()); }
});
$('#view').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); });
$('#close').onclick = () => close();
$('#copy').onclick = () => { if (output) ws.panelCopy(output); };
$('#replace').onclick = () => replace();
$('#openApp').onclick = () => ws.panelOpenApp();
let pinned = false;
$('#pin').onclick = () => { pinned = !pinned; $('#pin').classList.toggle('on', pinned); ws.panelPin(pinned); };

function replace() {
  if (!output || working) return;
  $('#replace').classList.add('done');
  setTimeout(() => ws.panelReplace(output), 120);
}
function close() { if (jobId) ws.cancel(jobId); jobId = null; ws.panelClose(); }

document.addEventListener('keydown', (e) => {
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (e.key === 'Escape') {
    e.preventDefault();
    if (!$('#ask').hidden && document.activeElement === $('#askInput')) { $('#ask').hidden = true; setMode(output ? mode : 'fix'); return; }
    if (!$('#langs').hidden) { $('#langs').hidden = true; return; }
    close(); return;
  }
  const typing = document.activeElement === input || document.activeElement === $('#askInput');
  if (e.key === 'Enter' && !e.shiftKey && !typing) { e.preventDefault(); replace(); return; }
  if (e.key === 'Enter' && mod && document.activeElement === input) { e.preventDefault(); run(mode === 'ask' ? 'fix' : mode); return; }
  if (mod && e.key.toLowerCase() === 'c' && !typing && !String(getSelection())) { e.preventDefault(); if (output) ws.panelCopy(output); return; }
  if (mod && /^[1-7]$/.test(e.key)) {
    e.preventDefault();
    const m = ['fix', 'clear', 'short', 'friendly', 'pro', 'translate', 'ask'][+e.key - 1];
    document.querySelector(`#modes button[data-mode="${m}"]`).click();
  }
});

ws.onPanelOpen((d) => {
  original = d.text || '';
  hadSelection = !!original.trim();
  langs = d.langs || [];
  translateTo = d.translateTo || 'English';
  $('#tLabel').textContent = translateTo === 'English' ? 'Translate' : translateTo;
  output = ''; jobId = null; pinned = false; $('#pin').classList.remove('on');
  $('#ask').hidden = true; $('#langs').hidden = true; $('#error').hidden = true; $('#askInput').value = '';
  $('#replaceLabel').textContent = hadSelection ? 'Replace' : 'Insert';
  input.hidden = hadSelection; result.hidden = !hadSelection;
  input.value = '';
  frame.classList.remove('enter', 'leave', 'flash'); void frame.offsetWidth; frame.classList.add('enter');
  setView('changes');
  setMode(d.action || 'fix');
  setWorking(false);
  render();
  if (hadSelection) run(d.action || 'fix');
  else setTimeout(() => input.focus(), 30);
});
ws.onPanelHidden(() => { if (jobId) ws.cancel(jobId); jobId = null; working = false; frame.classList.remove('working'); });
ws.onEngine((s) => { if (s.state === 'error') { $('#error').textContent = s.error; $('#error').hidden = false; } });

// Keep the capsules under the right button when sizes change (key hints showing, fonts loading).
new ResizeObserver(() => { setMode(mode); const on = document.querySelector(`#view button.on`); if (on) setView(view, true); }).observe($('#modes'));
for (const b of document.querySelectorAll('#modes button')) new ResizeObserver(() => setMode(mode)).observe(b);
// First layout of the capsules once fonts are ready.
requestAnimationFrame(() => { setMode('fix'); setView('changes'); });

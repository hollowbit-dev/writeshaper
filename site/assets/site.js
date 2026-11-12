(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Language: open the visitor's own language once on their first visit; a manual choice always wins afterwards.
  const W = window.WSL;
  if (W) {
    try {
      const k = 'ws-lang';
      if (!localStorage.getItem(k) && W.lang === 'en' && W.page) {
        const pref = (navigator.languages || [navigator.language || 'en']).map((l) => l.toLowerCase().slice(0, 2)).find((l) => W.langs.includes(l));
        localStorage.setItem(k, pref || 'en');
        if (pref && pref !== 'en') location.replace(`${W.base}${pref}/${W.page === 'index' ? '' : `${W.page}.html`}${location.hash}`);
      }
      $$('[data-set-lang]').forEach((a) => a.addEventListener('click', () => localStorage.setItem(k, a.dataset.setLang)));
    } catch { /* storage blocked */ }
    document.addEventListener('click', (e) => { const o = $('details.lang[open]'); if (o && !o.contains(e.target)) o.removeAttribute('open'); });
  }

  // Menu on small screens
  const menu = $('.menu-btn'), links = $('#links');
  menu?.addEventListener('click', () => { const o = links.classList.toggle('open'); menu.setAttribute('aria-expanded', o); });
  links?.addEventListener('click', (e) => { if (e.target.closest('a')) links.classList.remove('open'); });

  // Put the visitor's own system first
  const ua = navigator.userAgent;
  const os = /Mac/i.test(ua) && !/iPhone|iPad/i.test(ua) ? 'mac' : /Win/i.test(ua) ? 'win' : null;
  if (os) {
    for (const cta of $$('.cta')) {
      const mine = $(`[data-os="${os}"]`, cta), other = $(`[data-os="${os === 'mac' ? 'win' : 'mac'}"]`, cta);
      if (mine && other) { mine.className = mine.className.replace('btn-glass', 'btn-brand'); other.className = other.className.replace('btn-brand', 'btn-glass'); cta.prepend(mine); }
    }
    $(`[data-os-card="${os}"]`)?.classList.add('mine');
    if (os === 'win') $$('.s-vis.keys, .aw-hint').forEach((el) => { el.innerHTML = el.innerHTML.replace('<span class="kbd">⌥</span>', '<span class="kbd">Alt</span><span class="kbd">Shift</span>'); });
  }

  // Reveal on scroll
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  // The big statement lights up word by word as it scrolls through the screen.
  const words = $$('.big-statement span');
  if (words.length) {
    const lit = () => {
      const r = $('.big-statement').getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('lit', i < n));
    };
    addEventListener('scroll', lit, { passive: true }); lit();
  }

  // Tone tile: the same message cycles through Professional, Friendlier, Shorter.
  const tt = $('.tone-text');
  if (tt && !reduce) {
    const tones = JSON.parse(tt.dataset.tones), chips = $$('.tone-chips span');
    let k = 0;
    setInterval(() => {
      k = (k + 1) % tones.length;
      tt.classList.add('swap');
      setTimeout(() => { tt.textContent = tones[k]; chips.forEach((c, i) => c.classList.toggle('on', i === k)); tt.classList.remove('swap'); }, 350);
    }, 3200);
  }

  // ---------- The live demo ----------
  const stage = $('#stage');
  if (!stage) return;
  const DATA = JSON.parse($('#demoData').textContent);
  const line = $('#awLine'), wordsEl = $('#awWords'), pText = $('#pText'), pSt = $('#pSt span'), count = $('#pCount');
  const modes = $('#pModes'), pill = $('.p-pill', modes);
  let s = 0, mode = 'fix', out = '', shown = '', running = 0, open = false, current = '';

  function setSample(i) {
    s = i;
    const d = DATA[i];
    $$('.samples button').forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-selected', k === i); });
    $('#awApp').textContent = d.app === 'Messages' ? `Messages · ${d.to}` : 'New message';
    $('#awMeta').innerHTML = d.app === 'Messages' ? '' : `<div><b>To</b>${esc(d.to)}</div><div><b>Subject</b>${esc(d.subject || '')}</div>`;
    current = d.text;
    wordsEl.textContent = current;
    line.classList.remove('selected', 'flash');
  }
  function movePill() {
    const on = $('button.on', modes); if (!on) return;
    pill.style.width = on.offsetWidth + 'px'; pill.style.transform = `translateX(${on.offsetLeft}px)`;
  }
  function paint(partial, working) {
    const orig = DATA[s].text;
    let html;
    if (mode === 'fix') {
      const r = working ? WSDiff.stream(orig, partial) : { ops: WSDiff.diff(orig, partial), rest: '' };
      html = r.ops.map((o) => o.op === 'eq' ? esc(o.text) : o.op === 'del' ? `<span class="d-del">${esc(o.text)}</span>` : `<span class="d-ins">${esc(o.text)}</span>`).join('');
      if (working) html += '<span class="caret"></span>' + (r.rest ? `<span class="ghost">${esc(r.rest)}</span>` : '');
    } else {
      // Clean text, with each new word blurring in.
      const parts = partial.split(/(\s+)/);
      let n = 0;
      html = parts.map((p) => { if (!p || /^\s+$/.test(p)) return esc(p); n++; return n > shownWords ? `<span class="w">${esc(p)}</span>` : esc(p); }).join('');
      shownWords = n;
      if (working) html += '<span class="caret"></span>';
    }
    pText.innerHTML = html;
  }
  let shownWords = 0;
  async function run(m) {
    const id = ++running;
    mode = m; out = DATA[s].out[m]; shownWords = 0;
    $$('button', modes).forEach((b) => b.classList.toggle('on', b.dataset.m === m));
    movePill();
    stage.classList.remove('done-flash');
    stage.classList.add('working');
    pSt.textContent = { fix: 'Fixing…', clear: 'Making it clearer…', short: 'Shortening…', friendly: 'Making it friendlier…', pro: 'Making it professional…', translate: 'Translating…' }[m];
    count.textContent = '';
    $('#pReplace').disabled = true; $('#pCopy').disabled = true;
    // Same rhythm as the app on a laptop: a short think, then the text streams in.
    paint('', true);
    await wait(reduce ? 0 : 380);
    const step = reduce ? out.length : Math.max(2, Math.round(out.length / 70));
    for (let i = step; i < out.length + step; i += step) {
      if (id !== running) return;
      paint(out.slice(0, i), true);
      await wait(16);
    }
    if (id !== running) return;
    shown = out;
    stage.classList.remove('working'); void stage.offsetWidth; stage.classList.add('done-flash');
    paint(out, false);
    pSt.textContent = 'Done';
    const n = WSDiff.changes(DATA[s].text, out).length;
    const w = (x) => (x.trim().match(/\S+/g) || []).length;
    count.innerHTML = m === 'fix' ? `<b>${n}</b> ${n === 1 ? 'fix' : 'fixes'}` : m === 'translate' ? 'Spanish' : `${w(DATA[s].text)} → ${w(out)} words`;
    $('#pReplace').disabled = false; $('#pCopy').disabled = false;
  }
  async function openPanel(m = 'fix') {
    line.classList.remove('flash');
    line.classList.add('selected');
    await wait(reduce ? 0 : 420);
    open = true;
    stage.classList.add('open');
    requestAnimationFrame(movePill);
    run(m);
  }
  function closePanel() { running++; open = false; stage.classList.remove('open', 'working'); line.classList.remove('selected'); }
  function replace() {
    if (!shown || stage.classList.contains('working')) return;
    closePanel();
    current = shown;
    wordsEl.textContent = current;
    void line.offsetWidth; line.classList.add('flash');
  }

  $('.samples').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    closePanel(); setSample(+b.dataset.s); setTimeout(() => openPanel('fix'), 250);
  });
  modes.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) run(b.dataset.m); });
  $('#pReplace').addEventListener('click', replace);
  $('#pCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(shown); $('#pCopy').textContent = 'Copied'; setTimeout(() => { $('#pCopy').textContent = 'Copy'; }, 1400); } catch { /* not allowed */ } });
  $('.p-esc').addEventListener('click', closePanel);
  $('.app-win').addEventListener('click', (e) => { if (!open && !e.target.closest('.panel')) { setSample(s); openPanel('fix'); } });
  $('#awHint').addEventListener('click', (e) => { e.stopPropagation(); if (!open) { setSample(s); openPanel('fix'); } });

  // Keyboard, while the demo is on screen: the same keys as the app.
  let onScreen = false;
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; }, { threshold: 0.35 }).observe(stage);
  addEventListener('keydown', (e) => {
    if (!onScreen || /input|textarea|select/i.test(document.activeElement?.tagName || '')) return;
    if (e.code === 'Space' && e.altKey) { e.preventDefault(); if (!open) { setSample(s); openPanel('fix'); } return; }
    if (!open) return;
    if (e.key === 'Escape') closePanel();
    else if (e.key === 'Enter') { e.preventDefault(); replace(); }
    else if (/^[1-6]$/.test(e.key)) run(['fix', 'clear', 'short', 'friendly', 'pro', 'translate'][+e.key - 1]);
  });
  addEventListener('resize', movePill);

  // Play the first example once, when the demo first comes into view.
  setSample(0);
  const first = new IntersectionObserver((es) => { if (es[0].isIntersecting) { first.disconnect(); setTimeout(() => openPanel('fix'), 500); } }, { threshold: 0.45 });
  first.observe(stage);
})();

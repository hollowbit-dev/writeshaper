// Builds the Writeshaper website into docs/ (GitHub Pages, served at hollowbit.dev/writeshaper).
// Pages: home (with the live demo), features, download, FAQ, privacy, 404, plus sitemap, robots and llms.txt.
// Run: npm run site
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { studioPill, studioBadge, studioCard, studioCss } from './studio.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..');
const out = path.join(root, 'docs');
const V = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const UPDATED = '2026-11-11';
const SITE = {
  url: 'https://hollowbit.dev/writeshaper', base: '/writeshaper/',
  github: 'https://github.com/hollowbit-dev/writeshaper', tip: 'https://ko-fi.com/hollowbit', studio: 'https://hollowbit.dev/',
};
const FILES = { mac: `Writeshaper-${V}-mac-arm64.dmg`, macIntel: `Writeshaper-${V}-mac-x64.dmg`, win: `Writeshaper-Setup-${V}-win-x64.exe` };
const DL = `${SITE.github}/releases/latest/download/`;
const DEMO = JSON.parse(fs.readFileSync(path.join(here, 'demo-data.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? `{${k}}`);
const CODES = ['en', 'es', 'fr', 'de', 'ru', 'zh'];
const LANGS = await Promise.all(CODES.map(async (c) => (await import(`./locales/${c}.mjs`)).default));
const EN = LANGS[0];
// Sizes and checksums: from the local installers if they're built, otherwise from the GitHub release (same files).
const REL = {};
try {
  const r = await fetch(`https://api.github.com/repos/hollowbit-dev/writeshaper/releases/tags/v${V}`, { headers: { 'User-Agent': 'hollowbit-site-build' } });
  if (r.ok) for (const a of (await r.json()).assets || []) REL[a.name] = { size: a.size, sha: (a.digest || '').replace(/^sha256:/, '') };
} catch { /* offline */ }
const mb = (file) => { const p = path.join(root, 'dist', file); return fs.existsSync(p) ? Math.round(fs.statSync(p).size / 1e6) : REL[file] ? Math.round(REL[file].size / 1e6) : 110; };
const sha = (file) => { const p = path.join(root, 'dist', file); return fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : REL[file]?.sha || 'build the installers to fill this in'; };
const MB = mb(FILES.mac);
const pre = (L) => `${SITE.base}${L.lang === 'en' ? '' : `${L.lang}/`}`;      // root of a language
const urlOf = (L, page) => `${SITE.url}/${L.lang === 'en' ? '' : `${L.lang}/`}${page === 'index' ? '' : `${page}.html`}`;

// ---------- icons ----------
const I = (d) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  apple: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="none" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9s-2-.9-3.3-.9C6.1 7 4.5 8 3.6 9.6c-1.8 3.2-.5 7.9 1.3 10.4.9 1.3 1.9 2.7 3.2 2.6 1.3 0 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.6zM14 5.2c.7-.9 1.2-2 1-3.2-1 .1-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/></svg>',
  win: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="none" d="M3 5.6 10.4 4.6v7H3zM11.6 4.4 21 3v8.6h-9.4zM3 12.6h7.4v7L3 18.6zM11.6 12.6H21V21l-9.4-1.4z"/></svg>',
  gh: I('<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'),
  heart: I('<path d="M12 20s-7-4.3-8.8-8.7C1.9 8 4 4.8 7.2 4.8c1.9 0 3.4 1 4.8 2.8 1.4-1.8 2.9-2.8 4.8-2.8 3.2 0 5.3 3.2 4 6.5C19 15.7 12 20 12 20z"/>'),
  check: I('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  arrow: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  lock: I('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  plane: I('<path d="M10.5 13.5 3 11l1.5-1.5 7.5.5 4.5-5a2 2 0 0 1 3 3l-5 4.5.5 7.5L13.5 21l-2.5-7.5"/>'),
  globe: I('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5s1.1-6.1 3.5-8.5z"/>'),
  spark: I('<path d="M12 3c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7z"/>'),
  keys: I('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
  free: I('<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.6 0-2.7.9-2.7 2s1 1.6 2.7 2 2.7.9 2.7 2-1.1 2-2.7 2c-1.2 0-2.2-.5-2.7-1.3M12 6.5V8m0 8v1.5"/>'),
};
const HB = '<svg class="hb" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M6 2h12a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Zm9 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/></svg>';

// ---------- shared layout ----------
function layout(L, page, title, desc, body, o = {}) {
  const t = L, n = t.nav, f = t.foot, P = pre(L);
  const canon = urlOf(L, page);
  const ld = [{
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Writeshaper', applicationCategory: 'ProductivityApplication',
    operatingSystem: 'macOS 12 or later, Windows 10, Windows 11', softwareVersion: V, description: desc, inLanguage: L.html,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, downloadUrl: `${SITE.url}/download.html`,
    publisher: { '@type': 'Organization', name: 'Hollowbit Studio', url: SITE.studio }, image: `${SITE.url}/img/og.png`,
  }, ...(o.ld || [])];
  const alternates = page === '404' ? '' : `${LANGS.map((l) => `<link rel="alternate" hreflang="${l.html}" href="${urlOf(l, page)}">`).join('')}<link rel="alternate" hreflang="x-default" href="${urlOf(EN, page)}">`;
  const pageHref = (l) => `${pre(l)}${page === 'index' || page === '404' ? '' : `${page}.html`}`;
  const NAV = [['features', n.features], ['faq', n.faq], ['privacy', n.privacy]];
  return `<!doctype html>
<html lang="${L.html}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
${alternates}
<meta property="og:type" content="website"><meta property="og:site_name" content="Writeshaper by Hollowbit Studio"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}"><meta property="og:image" content="${SITE.url}/img/og.png"><meta property="og:locale" content="${L.html.replace('-', '_')}"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f4f3f8" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#121118" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${SITE.base}img/icon-64.png"><link rel="apple-touch-icon" href="${SITE.base}img/icon-256.png">
<link rel="preload" href="${SITE.base}fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${SITE.base}site.css?v=${o.cssv}">
<script>window.WSL = ${JSON.stringify({ lang: L.lang, langs: CODES, base: SITE.base, page: page === '404' ? null : page })};</script>
<script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld)}</script>
</head>
<body class="p-${page}">
<div class="wash" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
<header class="nav">
  <div class="nav-in glass">
    <a class="logo" href="${P}"><img src="${SITE.base}img/icon-64.png" width="26" height="26" alt=""><span>Writeshaper</span></a>${studioPill(L.lang)}
    <nav class="links" id="links">
      ${page === 'index' ? `<a href="#try">${esc(n.try)}</a>` : `<a href="${P}#try">${esc(n.try)}</a>`}
      ${NAV.map(([h, txt]) => `<a href="${P}${h}.html"${page === h ? ' aria-current="page"' : ''}>${esc(txt)}</a>`).join('')}
      <a class="btn btn-brand sm" href="${P}download.html">${esc(n.download)}</a>
    </nav>
    <details class="lang"><summary aria-label="${esc(n.language)}">${ICON.globe}<span>${L.lang.toUpperCase()}</span></summary>
      <div class="lang-menu">${LANGS.map((l) => `<a href="${pageHref(l)}" hreflang="${l.html}" lang="${l.html}" data-set-lang="${l.lang}"${l.lang === L.lang ? ' aria-current="true"' : ''}>${l.name}</a>`).join('')}</div></details>
    <button class="menu-btn" aria-label="${esc(n.menu)}" aria-expanded="false" aria-controls="links">${ICON.menu}</button>
  </div>
</header>
<main>
${body}
</main>
<footer class="foot">
  <div class="wrap">
    ${studioCard(L.lang, 'Writeshaper')}
    <div class="foot-grid">
      <div class="foot-brand"><a class="logo" href="${P}"><img src="${SITE.base}img/icon-64.png" width="26" height="26" alt=""><span>Writeshaper</span></a><p>${esc(f.about)}</p></div>
      <div><b>${esc(f.product)}</b><a href="${P}#try">${esc(n.try)}</a><a href="${P}features.html">${esc(n.features)}</a><a href="${P}download.html">${esc(n.download)}</a><a href="${SITE.github}/releases">${esc(f.changelog)}</a></div>
      <div><b>${esc(f.help)}</b><a href="${P}faq.html">${esc(n.faq)}</a><a href="${P}privacy.html">${esc(n.privacy)}</a><a href="${SITE.github}/issues">${esc(f.report)}</a></div>
      <div><b>Hollowbit</b><a href="${SITE.studio}">${esc(f.studio)}</a><a href="${SITE.github}">GitHub</a><a href="${SITE.tip}">${esc(f.support)}</a></div>
    </div>
    <div class="foot-mark" aria-hidden="true">Writeshaper</div>
    <p class="foot-small">${esc(f.small)}</p>
  </div>
</footer>
<script src="${SITE.base}diff.js?v=${o.jsv}"></script>
<script src="${SITE.base}site.js?v=${o.jsv}" defer></script>
</body>
</html>`;
}

const dlButtons = (L, cls = 'cta') => `<div class="${cls}">
  <a class="btn btn-brand big" data-os="mac" href="${pre(L)}download.html#mac">${ICON.apple}${esc(L.hero.mac)}</a>
  <a class="btn btn-glass big" data-os="win" href="${pre(L)}download.html#win">${ICON.win}${esc(L.hero.win)}</a>
</div>`;
// Chinese has no spaces, so it animates as one block.
const headline = (L, text, cls = '') => {
  // Each word animates on its own; words inside <em> keep the highlight. Chinese animates per phrase.
  let i = 0;
  const parts = text.split(/(<em>.*?<\/em>)/).filter(Boolean).flatMap((p) => {
    const em = p.startsWith('<em>'), inner = em ? p.slice(4, -5) : p;
    const ws = L.lang === 'zh' ? [inner.trim()].filter(Boolean) : inner.split(' ').filter(Boolean);
    return ws.map((w) => `<span class="w" style="--i:${i++}">${em ? `<em>${w}</em>` : w}</span>`);
  });
  return `<h1 class="split ${cls}">${parts.join(L.lang === 'zh' ? '' : ' ')}</h1>`;
};
const words = (L, text) => (L.lang === 'zh' ? text.split(/(?<=[，。])/) : text.split(' ')).map((w) => `<span>${esc(w)}</span>`).join(L.lang === 'zh' ? '' : ' ');

// ---------- the live demo (answers are real English outputs; the app's buttons stay in English) ----------
const MODES = [['fix', 'Fix'], ['clear', 'Clearer'], ['short', 'Shorter'], ['friendly', 'Friendlier'], ['pro', 'Professional'], ['translate', 'Spanish']];
const demo = (L) => `
<section class="try" id="try">
  <div class="wrap">
    <div class="try-head reveal">
      <p class="eyebrow">${esc(L.demo.eyebrow)}</p>
      <h2>${esc(L.demo.h2)}</h2>
      <p class="lede">${esc(L.demo.lede)}${L.demo.english ? ` <span class="muted">${esc(L.demo.english)}</span>` : ''}</p>
    </div>
    <div class="samples reveal" role="tablist" lang="en">
      ${DEMO.samples.map((s, i) => `<button role="tab" data-s="${i}"${i === 0 ? ' class="on" aria-selected="true"' : ''}>${esc(s.label)}</button>`).join('')}
    </div>
    <div class="stage reveal" id="stage" lang="en">
      <div class="app-win">
        <div class="aw-bar"><i></i><i></i><i></i><span id="awApp">Mail</span></div>
        <div class="aw-meta" id="awMeta"></div>
        <div class="aw-text"><span class="aw-line" id="awLine"><span class="aw-sel" id="awSel"></span><span id="awWords"></span></span></div>
        <div class="aw-hint" id="awHint"><span class="kbd">⌥</span><span class="kbd">Space</span> <span lang="${L.html}">${esc(L.demo.hint)}</span></div>
      </div>
      <div class="panel" id="panel">
        <div class="p-halo"></div><div class="p-glow"></div>
        <div class="p-card">
          <div class="p-top"><img src="${SITE.base}img/icon-64.png" alt="" width="18" height="18"><b>Writeshaper</b><span class="p-st" id="pSt"><i></i><span>Ready</span></span><span class="p-esc kbd">esc</span></div>
          <div class="p-text" id="pText"></div>
          <div class="p-modes" id="pModes"><span class="p-pill"></span>${MODES.map(([m, l], i) => `<button data-m="${m}"${i === 0 ? ' class="on"' : ''}>${l}</button>`).join('')}</div>
          <div class="p-foot"><span class="p-count" id="pCount"></span><button class="btn btn-glass sm" id="pCopy">Copy</button><button class="btn btn-brand sm" id="pReplace">Replace <span class="kbd on-brand">↵</span></button></div>
        </div>
      </div>
    </div>
    <p class="try-note reveal">${ICON.lock}${esc(L.demo.note)}</p>
  </div>
  <script type="application/json" id="demoData">${JSON.stringify(DEMO.samples).replace(/</g, '\\u003c')}</script>
</section>`;

// ---------- pages ----------
const APPS = ['Mail', 'Gmail', 'Outlook', 'Word', 'Google Docs', 'Pages', 'Notion', 'Slack', 'Discord', 'WhatsApp', 'Teams', 'LinkedIn', 'Notes', 'Obsidian', 'Messenger', 'Telegram'];
const FAQ = (L) => L.faq.map(([q, a]) => [q, fill(a, { mb: MB })]);
const home = (L) => {
  const b = L.bento, st = L.steps, c = L.compare, price = L.price;
  return `
<section class="hero">
  <div class="wrap center">
    <div class="reveal">${studioBadge(L.lang)}</div>
    ${headline(L, L.hero.h1)}
    <p class="lede reveal">${esc(L.hero.lede)}</p>
    ${dlButtons(L, 'cta reveal')}
    <p class="small reveal">${esc(L.hero.small)} · <a href="#try">${esc(L.hero.tryBelow)}</a></p>
  </div>
</section>
${demo(L)}
<section class="apps" aria-label="${esc(L.appsH)}">
  <p class="eyebrow center">${esc(L.appsH)}</p>
  <div class="ticker"><div class="track">${[...APPS, ...APPS].map((a) => `<span>${a}</span>`).join('')}</div></div>
</section>
<section class="bento-sec">
  <div class="wrap">
    <div class="sec-head reveal"><p class="eyebrow">${esc(b.eyebrow)}</p><h2>${esc(b.h2)} <span class="muted">${esc(b.h2b)}</span></h2></div>
    <div class="bento">
      <article class="tile t-live glass reveal">
        <div class="t-copy"><h3>${esc(b.liveH)}</h3><p>${esc(b.liveP)}</p></div>
        <div class="live-demo" aria-hidden="true" lang="en">
          <p class="ld-text"><span class="u">Their</span> going to announce the results next week, <span class="u">its</span> been a long <span class="u">proces</span>.</p>
          <div class="ld-cards"><div class="ld-card"><small>Grammar</small><span><s>Their</s> → <b>They're</b></span></div><div class="ld-card"><small>Spelling</small><span><s>its</s> → <b>it's</b></span></div><div class="ld-card"><small>Spelling</small><span><s>proces</s> → <b>process</b></span></div></div>
        </div>
      </article>
      <article class="tile t-tone glass reveal">
        <h3>${esc(b.toneH)}</h3>
        <div class="tone" aria-hidden="true" lang="en">
          <div class="tone-chips"><span class="on">Professional</span><span>Friendlier</span><span>Shorter</span></div>
          <p class="tone-text" data-tones="${esc(JSON.stringify([DEMO.samples[1].out.pro, DEMO.samples[1].out.friendly, DEMO.samples[1].out.short]))}">${esc(DEMO.samples[1].out.pro)}</p>
        </div>
      </article>
      <article class="tile t-private reveal">
        <div class="lockring" aria-hidden="true">${ICON.lock}</div>
        <h3>${esc(b.privH)}</h3>
        <p>${esc(b.privP)}</p>
      </article>
      ${L.features.slice(3).filter((f) => f[0] !== 'lock').concat([['free', b.freeH, fill(b.freeP, { price })]]).map(([ic, h, p]) => `<article class="tile t-small glass reveal"><span class="t-ic">${ICON[ic]}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('')}
    </div>
  </div>
</section>
<section class="steps-sec">
  <div class="wrap">
    <div class="sec-head center reveal"><p class="eyebrow">${esc(st.eyebrow)}</p><h2>${esc(st.h2)}</h2></div>
    <div class="steps">
      <div class="step glass reveal"><span class="n">1</span><div class="s-vis sel" aria-hidden="true"><i></i><i></i><i class="hl"></i></div><h3>${esc(st.s1h)}</h3><p>${esc(st.s1p)}</p></div>
      <div class="step glass reveal"><span class="n">2</span><div class="s-vis keys" aria-hidden="true"><span class="kbd">⌥</span><span class="kbd">Space</span></div><h3>${esc(st.s2h)}</h3><p>${esc(st.s2p)} <span class="muted">${esc(st.s2win)}</span></p></div>
      <div class="step glass reveal"><span class="n">3</span><div class="s-vis rep" aria-hidden="true"><i></i><i class="new"></i><i></i></div><h3>${esc(st.s3h)}</h3><p>${esc(st.s3p)}</p></div>
    </div>
  </div>
</section>
<section class="private-band">
  <div class="wrap">
    <p class="big-statement reveal-words">${words(L, L.statement)}</p>
  </div>
</section>
<section class="compare-sec">
  <div class="wrap narrow">
    <div class="sec-head center reveal"><h2>${esc(c.h2)}</h2></div>
    <div class="compare glass reveal">
      <div class="c-row c-head"><span></span><b>${esc(c.us)}</b><b>${esc(c.them)}</b></div>
      ${c.rows.map(([k, us, them]) => `<div class="c-row"><span>${esc(k)}</span><b class="yes">${esc(us)}</b><span>${esc(fill(them, { price: cap1(price) }))}</span></div>`).join('\n      ')}
    </div>
  </div>
</section>
<section class="faq-sec">
  <div class="wrap narrow">
    <div class="sec-head center reveal"><h2>${esc(L.faqH)}</h2></div>
    ${FAQ(L).slice(0, 4).map(([q, a]) => `<details class="qa glass reveal"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
    <p class="center reveal"><a class="more" href="${pre(L)}faq.html">${esc(L.faqAll)} ${ICON.arrow}</a></p>
  </div>
</section>
${endCta(L)}`;
};
const cap1 = (x) => x.charAt(0).toUpperCase() + x.slice(1);

function endCta(L) {
  return `<section class="end">
  <div class="wrap center">
    <img class="end-icon reveal" src="${SITE.base}img/icon-256.png" width="112" height="112" alt="">
    <h2 class="reveal">${esc(L.end.h2)}</h2>
    <p class="lede reveal">${esc(fill(L.end.lede, { mb: MB }))}</p>
    ${dlButtons(L, 'cta reveal')}
  </div>
</section>`;
}

const pageHero = (L, h1, lead) => `<section class="page-hero"><div class="wrap center">${headline(L, esc(h1))}${lead ? `<p class="lede reveal">${esc(lead)}</p>` : ''}</div></section>`;

const SHOTS = ['app-write', 'app-shortcut', 'app-settings'];
const features = (L) => `${pageHero(L, L.featPage.h1, L.featPage.lede)}
<section class="feat-list"><div class="wrap">
  ${L.features.map(([ic, h, p]) => `<article class="feat glass reveal"><span class="t-ic">${ICON[ic]}</span><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></article>`).join('')}
</div></section>
<section class="shots"><div class="wrap">
  ${L.featPage.shots.map(([alt, cap], i) => `<figure class="shot reveal"><img src="${SITE.base}img/${SHOTS[i]}.webp" width="2240" height="1520" alt="${esc(alt)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`).join('\n  ')}
</div></section>
${endCta(L)}`;

const download = (L) => { const d = L.dl; return `${pageHero(L, d.h1, fill(d.lede, { v: V, mb: MB }))}
<section class="dl-sec"><div class="wrap">
  <div class="dl-grid">
    <article class="dl-card glass reveal" id="mac" data-os-card="mac">
      <span class="dl-ic">${ICON.apple}</span><h2>Mac</h2><p>${esc(d.macP)}</p>
      <a class="btn btn-brand big" href="${DL}${FILES.mac}">${esc(d.silicon)}</a>
      <a class="btn btn-glass" href="${DL}${FILES.macIntel}">${esc(d.intel)}</a>
      <details class="help"><summary>${esc(d.macHelpS)}</summary><p>${d.macHelpP}</p></details>
    </article>
    <article class="dl-card glass reveal" id="win" data-os-card="win">
      <span class="dl-ic">${ICON.win}</span><h2>Windows</h2><p>${esc(d.winP)}</p>
      <a class="btn btn-brand big" href="${DL}${FILES.win}">${esc(d.winBtn)}</a>
      <details class="help"><summary>${esc(d.winHelpS)}</summary><p>${d.winHelpP}</p></details>
    </article>
  </div>
  <div class="sizes glass reveal">
    <h3>${esc(d.sizesH)}</h3>
    <div class="size-row"><span>${esc(d.app)}</span><b>${esc(fill(d.appSize, { mb: MB }))}</b></div>
    <div class="size-row"><span>${esc(d.std)}</span><b>${esc(d.stdSize)}</b></div>
    <div class="size-row"><span>${esc(d.best)}</span><b>${esc(d.bestSize)}</b></div>
    <p class="muted">${esc(d.sizesP)}</p>
  </div>
  <details class="sums reveal"><summary>${esc(d.sums)}</summary>
    <code>${FILES.mac}<br>${sha(FILES.mac)}</code><code>${FILES.macIntel}<br>${sha(FILES.macIntel)}</code><code>${FILES.win}<br>${sha(FILES.win)}</code>
  </details>
  <p class="center reveal">${fill(d.source, { gh: SITE.github })}</p>
</div></section>`; };

const faq = (L) => `${pageHero(L, L.faqH, '')}
<section class="faq-sec"><div class="wrap narrow">${FAQ(L).map(([q, a]) => `<details class="qa glass reveal"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>
${endCta(L)}`;

const privacy = (L) => { const p = L.privacy; return `${pageHero(L, p.h1, p.lede)}
<section class="prose"><div class="wrap narrow glass reveal">
  ${p.sections.map(([h, txt]) => `<h2>${esc(h)}</h2>\n  <p>${txt}</p>`).join('\n  ')}
  <p class="muted">${esc(fill(p.updated, { date: L.date }))} ${esc(p.questions)} <a href="${SITE.studio}contact/">${esc(p.contact)}</a>.</p>
</div></section>`; };

const notfound = (L) => `<section class="page-hero"><div class="wrap center"><h1>${esc(L.nf.h1)}</h1><p class="lede">${esc(L.nf.p)}</p><div class="cta"><a class="btn btn-brand big" href="${SITE.base}">${esc(L.nf.home)}</a></div></div></section>`;

const PAGES = {
  index: [home, (L) => ({ ld: [{ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: L.html, mainEntity: FAQ(L).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] })],
  features: [features], download: [download], faq: [faq], privacy: [privacy],
};

// ---------- write ----------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const assets = path.join(here, 'assets');
const css = fs.readFileSync(path.join(assets, 'site.css'), 'utf8') + studioCss + fs.readFileSync(path.join(assets, 'studio-light.css'), 'utf8');
fs.writeFileSync(path.join(out, 'site.css'), css);
fs.copyFileSync(path.join(assets, 'site.js'), path.join(out, 'site.js'));
fs.copyFileSync(path.join(root, 'src', 'diff.js'), path.join(out, 'diff.js'));
fs.cpSync(path.join(assets, 'fonts'), path.join(out, 'fonts'), { recursive: true });
fs.cpSync(path.join(assets, 'img'), path.join(out, 'img'), { recursive: true });
const h = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 8);
const cssv = h(css), jsv = h(fs.readFileSync(path.join(assets, 'site.js'), 'utf8') + fs.readFileSync(path.join(root, 'src', 'diff.js'), 'utf8'));
for (const L of LANGS) {
  const dir = L.lang === 'en' ? out : path.join(out, L.lang);
  fs.mkdirSync(dir, { recursive: true });
  for (const [page, [fn, opt]] of Object.entries(PAGES)) {
    const [title, desc] = L.meta[page];
    fs.writeFileSync(path.join(dir, `${page}.html`), layout(L, page, fill(title, { v: V }), fill(desc, { v: V }), fn(L), { ...(opt ? opt(L) : {}), cssv, jsv }));
  }
}
fs.writeFileSync(path.join(out, '404.html'), layout(EN, '404', 'Not found · Writeshaper', 'Page not found.', notfound(EN), { cssv, jsv }));
const sm = [];
for (const p of Object.keys(PAGES)) for (const L of LANGS) sm.push(`  <url><loc>${urlOf(L, p)}</loc><lastmod>${UPDATED}</lastmod>${LANGS.map((a) => `<xhtml:link rel="alternate" hreflang="${a.html}" href="${urlOf(a, p)}"/>`).join('')}</url>`);
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sm.join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
fs.writeFileSync(path.join(out, 'llms.txt'), `# Writeshaper\n\n> Free, open-source, offline writing assistant for Mac and Windows by Hollowbit Studio. Select text in any app, press a shortcut, and it fixes mistakes or changes the tone (clearer, shorter, friendlier, professional), or translates. The writing model (Qwen, Apache 2.0) runs locally with llama.cpp; text is never uploaded.\n\n- [Download](${SITE.url}/download.html)\n- [Features](${SITE.url}/features.html)\n- [FAQ](${SITE.url}/faq.html)\n- [Privacy](${SITE.url}/privacy.html)\n- [Source code](${SITE.github})\n`);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`Built ${LANGS.length} languages x ${Object.keys(PAGES).length} pages into docs/ (installer ${MB} MB, checksums ${sha(FILES.mac).length === 64 ? 'ok' : 'MISSING'})`);

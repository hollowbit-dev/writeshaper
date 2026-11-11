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
const mb = (file) => { const p = path.join(root, 'dist', file); return fs.existsSync(p) ? Math.round(fs.statSync(p).size / 1e6) : 110; };
const sha = (file) => { const p = path.join(root, 'dist', file); return fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : 'build the installers to fill this in'; };

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
const NAV = [['features.html', 'Features'], ['faq.html', 'FAQ'], ['privacy.html', 'Privacy']];
function layout(page, title, desc, body, o = {}) {
  const canon = `${SITE.url}/${page === 'index' ? '' : `${page}.html`}`;
  const ld = [{
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Writeshaper', applicationCategory: 'ProductivityApplication',
    operatingSystem: 'macOS 12 or later, Windows 10, Windows 11', softwareVersion: V, description: desc,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, downloadUrl: `${SITE.url}/download.html`,
    publisher: { '@type': 'Organization', name: 'Hollowbit Studio', url: SITE.studio }, image: `${SITE.url}/img/og.png`,
  }, ...(o.ld || [])];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}"><meta property="og:image" content="${SITE.url}/img/og.png"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f4f3f8" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#121118" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${SITE.base}img/icon-64.png"><link rel="apple-touch-icon" href="${SITE.base}img/icon-256.png">
<link rel="preload" href="${SITE.base}fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${SITE.base}site.css?v=${o.cssv}">
<script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld)}</script>
</head>
<body class="p-${page}">
<div class="wash" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
<header class="nav">
  <div class="nav-in glass">
    <a class="logo" href="${SITE.base}"><img src="${SITE.base}img/icon-64.png" width="26" height="26" alt=""><span>Writeshaper</span></a>${studioPill('en')}
    <nav class="links" id="links">
      ${page === 'index' ? '<a href="#try">Try it</a>' : `<a href="${SITE.base}#try">Try it</a>`}
      ${NAV.map(([h, t]) => `<a href="${SITE.base}${h}"${page === h.replace('.html', '') ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
      <a class="btn btn-brand sm" href="${SITE.base}download.html">Download</a>
    </nav>
    <button class="menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="links">${ICON.menu}</button>
  </div>
</header>
<main>
${body}
</main>
<footer class="foot">
  <div class="wrap">
    ${studioCard('en', 'Writeshaper')}
    <div class="foot-grid">
      <div class="foot-brand"><a class="logo" href="${SITE.base}"><img src="${SITE.base}img/icon-64.png" width="26" height="26" alt=""><span>Writeshaper</span></a><p>Fix and polish your writing in any app, privately. Free and open source, for Mac and Windows.</p></div>
      <div><b>Product</b><a href="${SITE.base}#try">Try it</a><a href="${SITE.base}features.html">Features</a><a href="${SITE.base}download.html">Download</a><a href="${SITE.github}/releases">Changelog</a></div>
      <div><b>Help</b><a href="${SITE.base}faq.html">FAQ</a><a href="${SITE.base}privacy.html">Privacy</a><a href="${SITE.github}/issues">Report a problem</a></div>
      <div><b>Hollowbit</b><a href="${SITE.studio}">Studio</a><a href="${SITE.github}">GitHub</a><a href="${SITE.tip}">Support the studio</a></div>
    </div>
    <div class="foot-mark" aria-hidden="true">Writeshaper</div>
    <p class="foot-small">© 2026 Hollowbit Studio · MIT licence · Writeshaper runs open models (Qwen, Apache 2.0) with llama.cpp.</p>
  </div>
</footer>
<script src="${SITE.base}diff.js?v=${o.jsv}"></script>
<script src="${SITE.base}site.js?v=${o.jsv}" defer></script>
</body>
</html>`;
}

const dlButtons = (cls = 'cta') => `<div class="${cls}">
  <a class="btn btn-brand big" data-os="mac" href="${SITE.base}download.html#mac">${ICON.apple}Download for Mac</a>
  <a class="btn btn-glass big" data-os="win" href="${SITE.base}download.html#win">${ICON.win}Download for Windows</a>
</div>`;
const headline = (text, cls = '') => `<h1 class="split ${cls}">${text.split(' ').map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ')}</h1>`;

// ---------- the live demo ----------
const MODES = [['fix', 'Fix'], ['clear', 'Clearer'], ['short', 'Shorter'], ['friendly', 'Friendlier'], ['pro', 'Professional'], ['translate', 'Spanish']];
const demo = () => `
<section class="try" id="try">
  <div class="wrap">
    <div class="try-head reveal">
      <p class="eyebrow">Try it here</p>
      <h2>Pick a message. Press a button.</h2>
      <p class="lede">These are real answers from Writeshaper, made on a laptop with no internet. Choose an example, then try Fix, Shorter or Professional.</p>
    </div>
    <div class="samples reveal" role="tablist">
      ${DEMO.samples.map((s, i) => `<button role="tab" data-s="${i}"${i === 0 ? ' class="on" aria-selected="true"' : ''}>${esc(s.label)}</button>`).join('')}
    </div>
    <div class="stage reveal" id="stage">
      <div class="app-win">
        <div class="aw-bar"><i></i><i></i><i></i><span id="awApp">Mail</span></div>
        <div class="aw-meta" id="awMeta"></div>
        <div class="aw-text"><span class="aw-line" id="awLine"><span class="aw-sel" id="awSel"></span><span id="awWords"></span></span></div>
        <div class="aw-hint" id="awHint"><span class="kbd">⌥</span><span class="kbd">Space</span> <span>or press a button below</span></div>
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
    <p class="try-note reveal">${ICON.lock}This page doesn't send anything anywhere. The answers were made by Writeshaper's Best model and saved into the page. In the app, it works on whatever you write.</p>
  </div>
  <script type="application/json" id="demoData">${JSON.stringify(DEMO.samples).replace(/</g, '\\u003c')}</script>
</section>`;

// ---------- pages ----------
const APPS = ['Mail', 'Gmail', 'Outlook', 'Word', 'Google Docs', 'Pages', 'Notion', 'Slack', 'Discord', 'WhatsApp', 'Teams', 'LinkedIn', 'Notes', 'Obsidian', 'Messenger', 'Telegram'];
const FAQ = [
  ['Is Writeshaper really free?', 'Yes. No trial, no premium plan, no account and no ads. It is open source under the MIT licence. If it helps you, you can support the studio on Ko-fi, but you never have to.'],
  ['Does my writing get uploaded?', 'No. Writeshaper runs its writing model on your own computer. Your text never leaves it, not even to Hollowbit. The app only goes online to download the model once, and (unless you turn it off) to check GitHub once a day for a newer version.'],
  ['How big is it?', `The installer is about ${mb(FILES.mac)} MB. The first time you open it, Writeshaper downloads its writing model once: Standard is 1.9 GB, and Best is 2.7 GB if you want it to catch a little more. You can delete or switch models any time in Settings.`],
  ['Which apps does it work in?', 'Almost any app where you can select text: Mail, Gmail and Outlook in a browser, Word, Google Docs, Slack, Discord, WhatsApp, Notes and more. Select text, press the shortcut, and Replace pastes the new version back.'],
  ['Which languages does it understand?', 'Fix works in English and many other languages, including Spanish, French, German, Italian, Portuguese, Polish, Russian, Chinese and Japanese. Translate covers 20 languages.'],
  ['What computer do I need?', 'A Mac with Apple Silicon (M1 or newer) or an Intel Mac with macOS 12 or later, or a Windows 10 or 11 PC (64-bit). 8 GB of memory is enough. It is fastest on Apple Silicon and on PCs with a graphics card; on older PCs a fix takes a few seconds longer.'],
  ['Why does my Mac ask for Accessibility permission?', 'To copy the text you selected and paste the new version back, Writeshaper presses Copy and Paste for you. macOS asks you to allow that once. Writeshaper does nothing else with it.'],
  ['Does it write essays for me?', 'No. Writeshaper improves what you have already written: it fixes mistakes and adjusts the tone of your emails, messages and documents. It does not write from nothing.'],
];
const FEATURES = [
  ['keys', 'Works in every app', 'One shortcut over Mail, Word, Slack, a browser. Select, press, and Replace pastes it back.'],
  ['check', 'Fixes as you type', 'The Write tab underlines mistakes live and explains each fix. Accept one, or fix them all at once.'],
  ['spark', 'Change the tone', 'Clearer, shorter, friendlier or more professional, in one click. Or tell it what you want, like "make it a bullet list".'],
  ['globe', 'Translate', 'Turn a message into any of 20 languages, written the way a native speaker would.'],
  ['lock', 'Private by design', 'The model runs on your computer. Nothing you write is uploaded, stored or used to train anything.'],
  ['plane', 'Works offline', 'On a plane, on a train, with Wi-Fi off. After the first download it never needs the internet.'],
];
const home = () => `
<section class="hero">
  <div class="wrap center">
    <div class="reveal">${studioBadge('en')}</div>
    ${headline('Write clearly, <em>privately.</em>')}
    <p class="lede reveal">Writeshaper fixes and polishes your writing in any app. Select text, press a shortcut, done. It runs on your own computer, so nothing you write ever leaves it.</p>
    ${dlButtons('cta reveal')}
    <p class="small reveal">Free · No account · Mac and Windows · <a href="#try">Try it below</a></p>
  </div>
</section>
${demo()}
<section class="apps" aria-label="Works in">
  <p class="eyebrow center">Works where you already write</p>
  <div class="ticker"><div class="track">${[...APPS, ...APPS].map((a) => `<span>${a}</span>`).join('')}</div></div>
</section>
<section class="bento-sec">
  <div class="wrap">
    <div class="sec-head reveal"><p class="eyebrow">What it does</p><h2>Everything a writing assistant does. <span class="muted">Nothing it shouldn't.</span></h2></div>
    <div class="bento">
      <article class="tile t-live glass reveal">
        <div class="t-copy"><h3>Mistakes, underlined as you type</h3><p>The Write tab checks each sentence the moment you pause, and explains every fix.</p></div>
        <div class="live-demo" aria-hidden="true">
          <p class="ld-text"><span class="u">Their</span> going to announce the results next week, <span class="u">its</span> been a long <span class="u">proces</span>.</p>
          <div class="ld-cards"><div class="ld-card"><small>Grammar</small><span><s>Their</s> → <b>They're</b></span></div><div class="ld-card"><small>Spelling</small><span><s>its</s> → <b>it's</b></span></div><div class="ld-card"><small>Spelling</small><span><s>proces</s> → <b>process</b></span></div></div>
        </div>
      </article>
      <article class="tile t-tone glass reveal">
        <h3>One message, any tone</h3>
        <div class="tone" aria-hidden="true">
          <div class="tone-chips"><span class="on">Professional</span><span>Friendlier</span><span>Shorter</span></div>
          <p class="tone-text" data-tones="${esc(JSON.stringify([DEMO.samples[1].out.pro, DEMO.samples[1].out.friendly, DEMO.samples[1].out.short]))}">${esc(DEMO.samples[1].out.pro)}</p>
        </div>
      </article>
      <article class="tile t-private reveal">
        <div class="lockring" aria-hidden="true">${ICON.lock}</div>
        <h3>0 bytes uploaded</h3>
        <p>The writing model runs on your Mac or PC. Your emails, messages and documents stay there.</p>
      </article>
      ${FEATURES.slice(3).filter((f) => f[0] !== 'lock').concat([['free', 'Free, for real', 'No trial, no premium, no account. Paid writing assistants charge around £10 a month for this.']]).map(([ic, h, p]) => `<article class="tile t-small glass reveal"><span class="t-ic">${ICON[ic]}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('')}
    </div>
  </div>
</section>
<section class="steps-sec">
  <div class="wrap">
    <div class="sec-head center reveal"><p class="eyebrow">How it works</p><h2>Select. Press. Done.</h2></div>
    <div class="steps">
      <div class="step glass reveal"><span class="n">1</span><div class="s-vis sel" aria-hidden="true"><i></i><i></i><i class="hl"></i></div><h3>Select</h3><p>Highlight what you wrote, in any app.</p></div>
      <div class="step glass reveal"><span class="n">2</span><div class="s-vis keys" aria-hidden="true"><span class="kbd">⌥</span><span class="kbd">Space</span></div><h3>Press the shortcut</h3><p>The panel opens and fixes it instantly. <span class="muted">(Alt + Shift + Space on Windows.)</span></p></div>
      <div class="step glass reveal"><span class="n">3</span><div class="s-vis rep" aria-hidden="true"><i></i><i class="new"></i><i></i></div><h3>Replace</h3><p>Press Enter and the better version is pasted back.</p></div>
    </div>
  </div>
</section>
<section class="private-band">
  <div class="wrap">
    <p class="big-statement reveal-words">${'Most writing assistants send every word you type to their servers. Writeshaper does all its work on your own computer. Your words stay yours.'.split(' ').map((w) => `<span>${w}</span>`).join(' ')}</p>
  </div>
</section>
<section class="compare-sec">
  <div class="wrap narrow">
    <div class="sec-head center reveal"><h2>How it compares</h2></div>
    <div class="compare glass reveal">
      <div class="c-row c-head"><span></span><b>Writeshaper</b><b>Typical cloud assistant</b></div>
      <div class="c-row"><span>Price</span><b class="yes">Free</b><span>About £10 a month for the full version</span></div>
      <div class="c-row"><span>Account</span><b class="yes">None</b><span>Required</span></div>
      <div class="c-row"><span>Your text</span><b class="yes">Stays on your computer</b><span>Sent to their servers</span></div>
      <div class="c-row"><span>Works offline</span><b class="yes">Yes</b><span>No</span></div>
      <div class="c-row"><span>Open source</span><b class="yes">Yes</b><span>No</span></div>
    </div>
  </div>
</section>
<section class="faq-sec">
  <div class="wrap narrow">
    <div class="sec-head center reveal"><h2>Questions</h2></div>
    ${FAQ.slice(0, 4).map(([q, a]) => `<details class="qa glass reveal"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
    <p class="center reveal"><a class="more" href="${SITE.base}faq.html">All questions ${ICON.arrow}</a></p>
  </div>
</section>
${endCta()}`;

function endCta() {
  return `<section class="end">
  <div class="wrap center">
    <img class="end-icon reveal" src="${SITE.base}img/icon-256.png" width="112" height="112" alt="">
    <h2 class="reveal">Better writing, everywhere you type.</h2>
    <p class="lede reveal">Free for Mac and Windows. Installer about ${mb(FILES.mac)} MB, then a one-time 1.9 GB writing model.</p>
    ${dlButtons('cta reveal')}
  </div>
</section>`;
}

const pageHero = (h1, lead) => `<section class="page-hero"><div class="wrap center">${headline(h1)}${lead ? `<p class="lede reveal">${esc(lead)}</p>` : ''}</div></section>`;

const features = () => `${pageHero('Everything it does', 'A private writing assistant that lives in your menu bar or tray, works in every app, and never uploads a word.')}
<section class="feat-list"><div class="wrap">
  ${FEATURES.map(([ic, h, p], i) => `<article class="feat glass reveal"><span class="t-ic">${ICON[ic]}</span><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></article>`).join('')}
</div></section>
<section class="shots"><div class="wrap">
  <figure class="shot reveal"><img src="${SITE.base}img/app-write.webp" width="2240" height="1520" alt="The Write tab: mistakes underlined in the text, with a suggestion card for each one" loading="lazy"><figcaption>The Write tab checks as you type and explains each fix.</figcaption></figure>
  <figure class="shot reveal"><img src="${SITE.base}img/app-shortcut.webp" width="2240" height="1520" alt="The Shortcut tab showing how the panel works in any app" loading="lazy"><figcaption>The shortcut works over every app.</figcaption></figure>
  <figure class="shot reveal"><img src="${SITE.base}img/app-settings.webp" width="2240" height="1520" alt="Settings: shortcut, first action, translate language and writing model" loading="lazy"><figcaption>Pick your shortcut, what it does first, and your model.</figcaption></figure>
</div></section>
${endCta()}`;

const download = () => `${pageHero('Download Writeshaper', `Version ${V}. Free, no account. About ${mb(FILES.mac)} MB, then a one-time writing model download inside the app.`)}
<section class="dl-sec"><div class="wrap">
  <div class="dl-grid">
    <article class="dl-card glass reveal" id="mac" data-os-card="mac">
      <span class="dl-ic">${ICON.apple}</span><h2>Mac</h2><p>macOS 12 or later.</p>
      <a class="btn btn-brand big" href="${DL}${FILES.mac}">Apple Silicon (M1 or newer)</a>
      <a class="btn btn-glass" href="${DL}${FILES.macIntel}">Intel Mac</a>
      <details class="help"><summary>First time opening it?</summary><p>Writeshaper isn't from the App Store, so the first time, right-click Writeshaper in Applications and choose <b>Open</b>, then <b>Open</b> again. After that it opens normally. When you first use the shortcut, allow Writeshaper under System Settings → Privacy &amp; Security → Accessibility, so it can copy and paste for you.</p></details>
    </article>
    <article class="dl-card glass reveal" id="win" data-os-card="win">
      <span class="dl-ic">${ICON.win}</span><h2>Windows</h2><p>Windows 10 or 11, 64-bit.</p>
      <a class="btn btn-brand big" href="${DL}${FILES.win}">Download for Windows</a>
      <details class="help"><summary>Windows says it protected your PC?</summary><p>New apps from small studios show this until enough people have installed them. Click <b>More info</b>, then <b>Run anyway</b>. The installer also adds Microsoft's Visual C++ runtime if your PC doesn't have it yet.</p></details>
    </article>
  </div>
  <div class="sizes glass reveal">
    <h3>What gets downloaded</h3>
    <div class="size-row"><span>The app</span><b>about ${mb(FILES.mac)} MB</b></div>
    <div class="size-row"><span>Writing model, Standard (recommended)</span><b>1.9 GB, once</b></div>
    <div class="size-row"><span>Writing model, Best (optional)</span><b>2.7 GB, once</b></div>
    <p class="muted">The model downloads inside the app the first time you open it, and can be paused and resumed. It comes from Hugging Face, pinned to an exact version and checked with SHA-256.</p>
  </div>
  <details class="sums reveal"><summary>SHA-256 checksums</summary>
    <code>${FILES.mac}<br>${sha(FILES.mac)}</code><code>${FILES.macIntel}<br>${sha(FILES.macIntel)}</code><code>${FILES.win}<br>${sha(FILES.win)}</code>
  </details>
  <p class="center reveal">Open source: <a href="${SITE.github}">read the code on GitHub</a>.</p>
</div></section>`;

const faq = () => `${pageHero('Questions', '')}
<section class="faq-sec"><div class="wrap narrow">${FAQ.map(([q, a]) => `<details class="qa glass reveal"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>
${endCta()}`;

const privacy = () => `${pageHero('Privacy', 'Short version: your writing never leaves your computer.')}
<section class="prose"><div class="wrap narrow glass reveal">
  <h2>What Writeshaper does with your text</h2>
  <p>It reads the text you select or type, sends it to the writing model running on your own computer (a program called llama.cpp that only listens on your machine), and shows you the result. The text is not saved to disk, not logged and not sent anywhere.</p>
  <h2>When Writeshaper uses the internet</h2>
  <p><b>Once, to download the writing model</b> from Hugging Face when you ask it to. <b>Once a day, to check GitHub</b> for a newer version number, unless you turn this off in Settings. Neither request includes anything you wrote or anything about you.</p>
  <h2>Your clipboard</h2>
  <p>To grab your selection and paste the result, Writeshaper uses the clipboard for a moment and then puts back what was on it before.</p>
  <h2>This website</h2>
  <p>No cookies, no analytics, no trackers. The demo on the home page plays answers saved into the page; nothing you do on it is sent anywhere.</p>
  <p class="muted">Updated ${UPDATED}. Questions: <a href="${SITE.studio}contact/">contact Hollowbit Studio</a>.</p>
</div></section>`;

const notfound = () => `<section class="page-hero"><div class="wrap center"><h1>Page not found</h1><p class="lede">That page doesn't exist. Maybe it moved.</p><div class="cta"><a class="btn btn-brand big" href="${SITE.base}">Go to Writeshaper</a></div></div></section>`;

const PAGES = {
  index: ['Writeshaper: fix your writing in any app, privately', 'Free, offline writing assistant for Mac and Windows. Fix mistakes and change the tone in any app with one shortcut. Nothing you write leaves your computer.', home, { ld: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] }],
  features: ['Features · Writeshaper', 'Fix mistakes as you type, change the tone in one click, translate, all offline and private. Free for Mac and Windows.', features],
  download: ['Download · Writeshaper', `Download Writeshaper ${V} for Mac and Windows. Free, no account.`, download],
  faq: ['FAQ · Writeshaper', 'Answers about Writeshaper: price, privacy, size, languages, apps and system requirements.', faq],
  privacy: ['Privacy · Writeshaper', 'Writeshaper never uploads your writing. Here is exactly when it goes online, and why.', privacy],
  404: ['Not found · Writeshaper', 'Page not found.', notfound],
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
for (const [page, [title, desc, fn, o = {}]] of Object.entries(PAGES)) {
  fs.writeFileSync(path.join(out, `${page}.html`), layout(page, title, desc, fn(), { ...o, cssv, jsv }));
}
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(PAGES).filter((p) => p !== '404').map((p) => `  <url><loc>${SITE.url}/${p === 'index' ? '' : `${p}.html`}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
fs.writeFileSync(path.join(out, 'llms.txt'), `# Writeshaper\n\n> Free, open-source, offline writing assistant for Mac and Windows by Hollowbit Studio. Select text in any app, press a shortcut, and it fixes mistakes or changes the tone (clearer, shorter, friendlier, professional), or translates. The writing model (Qwen, Apache 2.0) runs locally with llama.cpp; text is never uploaded.\n\n- [Download](${SITE.url}/download.html)\n- [Features](${SITE.url}/features.html)\n- [FAQ](${SITE.url}/faq.html)\n- [Privacy](${SITE.url}/privacy.html)\n- [Source code](${SITE.github})\n`);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`Built ${Object.keys(PAGES).length} pages into docs/`);

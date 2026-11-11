// Website screenshots. Needs: a server on :8771 whose /writeshaper/ is docs/.
import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('.shots/site', { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const scheme = process.argv[2] || 'light';
const base = 'http://localhost:8771/writeshaper/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
for (const [name, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: scheme });
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await p.goto(base); await wait(1600);
  await p.screenshot({ path: `.shots/site/${scheme}-${name}-hero.png` });
  await p.evaluate(() => document.querySelector('#try').scrollIntoView()); await wait(1400);
  await p.screenshot({ path: `.shots/site/${scheme}-${name}-demo-stream.png` });
  await wait(2600);
  await p.screenshot({ path: `.shots/site/${scheme}-${name}-demo.png` });
  await p.click('#pModes [data-m="pro"]'); await wait(2400);
  await p.screenshot({ path: `.shots/site/${scheme}-${name}-demo-pro.png` });
  // Scroll through the page so reveals run, then capture the full page.
  for (let y = 0; y < 12000; y += 600) { await p.evaluate((y) => scrollTo(0, y), y); await wait(120); }
  await wait(800);
  await p.screenshot({ path: `.shots/site/${scheme}-${name}-full.png`, fullPage: true });
  for (const pg of ['download', 'faq']) { await p.goto(base + pg + '.html'); await wait(1300); await p.screenshot({ path: `.shots/site/${scheme}-${name}-${pg}.png` }); }
  await p.close();
}
await b.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');

// Renders the 1200x630 social preview image (site/assets/img/og.png).
import { chromium } from 'playwright';
import fs from 'fs';
const icon = fs.readFileSync('site/assets/img/icon-256.png').toString('base64');
const font = fs.readFileSync('site/assets/fonts/Geist-Variable.woff2').toString('base64');
const html = `<html><head><style>
@font-face{font-family:G;src:url(data:font/woff2;base64,${font})}
body{margin:0;width:1200px;height:630px;font-family:G;color:#17161d;display:flex;flex-direction:column;justify-content:center;padding:0 90px;box-sizing:border-box;overflow:hidden;
background:radial-gradient(60% 80% at 0% 0%,rgba(255,159,77,.35),transparent 60%),radial-gradient(60% 80% at 100% 10%,rgba(249,69,127,.3),transparent 60%),radial-gradient(70% 70% at 60% 120%,rgba(127,84,248,.3),transparent 60%),#f4f3f8}
.top{display:flex;align-items:center;gap:22px;margin-bottom:40px}.top img{width:84px;height:84px}.top span{font-size:40px;font-weight:700;letter-spacing:-.03em}
h1{font-size:84px;letter-spacing:-.055em;line-height:1;margin:0 0 30px;font-weight:760}
em{font-style:normal;background:linear-gradient(120deg,#ff9f4d,#f9457f 52%,#7f54f8);-webkit-background-clip:text;color:transparent}
.card{display:inline-block;padding:18px 24px;border-radius:22px;background:rgba(255,255,255,.75);box-shadow:inset 0 1px 0 #fff,0 20px 50px rgba(25,18,60,.12);font-size:27px;line-height:1.5}
s{color:#e23a63;opacity:.75}b{color:#1a9f56;background:rgba(31,183,99,.13);border-radius:6px;padding:0 3px}
</style></head><body><div class="top"><img src="data:image/png;base64,${icon}"><span>Writeshaper</span></div>
<h1>Write clearly, <em>privately.</em></h1>
<div class="card"><s>Their</s> <b>They're</b> going to love it, <s>its</s> <b>it's</b> free and offline.</div></body></html>`;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html); await p.waitForTimeout(300);
await p.screenshot({ path: 'site/assets/img/og.png' });
await b.close();
console.log('og.png written');

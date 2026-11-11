// Downloads the Standard model through the app: pauses part-way, resumes, and checks the SHA-256.
import { _electron as electron } from 'playwright';
import fs from 'fs'; import os from 'os'; import path from 'path';
const data = process.env.DL_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'ws-dl-'));
fs.writeFileSync(path.join(data, 'writeshaper.json'), JSON.stringify({ onboarded: false, autoUpdate: false }));
const app = await electron.launch({ args: ['.'], env: { ...process.env, WRITESHAPER_DATA: data } });
let main; for (let i = 0; i < 100 && !main; i++) { main = app.windows().find((w) => w.url().endsWith('index.html')); await new Promise((r) => setTimeout(r, 100)); }
await main.waitForSelector('#dlStart');
await main.click('#dlStart');
await main.waitForSelector('#dl:not([hidden])');
for (;;) { const t = await main.textContent('#dlPct'); if (parseInt(t) >= 5) break; await new Promise((r) => setTimeout(r, 300)); }
console.log('paused at', await main.textContent('#dlPct'), '·', await main.textContent('#dlInfo'));
await main.click('#dlCancel');
await main.waitForSelector('#dlStart:not([hidden])', { state: 'attached' });
console.log('resume button:', await main.textContent('#dlStart'));
await main.click('#dlStart');
await main.waitForSelector('#stepModel.done', { state: 'attached', timeout: 900000 });
await main.waitForSelector('#engine.ready', { state: 'attached', timeout: 60000 });
console.log('✓ downloaded, verified, engine ready:', await main.textContent('#stepModel p'));
await app.close();
console.log(data);

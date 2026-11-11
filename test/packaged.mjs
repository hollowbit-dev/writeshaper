// The built Mac app starts, finds its bundled engine and loads the model.
import { _electron as electron } from 'playwright';
import fs from 'fs'; import os from 'os'; import path from 'path';
const exe = path.resolve(`dist/mac-${process.arch === 'arm64' ? 'arm64' : ''}`.replace(/-$/, ''), 'Writeshaper.app/Contents/MacOS/Writeshaper');
const models = path.join(os.homedir(), 'Library/Application Support/Writeshaper/models');
if (!fs.existsSync(exe) || !fs.existsSync(models)) { console.log('skip: no build or model'); process.exit(0); }
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-pkg-'));
fs.symlinkSync(models, path.join(data, 'models'));
fs.writeFileSync(path.join(data, 'writeshaper.json'), JSON.stringify({ onboarded: true, autoUpdate: false }));
const app = await electron.launch({ executablePath: exe, env: { ...process.env, WRITESHAPER_DATA: data } });
let main; for (let i = 0; i < 100 && !main; i++) { main = app.windows().find((w) => w.url().endsWith('index.html')); await new Promise((r) => setTimeout(r, 100)); }
await main.waitForSelector('#engine.ready', { timeout: 60000 });
console.log('✓ packaged app: engine ready (' + (await main.textContent('#engineText')) + ')');
await app.close();

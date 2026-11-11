// Runs the real Standard model on the website demo's examples and saves the answers to site/demo-data.json.
// The website demo replays these, so visitors see exactly what the app writes.
import { createRequire } from 'module'; import os from 'os'; import path from 'path'; import fs from 'fs';
const require = createRequire(import.meta.url);
const engine = require('../src/engine.js');
const model = path.join(os.homedir(), 'Library/Application Support/Writeshaper/models', process.env.MODEL || 'Qwen3.5-4B-Q4_K_M.gguf');
const SAMPLES = [
  { id: 'email', label: 'Email to a manager', app: 'Mail', to: 'sarah.lee@company.com', subject: 'Report', text: 'hi sarah, sorry for the late reply, i was abit busy this week. i will send you the report by friday, let me know if theres anything else you need from me' },
  { id: 'friend', label: 'Message to a friend', app: 'Messages', to: 'Maya', text: 'hey!! are we still on for saturday? i cant remember what time we said, was it 7 or 8. also do you want me to bring anything' },
  { id: 'landlord', label: 'Note to a landlord', app: 'Mail', to: 'lettings@homes.co', subject: 'Heating', text: 'Hello, the heating in my apartment has stoped working since monday and its getting really cold at night, could someone come and have a look at it as soon as posible? Im home most evenings after 6.' },
  { id: 'job', label: 'Job application', app: 'Mail', to: 'jobs@northcafe.com', subject: 'Barista position', text: 'Hi, Im writing to apply for the barista position. I have two years experiance working in a busy cafe, im fast, friendly and I love making coffee. I can start whenever suits you.' },
];
const MODES = ['fix', 'clear', 'short', 'friendly', 'pro', 'translate'];
await engine.start({ isPackaged: false }, model);
const out = { model: process.env.MODEL ? 'Standard' : 'Best', made: new Date().toISOString().slice(0, 10), samples: [] };
for (const s of SAMPLES) {
  const r = { ...s, out: {} };
  for (const m of MODES) {
    r.out[m] = await engine.rewrite({ mode: m, text: s.text, extra: m === 'translate' ? 'Spanish' : '' }, () => {}).done;
    console.log(`${s.id}/${m}: ${r.out[m]}`);
  }
  out.samples.push(r);
}
engine.stop();
fs.writeFileSync(new URL('./demo-data.json', import.meta.url), JSON.stringify(out, null, 1));

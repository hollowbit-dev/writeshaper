// Engine check with the real model: starts llama-server, runs every mode, checks the answers.
import { createRequire } from 'module';
import os from 'os'; import path from 'path'; import fs from 'fs';
const require = createRequire(import.meta.url);
const engine = require('../src/engine.js');
const { changes } = require('../src/diff.js');
const model = path.join(os.homedir(), 'Library/Application Support/Writeshaper/models', process.env.MODEL || 'Qwen3.5-4B-UD-IQ3_XXS.gguf');
if (!fs.existsSync(model)) { console.log('skip: no model downloaded'); process.exit(0); }
const app = { isPackaged: false };
let fail = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
let t = Date.now();
await engine.start(app, model);
ok(engine.running(), `engine starts (${((Date.now() - t) / 1000).toFixed(1)}s)`);
const run = async (mode, text, extra) => { const t0 = Date.now(); let n = 0; const j = engine.rewrite({ mode, text, extra }, () => n++); const out = await j.done; return { out, n, s: ((Date.now() - t0) / 1000).toFixed(1) }; };

let r = await run('fix', 'Their going to announce the results next week, its been a long proces but I think everyone done there best.');
ok(/They're|They’re/.test(r.out) && /process/.test(r.out) && /their best/.test(r.out), `fix: ${r.s}s, ${r.n} chunks: ${r.out}`);
ok(changes('Their going to announce', r.out.slice(0, 30)).length >= 1, 'fix gives suggestions');
r = await run('fix', 'This sentence is already correct.');
ok(r.out.trim() === 'This sentence is already correct.', `fix leaves correct text alone: ${r.out}`);
r = await run('fix', '  hello world  \n');
ok(r.out.startsWith('  ') && r.out.endsWith('  \n'), 'fix keeps surrounding whitespace');
r = await run('pro', 'hey can u send me the file asap thx');
ok(r.out.length > 20 && !/^here/i.test(r.out), `pro: ${r.s}s: ${r.out}`);
r = await run('translate', 'Good morning, how are you?', 'Spanish');
ok(/buen/i.test(r.out), `translate: ${r.s}s: ${r.out}`);
r = await run('ask', 'We have three options: red, green, blue.', 'make it a bullet list');
ok(/^[-•*]/m.test(r.out), `ask: ${r.s}s: ${JSON.stringify(r.out)}`);
const j = engine.rewrite({ mode: 'clear', text: 'a '.repeat(400) }, () => {});
setTimeout(() => j.cancel(), 300);
try { await j.done; ok(false, 'cancel'); } catch (e) { ok(e.name === 'AbortError', 'cancel stops a rewrite'); }
engine.stop();
console.log(fail ? `${fail} failed` : 'all passed');
process.exit(fail ? 1 : 0);

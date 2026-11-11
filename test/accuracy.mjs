// Accuracy check: each sentence has mistakes; the fix must contain every expected word and none of the wrong ones.
import { createRequire } from 'module'; import os from 'os'; import path from 'path';
const require = createRequire(import.meta.url);
const engine = require('../src/engine.js');
const model = path.join(os.homedir(), 'Library/Application Support/Writeshaper/models', process.env.MODEL || 'Qwen3.5-4B-UD-IQ3_XXS.gguf');
const CASES = [
  ['Their going to the park later.', ["They're|They’re"], ['Their going']],
  ['I think its a good idea.', ["it's|it’s"], [' its ']],
  ['We should of left earlier.', ['should have'], ['should of']],
  ['Your welcome to join us.', ["You're|You’re"], ['Your welcome']],
  ['He is more taller then his brother.', ['than'], ['then his', 'more taller']],
  ['i will send it tomorow.', ['I will', 'tomorrow'], ['tomorow']],
  ['She dont like coffee.', ["doesn't|doesn’t|does not"], ['dont']],
  ['The informations are on the website.', ['information is'], ['informations']],
  ['I recieved your message yesterday.', ['received'], ['recieved']],
  ['We was late for the begining of the show.', ['were', 'beginning'], ['We was', 'begining']],
  ['Can you send me the file, thanks.', ['file'], []],
  ['Ayer fuimos a la playa y hacia mucho calor.', ['hacía'], []],
];
await engine.start({ isPackaged: false }, model);
let pass = 0;
for (const [text, want, bad] of CASES) {
  const out = await engine.rewrite({ mode: 'fix', text }, () => {}).done;
  const ok = want.every((w) => new RegExp(w).test(out)) && bad.every((b) => !out.includes(b));
  if (ok) pass++;
  console.log((ok ? '✓ ' : '✗ ') + text + '  →  ' + out);
}
engine.stop();
console.log(`${pass}/${CASES.length} (${path.basename(model)})`);

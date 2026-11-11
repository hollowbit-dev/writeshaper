// The writing engine: runs llama.cpp's server on this computer, on a free local port,
// and streams rewrites from it. Nothing leaves the machine; the server only listens on 127.0.0.1.
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');
const { prompt } = require('./prompts');

let proc = null;
let port = 0;
let modelFile = null;
let starting = null;
let lastError = '';

function serverDir(app) {
  const plat = process.platform === 'win32' ? 'win32-x64' : `darwin-${process.arch}`;
  return app.isPackaged
    ? path.join(process.resourcesPath, 'llama')
    : path.join(__dirname, '..', 'vendor', 'llama', plat);
}

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.unref();
  s.on('error', reject);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
});

async function waitHealthy(p, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (!proc) throw new Error(lastError || 'The writing engine stopped while starting.');
    try {
      const r = await fetch(`http://127.0.0.1:${p}/health`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('The writing engine took too long to start.');
}

// Start (or restart with another model). Resolves once the model is loaded.
async function start(app, file) {
  if (proc && modelFile === file) return starting || Promise.resolve();
  stop();
  modelFile = file;
  starting = (async () => {
    const dir = serverDir(app);
    const exe = path.join(dir, process.platform === 'win32' ? 'llama-server.exe' : 'llama-server');
    if (!fs.existsSync(exe)) throw new Error('The writing engine is missing. Please reinstall Writeshaper.');
    port = await freePort();
    const args = [
      '-m', file, '--host', '127.0.0.1', '--port', String(port),
      '-c', '8192', '--parallel', '2', '-ngl', '99',
      '--reasoning-budget', '0', '--no-webui', '--log-disable',
    ];
    lastError = '';
    proc = spawn(exe, args, { cwd: dir, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    proc.stderr.on('data', (d) => { lastError = (lastError + d.toString()).slice(-2000); });
    const me = proc;
    proc.on('exit', () => { if (proc === me) { proc = null; starting = null; } });
    await waitHealthy(port, 120000);
  })();
  try { await starting; } catch (e) { stop(); throw e; }
  return starting;
}

function stop() {
  if (proc) { try { proc.kill(); } catch { /* gone */ } }
  proc = null; starting = null; modelFile = null;
}

const running = () => !!proc;

// Streams the rewrite. onText gets the whole text so far. Returns { text, cancel }.
function rewrite({ mode, text, extra }, onText) {
  const ctrl = new AbortController();
  const done = (async () => {
    if (starting) await starting;
    if (!proc) throw new Error('The writing engine is not running.');
    const { system, user } = prompt(mode, text, extra);
    const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: mode === 'fix' ? 0.1 : mode === 'translate' ? 0.15 : mode === 'friendly' ? 0.5 : 0.3,
        top_p: 0.9,
        max_tokens: Math.min(4096, Math.ceil(text.length / 2) + 256),
        stream: true,
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
    if (!res.ok) throw new Error(`The writing engine said ${res.status}.`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', out = '';
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const d = JSON.parse(data).choices?.[0]?.delta?.content;
          if (d) { out += d; onText(clean(out, text)); }
        } catch { /* partial line */ }
      }
    }
    return clean(out, text, true);
  })();
  return { done, cancel: () => ctrl.abort() };
}

// Small models sometimes wrap the answer in quotes or a code fence, or add a lead-in. Strip those.
function clean(out, original, final) {
  let s = out.replace(/^\s*<think>[\s\S]*?<\/think>\s*/, '');
  s = s.replace(/^\s*(here(?:'s| is) (?:the |your )?(?:corrected|rewritten|improved|revised|translated)[^:\n]*:\s*)/i, '');
  s = s.replace(/^```[a-z]*\n?/, '');
  if (final) {
    s = s.replace(/\n?```\s*$/, '');
    // Paste-back safety: drop a subject line, a sign-off or [placeholders] the user didn't write.
    if (!/^\s*subject\s*:/i.test(original)) s = s.replace(/^\s*subject\s*:[^\n]*\n+/i, '');
    if (!/\[[^\]]*\]/.test(original)) s = s.replace(/\n+\s*\[[^\]\n]*(name|signature|your)[^\]\n]*\]\s*$/i, '');
    if (!/(regards|sincerely|best wishes|kind regards|cheers),?\s*$/i.test(original.trim())) s = s.replace(/\n+\s*(best regards|kind regards|warm regards|best wishes|sincerely|regards),?\s*$/i, '');
    const q = /^["“](.*)["”]$/s.exec(s.trim());
    if (q && !/^["“]/.test(original.trim())) s = q[1];
    // Keep the user's surrounding whitespace, so a replaced line keeps its line break.
    const lead = /^\s*/.exec(original)[0], trail = /\s*$/.exec(original)[0];
    s = lead + s.trim() + trail;
  }
  return s;
}

module.exports = { start, stop, running, rewrite, clean };

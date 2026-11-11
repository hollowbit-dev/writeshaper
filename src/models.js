// The writing models. One is downloaded from Hugging Face the first time the user starts Writeshaper,
// pinned to an exact version and checked with SHA-256. Big downloads resume if the connection drops.
const { net } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MODELS = [
  {
    id: 'standard', name: 'Standard', file: 'Qwen3.5-4B-UD-IQ3_XXS.gguf', size: 1949047968,
    sha256: '00aab66a2359a9afc52f0ab757e61f9be1656e6fcaba8468bd95579a8b2cbc40',
    url: 'https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/e87f176479d0855a907a41277aca2f8ee7a09523/Qwen3.5-4B-UD-IQ3_XXS.gguf',
  },
  {
    id: 'best', name: 'Best', file: 'Qwen3.5-4B-Q4_K_M.gguf', size: 2740937888,
    sha256: '00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4',
    url: 'https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/e87f176479d0855a907a41277aca2f8ee7a09523/Qwen3.5-4B-Q4_K_M.gguf',
  },
];

function createModels(app, onProgress) {
  const dir = () => path.join(app.getPath('userData'), 'models');
  const fileOf = (m) => path.join(dir(), m.file);
  const downloads = new Map();

  const installed = (m) => { try { return fs.statSync(fileOf(m)).size === m.size; } catch { return false; } };

  function list() {
    return MODELS.map((m) => {
      let have = 0;
      try { have = fs.statSync(fileOf(m) + '.part').size; } catch { /* none */ }
      return { id: m.id, name: m.name, size: m.size, installed: installed(m), downloading: downloads.has(m.id), partial: have };
    });
  }

  async function download(id) {
    const m = MODELS.find((x) => x.id === id);
    if (!m || downloads.has(id) || installed(m)) return;
    const ctrl = new AbortController();
    downloads.set(id, ctrl);
    const part = fileOf(m) + '.part';
    fs.mkdirSync(dir(), { recursive: true });
    const started = Date.now();
    let startHave = 0;
    try {
      for (let attempt = 0; ; attempt++) {
        let have = 0;
        try { have = fs.statSync(part).size; } catch { /* fresh */ }
        if (attempt === 0) startHave = have;
        if (have >= m.size) break;
        try {
          const res = await net.fetch(m.url, { signal: ctrl.signal, headers: have ? { Range: `bytes=${have}-` } : {} });
          if (!res.ok && res.status !== 206) throw new Error(`Download failed (${res.status}).`);
          if (have && res.status !== 206) { fs.rmSync(part, { force: true }); have = 0; }
          const out = fs.createWriteStream(part, { flags: have ? 'a' : 'w' });
          const reader = res.body.getReader();
          let last = 0;
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            if (!out.write(Buffer.from(value))) await new Promise((r) => out.once('drain', r));
            have += value.length;
            const now = Date.now();
            if (now - last > 120) {
              last = now;
              const secs = (now - started) / 1000;
              const rate = (have - startHave) / Math.max(secs, 0.5);
              onProgress({ id, have, size: m.size, rate, eta: rate > 0 ? (m.size - have) / rate : 0 });
            }
          }
          await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
          if (have >= m.size) break;
        } catch (e) {
          if (ctrl.signal.aborted) throw e;
          if (attempt >= 6) throw e;
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
      onProgress({ id, have: m.size, size: m.size, verifying: true });
      const hash = crypto.createHash('sha256');
      await new Promise((r, j) => fs.createReadStream(part).on('data', (d) => hash.update(d)).on('end', r).on('error', j));
      if (hash.digest('hex') !== m.sha256) { fs.rmSync(part, { force: true }); throw new Error('The download was damaged. Please try again.'); }
      fs.renameSync(part, fileOf(m));
      onProgress({ id, done: true });
    } catch (e) {
      // A cancelled download keeps its .part file, so the next try carries on from there.
      onProgress({ id, error: ctrl.signal.aborted ? null : (e.message || String(e)), cancelled: ctrl.signal.aborted });
    } finally {
      downloads.delete(id);
    }
  }

  const cancel = (id) => { const c = downloads.get(id); if (c) c.abort(); };
  const remove = (id) => { const m = MODELS.find((x) => x.id === id); if (m) { fs.rmSync(fileOf(m), { force: true }); fs.rmSync(fileOf(m) + '.part', { force: true }); } };
  const pathFor = (id) => { const m = MODELS.find((x) => x.id === id); return m && installed(m) ? fileOf(m) : null; };

  return { list, download, cancel, remove, pathFor };
}

module.exports = { createModels, MODELS };

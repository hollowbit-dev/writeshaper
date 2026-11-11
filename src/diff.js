// Word-level diff between the original text and the rewrite, used to highlight what changed
// and to turn a "fix" into separate suggestions the user can accept one by one.
// Works in Node (require) and in the browser (window.WSDiff).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WSDiff = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // Words and the spaces/punctuation between them are separate tokens, so "its" -> "it's" is one change.
  const tokenize = (s) => s.match(/[\p{L}\p{N}'’_-]+|\s+|[^\s\p{L}\p{N}]/gu) || [];

  // Myers-style LCS on tokens. Texts here are a few hundred words, so O(n*m) with a cap is fine.
  // fold: join changes separated only by a space or comma into one (easier to read; used for display).
  function diff(a, b, fold = true) {
    const A = tokenize(a), B = tokenize(b);
    const n = A.length, m = B.length;
    if (n * m > 4e6) return [{ op: 'del', text: a }, { op: 'ins', text: b }];
    // Trim common head and tail first: most fixes touch a few words.
    let h = 0; while (h < n && h < m && A[h] === B[h]) h++;
    let t = 0; while (t < n - h && t < m - h && A[n - 1 - t] === B[m - 1 - t]) t++;
    const a2 = A.slice(h, n - t), b2 = B.slice(h, m - t);
    const N = a2.length, M = b2.length;
    const L = Array.from({ length: N + 1 }, () => new Uint16Array(M + 1));
    for (let i = N - 1; i >= 0; i--) for (let j = M - 1; j >= 0; j--) {
      L[i][j] = a2[i] === b2[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
    const out = [];
    const push = (op, text) => { const last = out[out.length - 1]; if (last && last.op === op) last.text += text; else out.push({ op, text }); };
    if (h) push('eq', A.slice(0, h).join(''));
    let i = 0, j = 0;
    while (i < N || j < M) {
      if (i < N && j < M && a2[i] === b2[j]) { push('eq', a2[i]); i++; j++; }
      else if (j < M && (i >= N || L[i][j + 1] >= L[i + 1][j])) { push('ins', b2[j]); j++; }
      else { push('del', a2[i]); i++; }
    }
    if (t) push('eq', A.slice(n - t).join(''));
    return merge(out, fold);
  }

  // A short run of unchanged text (a space, a comma) between two changes reads badly
  // ("[hey] Hey [john] John"): fold it in, then turn every run of changes into one del + one ins.
  function merge(ops, fold) {
    const r = [];
    for (let k = 0; k < ops.length; k++) {
      const o = ops[k];
      const between = o.op === 'eq' && r.length && r[r.length - 1].op !== 'eq' && ops[k + 1] && ops[k + 1].op !== 'eq';
      if (fold && between && /^[\s,.;:'’"-]{1,2}$/.test(o.text)) { r.push({ op: 'del', text: o.text }, { op: 'ins', text: o.text }); continue; }
      r.push({ ...o });
    }
    const out = [];
    for (let k = 0; k < r.length;) {
      if (r[k].op === 'eq') { out.push(r[k]); k++; continue; }
      let del = '', ins = '';
      while (k < r.length && r[k].op !== 'eq') { if (r[k].op === 'del') del += r[k].text; else ins += r[k].text; k++; }
      // Keep shared leading/trailing spaces outside the change.
      let lead = '';
      while (del && ins && del[0] === ins[0] && /\s/.test(del[0])) { lead += del[0]; del = del.slice(1); ins = ins.slice(1); }
      let trail = '';
      while (del && ins && del[del.length - 1] === ins[ins.length - 1] && /\s/.test(del[del.length - 1])) { trail = del[del.length - 1] + trail; del = del.slice(0, -1); ins = ins.slice(0, -1); }
      if (lead) out.push({ op: 'eq', text: lead });
      if (del) out.push({ op: 'del', text: del });
      if (ins) out.push({ op: 'ins', text: ins });
      if (trail) out.push({ op: 'eq', text: trail });
    }
    const joined = [];
    for (const o of out) { const l = joined[joined.length - 1]; if (l && l.op === o.op) l.text += o.text; else joined.push(o); }
    return joined;
  }

  // For text that is still streaming in: the part of the original the rewrite hasn't reached yet
  // is returned as `rest` (shown greyed), not as deleted. The last, possibly half-written word is compared
  // as plain new text so it doesn't break the match.
  function stream(a, partial) {
    const cut = partial.search(/[\p{L}\p{N}'’]+$/u);
    const head = cut > 0 ? partial.slice(0, cut) : cut === 0 ? '' : partial;
    const tail = cut >= 0 ? partial.slice(cut) : '';
    const ops = diff(a, head, false);
    let last = -1;
    for (let k = ops.length - 1; k >= 0; k--) if (ops[k].op === 'eq') { last = k; break; }
    const keep = ops.slice(0, last + 1);
    const after = ops.slice(last + 1);
    const reached = keep.filter((o) => o.op !== 'ins').reduce((n, o) => n + o.text.length, 0);
    const ins = after.filter((o) => o.op === 'ins').map((o) => o.text).join('');
    if (ins) keep.push({ op: 'ins', text: ins });
    let rest = a.slice(reached);
    // A half-written word that matches the original so far is shown as plain text, not as a change.
    if (tail && !ins && rest.startsWith(tail)) { keep.push({ op: 'eq', text: tail }); rest = rest.slice(tail.length); }
    else if (tail) keep.push({ op: 'ins', text: tail });
    const out = [];
    for (const o of keep) { const l = out[out.length - 1]; if (l && l.op === o.op) l.text += o.text; else out.push(o); }
    return { ops: out, rest };
  }

  // Share of the original that changed (0..1): above ~0.4 a marked-up diff is harder to read than the new text.
  function changedShare(a, b) {
    const ops = diff(a, b);
    const del = ops.filter((o) => o.op === 'del').reduce((n, o) => n + o.text.length, 0);
    return a.length ? del / a.length : 1;
  }

  // Group a diff into suggestions: each has the original range [start, end) and the replacement.
  function changes(a, b) {
    const ops = diff(a, b, false);
    const list = [];
    let pos = 0, cur = null;
    for (const o of ops) {
      if (o.op === 'eq') { if (cur) { list.push(cur); cur = null; } pos += o.text.length; continue; }
      if (!cur) cur = { start: pos, end: pos, from: '', to: '' };
      if (o.op === 'del') { cur.from += o.text; cur.end += o.text.length; pos += o.text.length; }
      else cur.to += o.text;
    }
    if (cur) list.push(cur);
    // Whitespace-only changes are noise for a suggestion list.
    return list.filter((c) => c.from.trim() || c.to.trim()).map((c) => ({ ...c, kind: kind(c) }));
  }

  function kind(c) {
    const f = c.from.trim(), t = c.to.trim();
    if (!f) return 'add';
    if (!t) return 'remove';
    if (f.toLowerCase() === t.toLowerCase()) return 'case';
    if (/^[^\p{L}\p{N}]+$/u.test(f + t)) return 'punct';
    return 'word';
  }

  return { tokenize, diff, changes, changedShare, stream };
});

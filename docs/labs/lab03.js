/* ===== Lab 03 interactivity ===== */

const SVG_NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
  if (parent) parent.appendChild(e);
  return e;
}
function txt(parent, x, y, s, cls = 'tick', anchor = 'start', extra = {}) {
  const t = el('text', { x, y, class: cls, 'text-anchor': anchor, ...extra }, parent);
  t.textContent = s;
  return t;
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);   // code-point order, like Python's sorted()
function pills(box, items, cur, onPick) {
  box.innerHTML = '';
  items.forEach(([k, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'strat-btn' + (k === cur ? ' active' : ''); b.textContent = label; b.dataset.k = k;
    b.addEventListener('click', () => { box.querySelectorAll('.strat-btn').forEach(x => x.classList.toggle('active', x === b)); onPick(k); });
    box.appendChild(b);
  });
}
const chip = (s, cls = '') => `<span class="chip sc-chip${cls}">${s}</span>`;

/* ---------- the lexicon: sci.crypt dictionary from Lab 01, words made of letters only ---------- */
const DF = typeof DF_SCICRYPT !== 'undefined' ? DF_SCICRYPT : {};
const LEX = Object.keys(DF).filter(w => /^[a-z]+$/.test(w)).sort(cmp);          // 4,389 words
const LEX_SET = new Set(LEX);
const REV = LEX.map(w => [...w].reverse().join('')).sort(cmp);                 // the reverse B-tree
const rev = (s) => [...s].reverse().join('');

// all words in the sorted list with prefix p (a B-tree range query p ≤ w < p')
function prefixSpan(sorted, p) {         // [lo, hi) of the entries starting with p
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < p) lo = m + 1; else hi = m; }
  let end = lo;
  while (end < sorted.length && sorted[end].startsWith(p)) end++;
  return [lo, end];
}
const prefixRange = (sorted, p) => { const [lo, hi] = prefixSpan(sorted, p); return sorted.slice(lo, hi); };
const nextKey = (p) => p.slice(0, -1) + String.fromCharCode(p.charCodeAt(p.length - 1) + 1);   // mon → moo
const patternRe = (q) => new RegExp('^' + q.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');

/* ---------- maths rendering ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- hero: faint edit-distance tables and trie branches ---------- */
function initHero() {
  const svg = document.getElementById('sc-hero-bg');
  const r = rng(7);
  for (let b = 0; b < 9; b++) {
    const x0 = b * 140 - 40 + r() * 40, y0 = 10 + r() * 180, n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) for (let j = 0; j < n + 1; j++) {
      el('rect', { x: x0 + j * 22, y: y0 + i * 22, width: 19, height: 19, rx: 4, class: 'cell' + (i === j ? ' diag' : '') }, svg);
      txt(svg, x0 + j * 22 + 9.5, y0 + i * 22 + 14, Math.abs(i - j) + (r() < 0.25 ? 1 : 0), 'dig', 'middle');
    }
  }
}

/* ---------- wild-card queries three ways ---------- */
let BIGRAMS = null, PERMUTERM = null;
function bigramIndex() {                 // bigram → terms, with $ marking the word boundaries
  if (BIGRAMS) return BIGRAMS;
  BIGRAMS = new Map();
  LEX.forEach(w => { const s = '$' + w + '$'; for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); if (!BIGRAMS.has(g)) BIGRAMS.set(g, new Set()); BIGRAMS.get(g).add(w); } });
  return BIGRAMS;
}
function permutermIndex() {              // every rotation of term$, sorted, pointing back to the term
  if (PERMUTERM) return PERMUTERM;
  const rows = [];
  LEX.forEach(w => { const s = w + '$'; for (let i = 0; i < s.length; i++) rows.push([s.slice(i) + s.slice(0, i), w]); });
  rows.sort((a, b) => cmp(a[0], b[0]));
  PERMUTERM = { keys: rows.map(r => r[0]), terms: rows.map(r => r[1]) };
  return PERMUTERM;
}
function permutermKey(q) {               // rotate so the * is at the end: X*Y → Y$X*; X*Y*Z → Z$X* (+ filter)
  const s = q + '$', first = s.indexOf('*'), last = s.lastIndexOf('*');
  if (first < 0) return { key: s, exact: true };
  return { key: s.slice(last + 1) + s.slice(0, first), exact: false, middle: s.slice(first + 1, last).split('*').filter(Boolean) };
}
function initWildcard() {
  const inp = document.getElementById('wc-q'), out = document.getElementById('wc-out');
  const PRE = ['mon*', '*mon', 'm*n', 'se*ate', 'fil*er', 'c*pt*s'];
  pills(document.getElementById('wc-presets'), PRE.map(p => [p, p]), 'mon*', k => { inp.value = k; render(); });
  inp.value = 'mon*';
  const list = (ws, cls = '') => ws.length ? '<div class="chip-row sc-list">' + ws.slice(0, 60).map(w => chip(esc(w) + (DF[w] ? ` <small>${DF[w]}</small>` : ''), cls)).join('') + (ws.length > 60 ? `<span class="note">… ${ws.length - 60} more</span>` : '') + '</div>' : '<p class="note">no terms</p>';
  function card(title, how, body) { return `<div class="wc-card"><h5>${title}</h5><div class="wc-how">${how}</div>${body}</div>`; }
  function render() {
    const q = inp.value.trim().toLowerCase().replace(/[^a-z*]/g, '');
    if (!q) { out.innerHTML = '<p class="note">Type a query with letters and *.</p>'; return; }
    const re = patternRe(q), truth = LEX.filter(w => re.test(w)), stars = (q.match(/\*/g) || []).length;
    let html = '';
    // (1) B-tree + reverse B-tree
    if (stars === 1) {
      const [X, Y] = q.split('*');
      const W = X ? prefixRange(LEX, X) : null, R = Y ? prefixRange(REV, rev(Y)).map(rev) : null;
      const res = (W && R ? W.filter(w => R.includes(w) && w.length >= X.length + Y.length) : (W || R)).sort(cmp);
      const how = (X ? `<p>B-tree range <code>${esc(X)}</code> ≤ w &lt; <code>${esc(nextKey(X))}</code>: ${W.length} terms</p>` : '') +
        (Y ? `<p>reverse B-tree range <code>${esc(rev(Y))}</code> ≤ w &lt; <code>${esc(nextKey(rev(Y)))}</code>: ${R.length} terms</p>` : '') +
        (X && Y ? `<p>intersection: ${res.length} terms</p>` : '');
      html += card('B-tree + reverse B-tree', how, list(res));
    } else {
      html += card('B-tree + reverse B-tree', '<p class="note">Handles a query with a single <code>*</code>. For more, use one of the two indexes on the right.</p>', '');
    }
    // (2) permuterm
    const pk = permutermKey(q), P = permutermIndex();
    const [lo, hi] = prefixSpan(P.keys, pk.key);
    const hits = [...new Set(P.terms.slice(lo, hi).filter((_, i) => !pk.exact || P.keys[lo + i] === pk.key))].sort(cmp);
    const kept = hits.filter(w => re.test(w)), dropped = hits.filter(w => !re.test(w));
    html += card('Permuterm index', `<p>look up <code>${esc(pk.key)}${pk.exact ? '' : '*'}</code> among ${P.keys.length.toLocaleString('en')} rotations: ${hits.length} terms</p>` +
      (pk.middle && pk.middle.length ? `<p>filter: must contain <code>${pk.middle.map(esc).join('</code>, <code>')}</code> in between → ${kept.length}</p>` : ''),
      list(kept) + (dropped.length ? list(dropped, ' gone') : ''));
    // (3) bigram index + post-filter
    const B = bigramIndex(), padded = '$' + q + '$';
    const grams = [...new Set(padded.split('*').flatMap(p => [...Array(Math.max(0, p.length - 1)).keys()].map(i => p.slice(i, i + 2))))];
    let cand = null;
    grams.forEach(g => { const s = B.get(g) || new Set(); cand = cand ? new Set([...cand].filter(w => s.has(w))) : new Set(s); });
    cand = [...(cand || [])].sort(cmp);
    const good = cand.filter(w => re.test(w)), bad = cand.filter(w => !re.test(w));
    html += card('Bigram index', `<p><code>${grams.map(esc).join('</code> AND <code>') || '—'}</code>: ${cand.length} terms</p><p>post-filter against <code>${esc(q)}</code>: ${good.length} kept, ${bad.length} removed</p>`,
      list(good) + (bad.length ? list(bad, ' gone') : ''));
    out.innerHTML = html + `<p class="note wc-note">All three agree with a direct scan of the lexicon: ${truth.length} term${truth.length === 1 ? '' : 's'}. The small numbers are document frequencies in sci.crypt.</p>`;
  }
  inp.addEventListener('input', render);
  render();
}

/* ---------- the permuterm vocabulary of one term ---------- */
function initPermuterm() {
  const t = document.getElementById('pm-term'), q = document.getElementById('pm-q'), out = document.getElementById('pm-out');
  t.value = 'hello'; q.value = 'hel*o';
  function render() {
    const term = t.value.trim().toLowerCase().replace(/[^a-z]/g, '') || 'hello';
    const query = q.value.trim().toLowerCase().replace(/[^a-z*]/g, '');
    const s = term + '$', rots = [...Array(s.length).keys()].map(i => s.slice(i) + s.slice(0, i));
    const pk = query ? permutermKey(query) : null;
    const hit = (r) => pk && (pk.exact ? r === pk.key : r.startsWith(pk.key));
    const match = query && patternRe(query).test(term);
    out.innerHTML = `<div class="ii-step"><span class="ii-step-l">${s.length} rotations of <code>${esc(s)}</code></span><div class="chip-row">${rots.map(r => chip(esc(r), hit(r) ? ' hit' : '')).join('')}</div></div>` +
      (pk ? `<p class="note" style="margin-top:0.6rem;">Query <code>${esc(query)}</code> → rotate to <code>${esc(pk.key)}${pk.exact ? '' : '*'}</code>` +
        (pk.middle && pk.middle.length ? `, then filter for <code>${pk.middle.map(esc).join('</code>, <code>')}</code>` : '') +
        `: ${rots.some(hit) ? `the highlighted rotation starts with <code>${esc(pk.key)}</code>, so <b>${esc(term)}</b> is found` : `no rotation of <b>${esc(term)}</b> starts with <code>${esc(pk.key)}</code>`}` +
        (rots.some(hit) && !match ? ' (but the filter removes it)' : '') + '.</p>' : '');
  }
  [t, q].forEach(x => x.addEventListener('input', render));
  render();
}

/* ---------- edit distance table ---------- */
const KB_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
function kbAdjacent(a, b) {
  const pos = (c) => { for (let r = 0; r < 3; r++) { const i = KB_ROWS[r].indexOf(c); if (i >= 0) return [r, i]; } return null; };
  const p = pos(a), q = pos(b);
  if (!p || !q) return false;
  if (p[0] === q[0]) return Math.abs(p[1] - q[1]) === 1;
  if (Math.abs(p[0] - q[0]) !== 1) return false;
  const [up, down] = p[0] < q[0] ? [p, q] : [q, p];     // a key touches the two keys below-left/below it
  return down[1] === up[1] || down[1] === up[1] - 1;
}
function editTable(a, b, opts = {}) {
  const n = a.length, m = b.length, D = [], from = [];
  const sub = (x, y) => (x === y ? 0 : opts.kb && kbAdjacent(x, y) ? 0.5 : 1);
  for (let i = 0; i <= n; i++) { D.push(new Array(m + 1).fill(0)); from.push(new Array(m + 1).fill(null)); }
  for (let i = 0; i <= n; i++) { D[i][0] = i; from[i][0] = i ? 'del' : null; }
  for (let j = 0; j <= m; j++) { D[0][j] = j; from[0][j] = j ? 'ins' : null; }
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const opts3 = [[D[i - 1][j - 1] + sub(a[i - 1], b[j - 1]), a[i - 1] === b[j - 1] ? 'keep' : 'sub'], [D[i - 1][j] + 1, 'del'], [D[i][j - 1] + 1, 'ins']];
    if (opts.dam && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && a[i - 1] !== b[j - 1]) opts3.push([D[i - 2][j - 2] + 1, 'swap']);
    let best = opts3[0]; opts3.forEach(o => { if (o[0] < best[0] - 1e-9) best = o; });
    D[i][j] = best[0]; from[i][j] = best[1];
  }
  return { D, from, sub };
}
function backtrace(a, b, T) {
  const path = [], ops = [];
  let i = a.length, j = b.length;
  path.push([i, j]);
  while (i > 0 || j > 0) {
    const f = T.from[i][j];
    if (f === 'keep' || f === 'sub') { ops.push([f, a[i - 1], b[j - 1]]); i--; j--; }
    else if (f === 'swap') { ops.push(['swap', a.slice(i - 2, i), b.slice(j - 2, j)]); i -= 2; j -= 2; }
    else if (f === 'del') { ops.push(['del', a[i - 1], '']); i--; }
    else { ops.push(['ins', '', b[j - 1]]); j--; }
    path.push([i, j]);
  }
  return { path, ops: ops.reverse() };
}
const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
function initEditDistance() {
  const ia = document.getElementById('ed-a'), ib = document.getElementById('ed-b'), table = document.getElementById('ed-table');
  const out = document.getElementById('ed-out'), alignBox = document.getElementById('ed-align');
  const dam = document.getElementById('ed-dam'), kb = document.getElementById('ed-kb'), playBtn = document.getElementById('ed-play');
  const PRE = { 'sunday/saturday': ['sunday', 'saturday'], 'elephant/relevant': ['elephant', 'relevant'], 'lullaby/lollipop': ['lullaby', 'lollipop'], 'cat/dog': ['cat', 'dog'], 'smtih/smith': ['smtih', 'smith'] };
  pills(document.getElementById('ed-presets'), Object.keys(PRE).map(k => [k, k.replace('/', ' / ')]), 'sunday/saturday', k => { [ia.value, ib.value] = PRE[k]; reset(true); });
  [ia.value, ib.value] = PRE['sunday/saturday'];
  let a, b, T, filled, total, sel = null, timer = null;

  function reset(full) {
    stop();
    a = ia.value.trim().toLowerCase().slice(0, 14); b = ib.value.trim().toLowerCase().slice(0, 14);
    T = editTable(a, b, { dam: dam.checked, kb: kb.checked });
    total = a.length * b.length; filled = full ? total : 0; sel = null;
    render();
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } playBtn.textContent = '▶'; }
  document.getElementById('ed-prev').addEventListener('click', () => { stop(); filled = 0; sel = null; render(); });
  document.getElementById('ed-next').addEventListener('click', () => { stop(); filled = Math.min(total, filled + 1); sel = null; render(); });
  document.getElementById('ed-end').addEventListener('click', () => { stop(); filled = total; sel = null; render(); });
  playBtn.addEventListener('click', () => {
    if (timer) { stop(); return; }
    if (filled >= total) filled = 0;
    sel = null; playBtn.textContent = '⏸';
    timer = setInterval(() => { if (filled >= total) stop(); else { filled++; render(); } }, 260);
  });
  [ia, ib].forEach(x => x.addEventListener('input', () => reset(true)));
  [dam, kb].forEach(x => x.addEventListener('change', () => reset(true)));
  table.addEventListener('click', e => { const td = e.target.closest('td[data-i]'); if (!td) return; sel = [+td.dataset.i, +td.dataset.j]; render(); });

  const isFilled = (i, j) => i === 0 || j === 0 || (i - 1) * b.length + (j - 1) < filled;
  function explain(i, j) {
    if (i === 0 && j === 0) return '<p>Empty prefix vs empty prefix: 0.</p>';
    if (i === 0) return `<p>Build <b>${esc(b.slice(0, j).toUpperCase())}</b> from the empty string: ${j} insert${j > 1 ? 's' : ''}.</p>`;
    if (j === 0) return `<p>Turn <b>${esc(a.slice(0, i).toUpperCase())}</b> into the empty string: ${i} delete${i > 1 ? 's' : ''}.</p>`;
    const D = T.D, same = a[i - 1] === b[j - 1], c = T.sub(a[i - 1], b[j - 1]);
    const rows = [[`m[${i - 1},${j - 1}] + ${fmt(c)}`, D[i - 1][j - 1] + c, same ? `keep ${a[i - 1].toUpperCase()}` : `replace ${a[i - 1].toUpperCase()} → ${b[j - 1].toUpperCase()}`, same ? 'keep' : 'sub'],
      [`m[${i - 1},${j}] + 1`, D[i - 1][j] + 1, `delete ${a[i - 1].toUpperCase()}`, 'del'], [`m[${i},${j - 1}] + 1`, D[i][j - 1] + 1, `insert ${b[j - 1].toUpperCase()}`, 'ins']];
    if (dam.checked && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && !same) rows.push([`m[${i - 2},${j - 2}] + 1`, D[i - 2][j - 2] + 1, `swap ${a.slice(i - 2, i).toUpperCase()}`, 'swap']);
    return `<p class="big">m[${i},${j}]: <b>${esc(a.slice(0, i).toUpperCase())}</b> → <b>${esc(b.slice(0, j).toUpperCase())}</b></p>` +
      rows.map(r => `<p class="ed-opt${T.from[i][j] === r[3] ? ' win' : ''}">${r[0]} = <b>${fmt(r[1])}</b> <span class="note">${r[2]}</span></p>`).join('') +
      `<p>min = <b>${fmt(D[i][j])}</b></p>`;
  }
  function render() {
    const done = filled >= total, bt = done ? backtrace(a, b, T) : null;
    const onPath = new Set(bt ? bt.path.map(([i, j]) => i + ',' + j) : []);
    const cur = filled > 0 && !done ? [Math.floor((filled - 1) / b.length) + 1, ((filled - 1) % b.length) + 1] : null;
    const focus = sel || cur || (done ? [a.length, b.length] : null);
    let h = `<thead><tr><th></th><th></th>${[...b].map(c => `<th>${esc(c.toUpperCase())}</th>`).join('')}</tr></thead><tbody>`;
    for (let i = 0; i <= a.length; i++) {
      h += `<tr><th>${i ? esc(a[i - 1].toUpperCase()) : ''}</th>`;
      for (let j = 0; j <= b.length; j++) {
        const f = isFilled(i, j), cls = [f ? '' : 'empty', onPath.has(i + ',' + j) ? 'path' : '', focus && focus[0] === i && focus[1] === j ? 'focus' : '',
          focus && f && (i === focus[0] - 1 || i === focus[0]) && (j === focus[1] - 1 || j === focus[1]) && !(i === focus[0] && j === focus[1]) ? 'nb' : '',
          i === a.length && j === b.length && done ? 'final' : ''].filter(Boolean).join(' ');
        h += `<td data-i="${i}" data-j="${j}" class="${cls}">${f ? fmt(T.D[i][j]) : ''}</td>`;
      }
      h += '</tr>';
    }
    table.innerHTML = h + '</tbody>';
    out.innerHTML = `<p class="big">Edit distance(<b>${esc(a)}</b>, <b>${esc(b)}</b>) = <b class="ed-res">${done ? fmt(T.D[a.length][b.length]) : '?'}</b></p>` +
      `<p class="note">${Math.min(filled, total)} of ${total} inner cells filled. ${done ? 'Click a cell to see how it was computed.' : ''}</p>` +
      (focus && isFilled(...focus) ? explain(...focus) : '');
    if (bt) {
      const col = (o) => ({ keep: 'k', sub: 's', del: 'd', ins: 'i', swap: 'w' }[o[0]]);
      alignBox.innerHTML = '<div class="ed-al">' + bt.ops.map(o => `<span class="ed-col ${col(o)}"><b>${esc((o[1] || '–').toUpperCase())}</b><b>${esc((o[2] || '–').toUpperCase())}</b><small>${{ keep: '', sub: 'replace', del: 'delete', ins: 'insert', swap: 'swap' }[o[0]]}</small></span>`).join('') + '</div>' +
        `<p class="note">One cheapest alignment: ${bt.ops.filter(o => o[0] !== 'keep').length} edit${bt.ops.filter(o => o[0] !== 'keep').length === 1 ? '' : 's'} (${['sub', 'del', 'ins', 'swap'].map(k => [k, bt.ops.filter(o => o[0] === k).length]).filter(x => x[1]).map(([k, c]) => `${c} ${{ sub: 'replace', del: 'delete', ins: 'insert', swap: 'swap' }[k]}`).join(', ') || 'none'}).</p>`;
    } else alignBox.innerHTML = '';
  }
  reset(true);
}

/* ---------- n-gram spell-checker ---------- */
const GRAMS = {};
function ngramIndex(n) {                 // n-gram → words (no boundary symbol, like the notebook)
  if (GRAMS[n]) return GRAMS[n];
  const post = new Map(), size = new Map();
  LEX.forEach(w => { const g = new Set(wordGrams(w, n)); size.set(w, g.size); g.forEach(x => { if (!post.has(x)) post.set(x, []); post.get(x).push(w); }); });
  return (GRAMS[n] = { post, size });
}
const wordGrams = (w, n) => [...Array(Math.max(0, w.length - n + 1)).keys()].map(i => w.slice(i, i + n));
function lev(a, b) {
  let prev = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] !== b[j - 1]))); prev = cur; }
  return prev[b.length];
}
const ABC = 'abcdefghijklmnopqrstuvwxyz';
function edits1(w) {                     // Norvig: deletes, transposes, replaces, inserts
  const out = [];
  for (let i = 0; i <= w.length; i++) {
    const L = w.slice(0, i), R = w.slice(i);
    if (R) out.push(L + R.slice(1));
    if (R.length > 1) out.push(L + R[1] + R[0] + R.slice(2));
    for (const c of ABC) { if (R) out.push(L + c + R.slice(1)); out.push(L + c + R); }
  }
  return out;
}
function initSpell() {
  const inp = document.getElementById('sp-q'), th = document.getElementById('sp-th'), table = document.getElementById('sp-table');
  const gramsBox = document.getElementById('sp-grams'), out = document.getElementById('sp-out');
  let n = 2;
  const PRE = ['enginering', 'encription', 'goverment', 'algoritm', 'securty', 'mesage'];
  pills(document.getElementById('sp-presets'), PRE.map(p => [p, p]), 'enginering', k => { inp.value = k; render(); });
  pills(document.getElementById('sp-n'), [[2, 'bigrams'], [3, 'trigrams']], 2, k => { n = +k; render(); });
  inp.value = 'enginering';
  function render() {
    const q = inp.value.trim().toLowerCase().replace(/[^a-z]/g, ''), t = +th.value;
    document.getElementById('sp-th-val').textContent = t.toFixed(2);
    if (q.length < n) { table.innerHTML = ''; gramsBox.innerHTML = ''; out.innerHTML = '<p class="note">Type a longer word.</p>'; return; }
    const I = ngramIndex(n), Q = [...new Set(wordGrams(q, n))];
    gramsBox.innerHTML = `<span class="ii-step-l">${Q.length} ${n === 2 ? 'bigrams' : 'trigrams'} of <b>${esc(q)}</b> · postings length</span><div class="chip-row">` +
      Q.map(g => chip(`${esc(g)} <small>${(I.post.get(g) || []).length}</small>`)).join('') + '</div>';
    const shared = new Map();
    Q.forEach(g => (I.post.get(g) || []).forEach(w => shared.set(w, (shared.get(w) || 0) + 1)));
    const rows = [...shared].map(([w, c]) => ({ w, c, j: c / (Q.length + I.size.get(w) - c) })).sort((x, y) => y.j - x.j || y.c - x.c || cmp(x.w, y.w));
    const top = rows.slice(0, 10);
    top.forEach(r => { r.ed = lev(q, r.w); });
    const cands = rows.filter(r => r.j >= t - 1e-9);
    cands.forEach(r => { if (r.ed === undefined) r.ed = lev(q, r.w); });
    cands.sort((x, y) => x.ed - y.ed || DF[y.w] - DF[x.w]);
    table.innerHTML = `<thead><tr><th>word</th><th>shared</th><th>Jaccard</th><th>edit d.</th><th>df</th></tr></thead><tbody>` +
      top.map(r => `<tr class="${r.j >= t - 1e-9 ? 'in' : ''}${cands[0] && r.w === cands[0].w ? ' best' : ''}"><td>${esc(r.w)}</td><td>${r.c} / ${Q.length}</td><td>${r.c} / (${Q.length} + ${I.size.get(r.w)} − ${r.c}) = <b>${r.j.toFixed(3)}</b></td><td>${r.ed}</td><td>${DF[r.w]}</td></tr>`).join('') + '</tbody>';
    // Norvig: known words at edit distance 1, else 2
    const e1 = new Set(edits1(q)), k1 = [...e1].filter(w => LEX_SET.has(w));
    let e2 = null, k2 = [];
    if (q.length <= 14) { e2 = new Set(); e1.forEach(w => edits1(w).forEach(x => e2.add(x))); k2 = [...e2].filter(w => LEX_SET.has(w) && !e1.has(w) && w !== q); }
    const pick = (ws) => ws.slice().sort((x, y) => DF[y] - DF[x])[0];
    const norvig = LEX_SET.has(q) ? q : k1.length ? pick(k1) : k2.length ? pick(k2) : null;
    out.innerHTML = `<p class="big">n-grams: ${shared.size} words share an n-gram, <b>${cands.length}</b> reach J ≥ ${t.toFixed(2)}</p>` +
      (cands.length ? `<p>Did you mean <b class="sp-best">${esc(cands[0].w)}</b>? <span class="note">(smallest edit distance, then most documents)</span></p>` : '<p>No candidate: lower the threshold.</p>') +
      `<p class="big" style="margin-top:0.8rem;">Norvig: ${(54 * q.length + 25).toLocaleString('en')} strings at distance 1 (54n + 25, ${e1.size.toLocaleString('en')} distinct), ${k1.length} in the lexicon${e2 ? `; ${e2.size.toLocaleString('en')} at distance 2, ${k2.length} more in the lexicon` : ''}.</p>` +
      (norvig ? `<p>Pick: <b class="sp-best">${esc(norvig)}</b> <span class="note">(fewest edits, then most documents)</span></p>` : '<p>No known word within 2 edits.</p>') +
      (LEX_SET.has(q) ? `<p class="note">❗ <b>${esc(q)}</b> itself is in the lexicon (df ${DF[q]}): a corpus lexicon contains the corpus's misspellings, so both methods accept it as correct.</p>` : '');
  }
  inp.addEventListener('input', render); th.addEventListener('input', render);
  render();
}

/* ---------- Jaccard vs overlap coefficient ---------- */
function initJaccard() {
  const s = document.getElementById('jc-a'), svg = document.getElementById('jc-svg'), out = document.getElementById('jc-out');
  function render() {
    const A = +s.value, I = 50, U = 100, B = U + I - A;
    document.getElementById('jc-a-val').textContent = A;
    svg.innerHTML = '';
    const x = (v) => 20 + v * 4.2;
    el('rect', { x: x(0), y: 34, width: A * 4.2, height: 34, rx: 8, class: 'jc-a' }, svg);
    el('rect', { x: x(A - I), y: 88, width: B * 4.2, height: 34, rx: 8, class: 'jc-b' }, svg);
    el('rect', { x: x(A - I), y: 26, width: I * 4.2, height: 104, rx: 8, class: 'jc-i' }, svg);
    txt(svg, x(0) + 6, 56, `A: ${A}`, 'lbl'); txt(svg, x(100) - 6, 110, `B: ${B}`, 'lbl', 'end');
    txt(svg, x(A - I / 2), 150, `A ∩ B: ${I}`, 'lbl', 'middle');
    txt(svg, x(50), 16, `A ∪ B: ${U}`, 'tick', 'middle');
    el('line', { x1: x(0), x2: x(100), y1: 22, y2: 22, class: 'jc-u' }, svg);
    out.innerHTML = `<p class="big">Jaccard = ${I} / ${U} = <b>${(I / U).toFixed(2)}</b></p>` +
      `<p class="big">Overlap = ${I} / min(${A}, ${B}) = <b>${(I / Math.min(A, B)).toFixed(2)}</b></p>` +
      `<p class="note">Move the slider: the intersection and the union stay the same, so Jaccard stays at 0.5; the overlap coefficient grows as the smaller set shrinks.</p>`;
  }
  s.addEventListener('input', render);
  render();
}

/* ---------- edit distance on a trie ---------- */
function initTrie() {
  const wi = document.getElementById('tr-words'), qi = document.getElementById('tr-q'), mi = document.getElementById('tr-max');
  const svg = document.getElementById('tr-svg'), out = document.getElementById('tr-out');
  wi.value = 'big, bigger, bill, good, gong'; qi.value = 'gold';
  function render() {
    const words = [...new Set(wi.value.toLowerCase().split(/[\s,]+/).map(w => w.replace(/[^a-z]/g, '')).filter(Boolean))].slice(0, 12);
    const q = qi.value.trim().toLowerCase().replace(/[^a-z]/g, '') || 'gold', lim = +mi.value;
    document.getElementById('tr-max-val').textContent = lim;
    // build the trie
    const root = { ch: '', kids: new Map(), end: false, depth: 0 };
    words.forEach(w => { let n = root; [...w].forEach((c, d) => { if (!n.kids.has(c)) n.kids.set(c, { ch: c, kids: new Map(), end: false, depth: d + 1, parent: n }); n = n.kids.get(c); }); n.end = true; });
    // edit distance rows, one per node, pruning subtrees whose row minimum exceeds the limit
    let computed = 0, nodes = 0;
    const found = [];
    (function walk(n, row, prefix) {
      nodes++;
      n.row = row; n.val = row[q.length]; n.pruned = Math.min(...row) > lim; computed++;
      if (n.end && n.val <= lim) found.push([prefix, n.val]);
      [...n.kids.values()].sort((x, y) => cmp(x.ch, y.ch)).forEach(k => {
        if (n.pruned) { markSkipped(k); return; }
        const r = [row[0] + 1];
        for (let j = 1; j <= q.length; j++) r.push(Math.min(r[j - 1] + 1, row[j] + 1, row[j - 1] + (q[j - 1] !== k.ch)));
        walk(k, r, prefix + k.ch);
      });
    })(root, [...Array(q.length + 1).keys()], '');
    function markSkipped(n) { n.skipped = true; nodes++; n.kids.forEach(markSkipped); }
    // layout: leaves left to right, parents centred over their children
    let leaf = 0, maxD = 0;
    (function place(n) { maxD = Math.max(maxD, n.depth); const ks = [...n.kids.values()].sort((x, y) => cmp(x.ch, y.ch)); if (!ks.length) n.x = leaf++; else { ks.forEach(place); n.x = (ks[0].x + ks[ks.length - 1].x) / 2; } })(root);
    const W = Math.max(520, leaf * 92), H = 50 + maxD * 40 + 20;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    const X = (n) => 40 + (leaf > 1 ? n.x * (W - 80) / (leaf - 1) : (W - 80) / 2), Y = (n) => 28 + n.depth * 40;
    (function edges(n) { n.kids.forEach(k => { el('line', { x1: X(n), y1: Y(n), x2: X(k), y2: Y(k), class: 'tr-edge' + (k.skipped ? ' off' : '') }, svg); edges(k); }); })(root);
    (function draw(n) {
      const g = el('g', { class: 'tr-node' + (n.skipped ? ' off' : n.pruned ? ' pruned' : n.end && n.val <= lim ? ' hit' : '') }, svg);
      el('circle', { cx: X(n), cy: Y(n), r: 13 }, g);
      if (n.end) el('circle', { cx: X(n), cy: Y(n), r: 9.5, class: 'in' }, g);
      txt(g, X(n), Y(n) + 4.5, n.depth ? n.ch.toUpperCase() : '·', 'tr-ch', 'middle');
      if (!n.skipped) txt(g, X(n) + 17, Y(n) - 8, n.val, 'tr-v');
      n.kids.forEach(draw);
    })(root);
    const naive = words.reduce((s, w) => s + w.length, 0) + words.length;
    out.innerHTML = `<p class="big">Within ${lim} edit${lim > 1 ? 's' : ''} of <b>${esc(q)}</b>: ${found.length ? found.sort((x, y) => x[1] - y[1]).map(([w, v]) => `<b>${esc(w)}</b> (${v})`).join(', ') : 'none'}</p>` +
      `<p>Rows of the table computed: <b>${computed}</b> on the trie (${nodes} nodes, the rest pruned) vs <b>${naive}</b> when each word is compared separately (one row per letter, plus the empty prefix).</p>`;
  }
  [wi, qi].forEach(x => x.addEventListener('input', render)); mi.addEventListener('input', render);
  render();
}

/* ---------- Soundex ---------- */
const SX = { b: 1, f: 1, p: 1, v: 1, c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2, d: 3, t: 3, l: 4, m: 5, n: 5, r: 6 };
function soundexSteps(name) {
  const w = name.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return null;
  const digits = [...w.slice(1)].map(c => ('aeiouhwy'.includes(c) ? '0' : String(SX[c])));
  const collapsed = digits.filter((d, i) => i === 0 || d !== digits[i - 1]);        // one of each pair of identical neighbours
  const noZero = collapsed.filter(d => d !== '0');
  const code = (w[0].toUpperCase() + noZero.join('') + '000').slice(0, 4);
  return { w, digits: digits.join(''), collapsed: collapsed.join(''), noZero: noZero.join(''), code };
}
function initSoundex() {
  const inp = document.getElementById('sx-in'), table = document.getElementById('sx-table'), out = document.getElementById('sx-out');
  inp.value = 'Herman, Hermann, Robert, Rupert, Chebyshev, Tchebycheff, Elitsa';
  function render() {
    const rows = inp.value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 14).map(n => [n, soundexSteps(n)]).filter(r => r[1]);
    table.innerHTML = '<thead><tr><th>Name</th><th>1–3: letter + digits</th><th>4: collapse pairs</th><th>5: drop zeros</th><th>6: code</th></tr></thead><tbody>' +
      rows.map(([n, s]) => `<tr data-s="ids"><td>${esc(n)}</td><td><code>${s.w[0].toUpperCase()} ${s.digits}</code></td><td><code>${s.w[0].toUpperCase()} ${s.collapsed}</code></td><td><code>${s.w[0].toUpperCase()} ${s.noZero || '—'}</code></td><td><b class="sx-code">${s.code}</b></td></tr>`).join('') + '</tbody>';
    const groups = new Map();
    rows.forEach(([n, s]) => { if (!groups.has(s.code)) groups.set(s.code, []); groups.get(s.code).push(n); });
    const same = [...groups].filter(([, ns]) => ns.length > 1);
    out.innerHTML = same.length ? '<p class="big">Same code: ' + same.map(([c, ns]) => `<b>${c}</b> ← ${ns.map(esc).join(', ')}`).join(' · ') + '</p>' : '<p class="note">No two names share a code.</p>';
  }
  inp.addEventListener('input', render);
  render();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initWildcard();
  initPermuterm();
  initEditDistance();
  initSpell();
  initJaccard();
  initTrie();
  initSoundex();
});

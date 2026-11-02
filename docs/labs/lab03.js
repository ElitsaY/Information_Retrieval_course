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

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initEditDistance();
  initJaccard();
  initTrie();
});

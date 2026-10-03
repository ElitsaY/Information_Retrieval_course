/* ===== Lab 08 interactivity ===== */

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
const f2 = (v) => v.toFixed(2), f3 = (v) => v.toFixed(3);
function pills(box, items, cur, onPick) {
  box.innerHTML = '';
  items.forEach(([k, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'strat-btn' + (k === cur ? ' active' : ''); b.textContent = label; b.dataset.k = k;
    b.addEventListener('click', () => { box.querySelectorAll('.strat-btn').forEach(x => x.classList.toggle('active', x === b)); onPick(k); });
    box.appendChild(b);
  });
}
function mathIn(node) { if (typeof window !== 'undefined' && window.renderMathInElement) renderMathInElement(node, { delimiters: [{ left: '\\(', right: '\\)', display: false }], throwOnError: false }); }
const big = (n) => n >= 1e12 ? (n / 1e12).toPrecision(3) + ' trillion' : n >= 1e9 ? (n / 1e9).toPrecision(3) + ' billion' : n >= 1e6 ? (n / 1e6).toPrecision(3) + ' million' : Math.round(n).toLocaleString('en');
// blue for positive, red for negative, stronger for larger |x| / m
const signColor = (x, m) => `color-mix(in srgb, ${x >= 0 ? 'var(--indigo)' : '#d9546e'} ${Math.round(8 + 92 * Math.min(1, Math.abs(x) / m))}%, var(--surface))`;


/* ====================== pure part (Node-testable) ====================== */
const D = typeof DENSE !== 'undefined' ? DENSE : (typeof global !== 'undefined' && global.DENSE) || null;
const VOC = typeof VOCAB !== 'undefined' ? VOCAB : (typeof global !== 'undefined' && global.VOCAB) || null;

// scikit-learn TfidfVectorizer on a handful of texts: \b\w\w+\b tokens, smoothed idf, L2 rows
function tinyTfidf(texts) {
  const toks = texts.map(t => t.toLowerCase().match(/\b\w\w+\b/g) || []), N = texts.length;
  const vocab = [...new Set(toks.flat())].sort(), df = new Map(vocab.map(w => [w, toks.filter(t => t.includes(w)).length]));
  const rows = toks.map(t => { const v = vocab.map(w => t.filter(x => x === w).length * (Math.log((1 + N) / (1 + df.get(w))) + 1)); const n = Math.hypot(...v); return v.map(x => (n ? x / n : 0)); });
  return { vocab, rows };
}

// BERT uncased tokenizer (as in Hugging Face): clean, split CJK, lowercase, strip accents, split on whitespace and punctuation, then greedy WordPiece
let VIDX = null;
function wordPiece(text) {
  if (!VIDX) VIDX = new Map(VOC.map((t, i) => [t, i]));
  const isCjk = (c) => (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF) || (c >= 0x20000 && c <= 0x2A6DF) || (c >= 0x2A700 && c <= 0x2B73F) || (c >= 0x2B740 && c <= 0x2B81F) || (c >= 0x2B820 && c <= 0x2CEAF) || (c >= 0xF900 && c <= 0xFAFF) || (c >= 0x2F800 && c <= 0x2FA1F);
  const isPunct = (ch) => { const c = ch.codePointAt(0); return (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126) || /\p{P}/u.test(ch); };
  let clean = '';
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c === 0 || c === 0xFFFD || (/[\p{Cc}\p{Cf}]/u.test(ch) && !/[\t\n\r]/.test(ch))) continue;
    if (/[\t\n\r ]/.test(ch) || /\p{Zs}/u.test(ch)) clean += ' ';
    else if (isCjk(c)) clean += ' ' + ch + ' ';
    else clean += ch;
  }
  const words = [];
  clean.split(' ').filter(Boolean).forEach(w => {
    w = w.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
    let cur = '';
    for (const ch of w) { if (isPunct(ch)) { if (cur) words.push(cur); words.push(ch); cur = ''; } else cur += ch; }
    if (cur) words.push(cur);
  });
  const out = [];
  words.forEach((w, wi) => {
    const chars = Array.from(w);
    if (chars.length > 100) { out.push({ t: '[UNK]', w: wi }); return; }
    const pieces = []; let start = 0;
    while (start < chars.length) {
      let end = chars.length, found = null;
      while (start < end) { let sub = chars.slice(start, end).join(''); if (start > 0) sub = '##' + sub; if (VIDX.has(sub)) { found = sub; break; } end--; }
      if (!found) { out.push({ t: '[UNK]', w: wi }); return; }
      pieces.push(found); start = end;
    }
    pieces.forEach(p => out.push({ t: p, w: wi }));
  });
  return out.map(x => ({ ...x, id: VIDX.get(x.t) }));
}
const cosine = (a, b) => { let s = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return s / Math.sqrt(na * nb); };
function poolVec(H, how) {
  if (how === 'cls') return H[0].slice();
  return H[0].map((_, d) => how === 'max' ? Math.max(...H.map(h => h[d])) : H.reduce((s, h) => s + h[d], 0) / H.length);
}

if (typeof module !== 'undefined') module.exports = { tinyTfidf, wordPiece, poolVec, cosine };
if (typeof document !== 'undefined') {


/* ---------- math ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- hero: rows of tokens joined by attention arcs ---------- */
function initHero() {
  const svg = document.getElementById('dr-hero-bg'), r = rng(8);
  [55, 150, 245].forEach((y, row) => {
    const toks = []; let x = 20 + r() * 60;
    while (x < 1180) { const w = 40 + r() * 70; toks.push([x, w]); x += w + 14 + r() * 20; }
    for (let k = 0; k < 7; k++) {
      const a = toks[Math.floor(r() * toks.length)], b = toks[Math.floor(r() * toks.length)];
      if (a === b) continue;
      const xa = a[0] + a[1] / 2, xb = b[0] + b[1] / 2, h = Math.min(70, Math.abs(xb - xa) * 0.35);
      el('path', { d: `M${xa},${y - 14} Q${(xa + xb) / 2},${y - 14 - h} ${xb},${y - 14}`, class: 'arc' }, svg);
    }
    toks.forEach(([tx, w], i) => el('rect', { x: tx, y: y - 13, width: w, height: 26, rx: 7, class: 'tok' + ((i + row) % 5 === 0 ? ' hi' : '') }, svg));
  });
}

/* ---------- Part II: tokenizer ---------- */
function initTokenizer() {
  const inp = document.getElementById('tk-in'), out = document.getElementById('tk-out');
  const PRE = ['retrieval systems are useful', 'tokenization', 'embeddings', 'chatbots', 'myocardial infarction'];
  pills(document.getElementById('tk-pre'), PRE.map(p => [p, p]), PRE[0], (p) => { inp.value = p; render(); });
  function render() {
    const toks = wordPiece(inp.value), words = inp.value.trim().split(/\s+/).filter(Boolean).length;
    out.innerHTML = `<div class="tk-chips">${toks.map(x => `<span class="tk-chip${x.t === '[UNK]' ? ' unk' : x.t.startsWith('##') ? ' cont' : ''}">${esc(x.t.replace(/^##/, ''))}</span>`).join('')}</div>` +
      `<p><b>${words}</b> word${words === 1 ? '' : 's'} → <b>${toks.length}</b> token${toks.length === 1 ? '' : 's'}</p>`;
  }
  inp.addEventListener('input', () => { document.querySelectorAll('#tk-pre .strat-btn').forEach(b => b.classList.toggle('active', b.dataset.k === inp.value)); render(); });
  render();
}

/* ---------- Part II: the lookup table ---------- */
// first 6 of the 384 numbers in each row of the model's real token-embedding table
const LUT = [
  { t: 'are', id: 2024, v: [-0.0225, -0.017, -0.0119, 0.0298, -0.0568, 0.023] },
  { t: 'bank', id: 2924, v: [0.0492, 0.0312, -0.0702, 0.0593, 0.0814, -0.0581] },
  { t: 'systems', id: 3001, v: [-0.0784, -0.1659, -0.0132, 0.0723, 0.02, -0.0607] },
  { t: 'useful', id: 6179, v: [-0.0503, -0.0526, 0.0378, -0.0092, 0.0113, -0.0324] },
  { t: 'retrieval', id: 26384, v: [-0.1179, -0.0731, 0.0209, -0.0475, -0.0011, -0.0548] },
];
const fmt2 = (x) => (x <= -0.005 ? '−' : '') + Math.abs(x).toFixed(2);
const rowStrip = (v, m) => v.map(x => `<span class="lt-c" style="background:${signColor(x, m)}">${fmt2(x)}</span>`).join('') + '<span class="lt-c more">…</span>';
function initLookup() {
  const sent = document.getElementById('lt-sent'), tab = document.getElementById('lt-table'), out = document.getElementById('lt-out');
  const m = Math.max(...LUT.flatMap(r => r.v.map(Math.abs)));
  const gap = '<tr class="lt-gap"><td>⋮</td><td></td><td colspan="7"></td></tr>';
  tab.innerHTML = '<thead><tr><th>ID</th><th>token</th>' + [1, 2, 3, 4, 5, 6].map(d => `<th class="d${d}">${d}</th>`).join('') + '<th>…</th></tr></thead><tbody>' + gap +
    LUT.map((r, k) => `<tr data-k="${k}"><td class="lt-id">${r.id}</td><td><span class="tk-chip">${r.t}</span></td>` + r.v.map((x, d) => `<td class="d${d + 1}" style="background:${signColor(x, m)}">${fmt2(x)}</td>`).join('') + '<td>…</td></tr>' + gap).join('') + '</tbody>';
  const order = ['retrieval', 'systems', 'are', 'useful'];
  sent.innerHTML = '<span class="lt-lab">Text</span>' + order.map(t => `<button type="button" class="tk-chip lt-tok" data-t="${t}">${t}</button>`).join('');
  function pick(t) {
    const k = LUT.findIndex(r => r.t === t), r = LUT[k];
    sent.querySelectorAll('.lt-tok').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    tab.querySelectorAll('tbody tr[data-k]').forEach(tr => tr.classList.toggle('on', +tr.dataset.k === k));
    out.innerHTML = `<span class="tk-chip">${r.t}</span> → ID <b>${r.id}</b> → row ${r.id} = [${r.v.slice(0, 3).map(fmt2).join(', ')}, …]: its token embedding`;
  }
  sent.querySelectorAll('.lt-tok').forEach(b => b.addEventListener('click', () => pick(b.dataset.t)));
  tab.querySelectorAll('tbody tr[data-k]').forEach(tr => tr.addEventListener('click', () => pick(LUT[+tr.dataset.k].t)));
  pick('retrieval');
}

/* ---------- Part II: one string, many meanings ---------- */
function initBankPics() {
  const pics = [...document.querySelectorAll('#mb-pics .mb-pic')], lines = [...document.querySelectorAll('#mb-funnel line')], out = document.getElementById('mb-out');
  const r = LUT.find(x => x.t === 'bank'), m = Math.max(...LUT.flatMap(x => x.v.map(Math.abs)));
  document.getElementById('mb-row').innerHTML = rowStrip(r.v, m);
  function pick(i) {
    pics.forEach((p, j) => p.classList.toggle('on', j === i));
    lines.forEach((l, j) => l.classList.toggle('on', j === i));
    out.innerHTML = `“${pics[i].querySelector('span').innerHTML}” → <span class="tk-chip">bank</span> → ID <b>2924</b> → row 2924: the same row as for the other three sentences.`;
  }
  pics.forEach((p, i) => p.addEventListener('click', () => pick(i)));
  pick(0);
}

/* ---------- Part III: where does "it" look? (illustrative weights) ---------- */
const SA = {
  tired: { words: ['The', 'animal', 'did', 'not', 'cross', 'the', 'street', 'because', 'it', 'was', 'tired'], w: [0.02, 0.55, 0.01, 0.01, 0.03, 0.02, 0.08, 0.03, 0.06, 0.04, 0.15], ref: 'the animal' },
  wide: { words: ['The', 'animal', 'did', 'not', 'cross', 'the', 'street', 'because', 'it', 'was', 'too', 'wide'], w: [0.01, 0.10, 0.01, 0.01, 0.03, 0.01, 0.52, 0.03, 0.06, 0.04, 0.04, 0.14], ref: 'the street' },
};
function initSelfAttn() {
  const toks = document.getElementById('sa-toks'), bars = document.getElementById('sa-bars'), out = document.getElementById('sa-out');
  const pct = (x) => `${Math.round(x * 100)}%`;
  function render(k) {
    const S = SA[k], qi = S.words.indexOf('it');
    toks.innerHTML = S.words.map((t, i) => `<span class="sa-tok${i === qi ? ' q' : ''}" style="background:color-mix(in srgb, var(--dfs) ${Math.round(S.w[i] / 0.55 * 70)}%, var(--surface))">${esc(t)}<small>${pct(S.w[i])}</small></span>`).join('');
    const top = S.words.map((t, i) => ({ t, w: S.w[i] })).sort((a, b) => b.w - a.w).slice(0, 4);
    bars.innerHTML = top.map(x => `<div class="sa-bar"><span>${esc(x.t)}</span><i style="width:${x.w * 100 / 0.6}%"></i><b>${pct(x.w)}</b></div>`).join('');
    out.innerHTML = `New vector of <b>it</b> ≈ ${top.map(x => `${pct(x.w)} <i>${esc(x.t)}</i>`).join(' + ')} + …: <b>it</b> now carries information about <b>${S.ref}</b>.`;
  }
  pills(document.getElementById('sa-s'), [['tired', '… because it was tired'], ['wide', '… because it was too wide']], 'tired', render);
  render('tired');
}

/* ---------- Part III: query, key, value step by step (invented 2-number vectors) ---------- */
const QKV = { q: [1, 2], rows: [{ t: 'animal', k: [2, 1], v: [1, 0] }, { t: 'street', k: [1, 0], v: [0, 1] }, { t: 'tired', k: [0, 1], v: [0.5, 0] }, { t: 'it', k: [0.5, 0.5], v: [0.2, 0.2] }] };
function initQKV() {
  const tab = document.getElementById('qk-table'), lab = document.getElementById('qk-step'), out = document.getElementById('qk-out');
  const q = QKV.q, R = QKV.rows, vec = (a) => `[${a.map(x => +x.toFixed(2)).join(', ')}]`, n2 = (x) => x.toFixed(3);
  const sc = R.map(r => r.k[0] * q[0] + r.k[1] * q[1]), ex = sc.map(Math.exp), Z = ex.reduce((a, b) => a + b, 0), w = ex.map(x => x / Z);
  const o = [0, 1].map(d => R.reduce((a, r, i) => a + w[i] * r.v[d], 0));
  const LAB = ['Start: the query of <b>it</b> is q = [1, 2]', 'Step 1 · Score: q · key', 'Step 2 · Weights: softmax', 'Step 3 · Mix: weighted sum of values'];
  let step = 0;
  function render() {
    lab.innerHTML = LAB[step];
    tab.innerHTML = `<thead><tr><th>word</th><th class="k">key</th><th class="${step >= 1 ? 's' : 'off'}">score</th><th class="${step >= 2 ? 'w' : 'off'}">weight</th><th class="v">value</th></tr></thead><tbody>` +
      R.map((r, i) => `<tr${r.t === 'it' ? ' class="self"' : ''}><td><span class="tk-chip">${r.t}</span></td><td class="k">${vec(r.k)}</td>` +
        `<td class="${step >= 1 ? 's' : 'off'}">${step >= 1 ? `<span class="qk-calc">1·${+r.k[0].toFixed(2)} + 2·${+r.k[1].toFixed(2)} = </span><b>${+sc[i].toFixed(2)}</b>` : '?'}</td>` +
        `<td class="${step >= 2 ? 'w' : 'off'}">${step >= 2 ? `<span class="qk-wbar"><i style="width:${w[i] * 100}%"></i></span><b>${n2(w[i])}</b>` : '?'}</td>` +
        `<td class="v${step >= 3 ? ' on' : ''}">${vec(r.v)}</td></tr>`).join('') + '</tbody>';
    out.innerHTML = [
      'Every word has a <b>key</b> (what it offers) and a <b>value</b> (what it passes on). We compute the new vector of <b>it</b>, so we use its <b>query</b>.',
      `The query matches the key of <b>animal</b> best (score ${+sc[0].toFixed(2)}), and the key of <b>street</b> worst (score ${+sc[1].toFixed(2)}).`,
      `softmax: each weight is \\(e^{\\text{score}}\\) divided by the sum over all words, so the weights add up to 1. <b>animal</b> gets ${n2(w[0])} of the attention.`,
      `New vector of <b>it</b> = ${R.map((r, i) => `${n2(w[i])}·${vec(r.v)}`).join(' + ')} = <b>${vec(o)}</b>: close to the value of <b>animal</b>, [1, 0]. <b>it</b> now carries the animal's information.`,
    ][step];
    mathIn(out);
    document.getElementById('qk-prev').disabled = step === 0;
    document.getElementById('qk-next').disabled = step === 3;
  }
  document.getElementById('qk-next').addEventListener('click', () => { step = Math.min(3, step + 1); render(); });
  document.getElementById('qk-prev').addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  document.getElementById('qk-reset').addEventListener('click', () => { step = 0; render(); });
  render();
}

/* ---------- Part III: the score is a dot product ---------- */
function initDotProduct() {
  const words = document.getElementById('dp-words'), svg = document.getElementById('dp-plot'), calc = document.getElementById('dp-calc');
  const q = QKV.q, R = QKV.rows, O = [40, 200], S = 70, P = (v) => [O[0] + v[0] * S, O[1] - v[1] * S];
  const arrow = (v, cls, label) => {
    const [x, y] = P(v), a = Math.atan2(y - O[1], x - O[0]), h = 13;
    el('line', { x1: O[0], y1: O[1], x2: x - Math.cos(a) * h * 0.8, y2: y - Math.sin(a) * h * 0.8, class: cls }, svg);
    el('polygon', { points: `${x},${y} ${x - h * Math.cos(a - 0.42)},${y - h * Math.sin(a - 0.42)} ${x - h * Math.cos(a + 0.42)},${y - h * Math.sin(a + 0.42)}`, class: cls + ' head' }, svg);
    if (label) { const t = el('text', { x: x + 6, y: y - 4, class: cls + ' lab' }, svg); t.textContent = label; }
  };
  function pick(k) {
    const r = R[k], sc = q[0] * r.k[0] + q[1] * r.k[1];
    words.querySelectorAll('.lt-tok').forEach((b, i) => b.classList.toggle('on', i === k));
    svg.innerHTML = '';
    for (let g = 1; g <= 2; g++) { el('line', { x1: P([g, 0])[0], y1: O[1], x2: P([g, 0])[0], y2: P([0, 2.7])[1], class: 'grid' }, svg); el('line', { x1: O[0], y1: P([0, g])[1], x2: P([2.7, 0])[0], y2: P([0, g])[1], class: 'grid' }, svg); }
    el('line', { x1: O[0], y1: O[1], x2: P([2.85, 0])[0], y2: O[1], class: 'axis' }, svg); el('line', { x1: O[0], y1: O[1], x2: O[0], y2: P([0, 2.85])[1], class: 'axis' }, svg);
    [1, 2].forEach(g => { const t1 = el('text', { x: P([g, 0])[0], y: O[1] + 16, class: 'tick' }, svg); t1.textContent = g; const t2 = el('text', { x: O[0] - 12, y: P([0, g])[1] + 4, class: 'tick' }, svg); t2.textContent = g; });
    R.forEach((x, i) => { if (i !== k) arrow(x.k, 'key faint', x.t); });
    arrow(q, 'qry', 'query of it');
    arrow(r.k, 'key', `key of ${r.t}`);
    const f = (x) => +x.toFixed(2);
    calc.innerHTML = `<div class="dp-row"><span class="dp-l q">query</span><span class="dp-n q">${f(q[0])}</span><span class="dp-n q">${f(q[1])}</span></div>` +
      `<div class="dp-row"><span class="dp-l k">key of ${r.t}</span><span class="dp-n k">${f(r.k[0])}</span><span class="dp-n k">${f(r.k[1])}</span></div>` +
      `<div class="dp-row"><span class="dp-l">multiply</span><span class="dp-n">${f(q[0] * r.k[0])}</span><span class="dp-n">${f(q[1] * r.k[1])}</span></div>` +
      `<p class="dp-sum">add: ${f(q[0] * r.k[0])} + ${f(q[1] * r.k[1])} = <b>${f(sc)}</b></p>` +
      `<p class="dp-note">${sc === Math.max(...R.map(x => q[0] * x.k[0] + q[1] * x.k[1])) ? `The highest score: the key of <b>${r.t}</b> points most in the direction of the query.` : sc === Math.min(...R.map(x => q[0] * x.k[0] + q[1] * x.k[1])) ? `The lowest score: the key of <b>${r.t}</b> points the most in a different direction from the query.` : `A middle score.`}</p>`;
  }
  words.innerHTML = '<span class="lt-lab">Key of</span>' + R.map((r, i) => `<button type="button" class="tk-chip lt-tok" data-i="${i}">${r.t}</button>`).join('');
  words.querySelectorAll('.lt-tok').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
  pick(0);
}

/* ---------- Part III: softmax ---------- */
function initSoftmax() {
  const grid = document.getElementById('sm-grid'), out = document.getElementById('sm-out'), R = QKV.rows;
  const base = R.map(r => QKV.q[0] * r.k[0] + QKV.q[1] * r.k[1]);
  grid.innerHTML = '<span class="sm-h">word</span><span class="sm-h">score</span><span class="sm-h" style="text-transform:none">e<sup>score</sup></span><span class="sm-h">weight</span>' +
    R.map((r, i) => `<span><span class="tk-chip">${r.t}</span></span><span class="sm-s"><input type="range" min="-2" max="6" step="0.5" value="${base[i]}" data-i="${i}" aria-label="score of ${r.t}"><b class="val"></b></span>` +
      `<span class="sm-e"><i></i><b></b></span><span class="sm-w"><i></i><b></b></span>`).join('') +
    '<span class="sm-tot">total</span><span></span><span class="sm-tot" id="sm-esum"></span><span class="sm-tot">1.000</span>';
  const ins = [...grid.querySelectorAll('input')], es = [...grid.querySelectorAll('.sm-e')], ws = [...grid.querySelectorAll('.sm-w')];
  const fe = (x) => x < 100 ? x.toFixed(2) : x.toFixed(1);
  function render() {
    const sc = ins.map(x => +x.value), ex = sc.map(Math.exp), Z = ex.reduce((a, b) => a + b, 0), w = ex.map(x => x / Z), mx = Math.max(...ex);
    ins.forEach((x, i) => { x.nextElementSibling.textContent = sc[i]; });
    es.forEach((c, i) => { c.querySelector('i').style.width = `${ex[i] / mx * 100}%`; c.querySelector('b').textContent = fe(ex[i]); });
    ws.forEach((c, i) => { c.querySelector('i').style.width = `${w[i] * 100}%`; c.querySelector('b').textContent = w[i].toFixed(3); });
    document.getElementById('sm-esum').textContent = fe(Z);
    const top = w.indexOf(Math.max(...w));
    out.innerHTML = `weight of <b>${R[top].t}</b> = e<sup>${sc[top]}</sup> / total = ${fe(ex[top])} / ${fe(Z)} = <b>${w[top].toFixed(3)}</b>`;
  }
  ins.forEach(x => x.addEventListener('input', render));
  document.getElementById('sm-reset').addEventListener('click', () => { ins.forEach((x, i) => { x.value = base[i]; }); render(); });
  render();
}

/* ---------- Part IV: word order ---------- */
function initWordOrder() {
  const t = document.getElementById('wo-table');
  t.innerHTML = `<thead><tr><th>Sentence A</th><th>Sentence B</th><th>mean of lookup embeddings</th><th>sentence embeddings</th></tr></thead><tbody>` +
    D.order.map(o => `<tr><td>${esc(o.a)}</td><td>${esc(o.b)}</td><td>${o.bag.toFixed(3)}</td><td class="hit">${o.st.toFixed(3)}</td></tr>`).join('') + '</tbody>';
}

/* ---------- Part V: encoder vs decoder mask ---------- */
function initMask() {
  const W = 'the cat sat on the mat because it was tired'.split(' '), svg = document.getElementById('mk-svg'), out = document.getElementById('mk-out'), gen = document.getElementById('mk-gen');
  let mode = 'enc', n = W.length, sel = 7;
  const btns = document.querySelectorAll('#mk-mode .strat-btn');
  const setMode = (m) => { mode = m; btns.forEach(b => b.classList.toggle('active', b.dataset.m === m)); };
  btns.forEach(b => b.addEventListener('click', () => { setMode(b.dataset.m); n = mode === 'enc' ? W.length : 4; sel = Math.min(sel, n - 1); render(); }));
  gen.addEventListener('click', () => { if (mode === 'enc') { setMode('dec'); n = 4; } else if (n < W.length) n++; sel = n - 1; render(); });
  document.getElementById('mk-reset').addEventListener('click', () => { setMode('enc'); n = W.length; sel = 7; render(); });
  function render() {
    gen.disabled = mode === 'dec' && n === W.length;
    svg.innerHTML = '';
    const x0 = 78, y0 = 68, c = 30;
    W.forEach((w, j) => txt(svg, x0 + j * c + c / 2 + 3, y0 - 8, w, 'hm-l' + (j >= n ? ' mk-off' : ''), 'start', { transform: `rotate(-55 ${x0 + j * c + c / 2 + 3} ${y0 - 8})` }));
    txt(svg, 4, 14, 'row = token, column = what it may attend to', 'tick');
    W.forEach((w, i) => {
      const lab = txt(svg, x0 - 6, y0 + i * c + c / 2 + 4, w, 'hm-l' + (i === sel ? ' cur' : '') + (i >= n ? ' mk-off' : ''), 'end');
      W.forEach((_, j) => {
        const exists = i < n && j < n, ok = exists && (mode === 'enc' || j <= i);
        const g = el('g', { class: 'hm-cell' }, svg);
        el('rect', { x: x0 + j * c + 1, y: y0 + i * c + 1, width: c - 2, height: c - 2, rx: 4, class: ok ? 'hm-w' + (mode === 'enc' && j > i ? ' mk-fut' : '') : 'hm-masked', 'fill-opacity': ok ? (i === sel ? 0.95 : 0.55) : 1 }, g);
        if (exists && !ok) txt(g, x0 + j * c + c / 2, y0 + i * c + c / 2 + 4, '✕', 'hm-v small', 'middle');
        if (i < n) g.addEventListener('click', () => { sel = i; render(); });
      });
      if (i < n) lab.addEventListener('click', () => { sel = i; render(); });
    });
    el('rect', { x: x0 - 1, y: y0 + sel * c, width: W.length * c + 2, height: c, rx: 5, class: 'hm-sel' }, svg);
    const seen = W.slice(0, mode === 'enc' ? n : sel + 1), later = mode === 'enc' ? W.slice(sel + 1, n) : [];
    out.innerHTML = mode === 'enc'
      ? `<p class="big">Encoder: <b>${esc(W[sel])}</b> sees all ${n} tokens</p><p>${seen.map(esc).join(' ')}</p><p class="note">${later.length ? `Including the <b>later</b> ones (${later.map(esc).join(' ')}): the whole input is available at once, so each vector is built from context on both sides. Right for representing a text.` : 'The last token sees everything before it, and every token sees it.'}</p>`
      : `<p class="big">Decoder, ${n} of ${W.length} words generated: <b>${esc(W[sel])}</b> sees ${sel + 1}</p><p>${seen.map(esc).join(' ')}</p><p class="note">Only itself and <b>earlier</b> tokens: when this position was generated, the later words did not exist yet. ${n < W.length ? 'Generate the next word: a new row appears, and it may look at everything before it.' : 'The sentence is complete.'}</p>`;
  }
  render();
}

/* ---------- Part VI: pooling ---------- */
function initPooling() {
  const P = D.pool, H = P.h0, box = document.getElementById('pl-strips'), out = document.getElementById('pl-out');
  const LABEL = { mean: 'mean pooling', cls: '[CLS] vector', max: 'max pooling' };
  let how = 'mean', q = 0;
  pills(document.getElementById('pl-how'), Object.entries(LABEL), how, (k) => { how = k; render(); });
  pills(document.getElementById('pl-q'), P.queries.map((x, i) => [i, x]), 0, (i) => { q = +i; render(); });
  function strip(parent, y, vec, label, cls) {
    const m = Math.max(...vec.map(Math.abs)), g = el('g', { class: 'pl-row ' + cls }, parent);
    txt(g, 70, y + 11, label, 'pl-l', 'end');
    vec.forEach((x, d) => el('rect', { x: 76 + d, y, width: 1.05, height: 14, style: `fill:${signColor(x, m)}` }, g));
    return g;
  }
  function render() {
    const rows = H.length, hgt = rows * 18 + 40;
    box.innerHTML = '';
    const svg = el('svg', { viewBox: `0 0 464 ${hgt}`, class: 'ml-plot pl-svg', 'shape-rendering': 'crispEdges', 'aria-label': 'Token vectors and pooled vector' }, box);
    H.forEach((h, i) => strip(svg, i * 18, h, P.tok0[i], how === 'cls' && i > 0 ? 'off' : how === 'cls' ? 'use' : ''));
    const v = poolVec(H, how);
    el('line', { x1: 76, x2: 460, y1: rows * 18 + 6, y2: rows * 18 + 6, class: 'grid-line' }, svg);
    strip(svg, rows * 18 + 16, v, how === 'cls' ? '[CLS]' : how, 'pooled');
    const s = P.scores[how][q], order = s.map((x, j) => [x, j]).sort((a, b) => b[0] - a[0]);
    out.innerHTML = `<p class="qe-query">query: <b>${esc(P.queries[q])}</b> · ${LABEL[how]}, then cosine</p><div class="em-bars">` +
      order.map(([x, j]) => `<div class="tq-row"><span class="tq-t">${esc(P.texts[j])}</span><span class="em-bar"><span style="width:${Math.max(0, x) * 100}%"></span></span><b class="tq-s">${f3(x)}</b></div>`).join('') +
      `</div><p class="rr-note">Scores between ${f3(Math.min(...s))} and ${f3(Math.max(...s))}. Each strip is scaled to its own largest value.</p>`;
  }
  render();
}

/* ---------- Part VI: generic vs trained ---------- */
function initGeneric() {
  const P = D.pool, G = D.generic, out = document.getElementById('gm-out');
  pills(document.getElementById('gm-q'), P.queries.map((x, i) => [i, x]), 3, (i) => render(+i));
  const col = (title, note, s) => {
    const order = s.map((x, j) => [x, j]).sort((a, b) => b[0] - a[0]);
    return `<div class="vs-card"><p class="al-h">${title}</p><p class="rr-note" style="margin-top:0;">${note}</p><div class="em-bars">` +
      order.map(([x, j]) => `<div class="tq-row gm-row"><span class="tq-t">${esc(P.texts[j])}</span><span class="em-bar"><span style="width:${Math.max(0, x) * 100}%"></span></span><b class="tq-s">${f3(x)}</b></div>`).join('') + '</div></div>';
  };
  function render(i) {
    out.innerHTML = col('roberta-large, generic', `${G.dim} dimensions, mean pooling`, G.scores[i]) + col('all-MiniLM-L6-v2, trained for similarity', '384 dimensions, mean pooling', P.scores.mean[i]);
  }
  render(3);
}

/* ---------- Part VII: map of phrases ---------- */
function initMap() {
  const M = D.map, svg = document.getElementById('mp-svg'), out = document.getElementById('mp-out');
  const W = 460, H = 360, pad = 40, xs = M.xy.map(p => p[0]), ys = M.xy.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const X = (v) => pad + (v - x0) / (x1 - x0) * (W - 2 * pad), Y = (v) => H - pad - (v - y0) / (y1 - y0) * (H - 2 * pad);
  let sel = 0;
  function render() {
    svg.innerHTML = '';
    el('text', { x: W - 8, y: H - 24, class: 'tick', 'text-anchor': 'end' }, svg).textContent = 'PCA 1 →';
    el('text', { x: 8, y: 14, class: 'tick' }, svg).textContent = '↑ PCA 2';
    const nn = M.sim[sel].map((s, j) => [s, j]).filter(([, j]) => j !== sel).sort((a, b) => b[0] - a[0]).slice(0, 3);
    nn.forEach(([, j]) => el('line', { x1: X(M.xy[sel][0]), y1: Y(M.xy[sel][1]), x2: X(M.xy[j][0]), y2: Y(M.xy[j][1]), class: 'mp-nn' }, svg));
    M.phrases.forEach((p, i) => {
      const g = el('g', { class: `mp-p ${M.groups[i]}${i === sel ? ' sel' : ''}`, tabindex: 0, role: 'button', 'aria-label': p }, svg);
      el('circle', { cx: X(M.xy[i][0]), cy: Y(M.xy[i][1]), r: i === sel ? 8 : 6 }, g);
      el('title', {}, g).textContent = p;
      const pick = () => { sel = i; render(); };
      g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    const left = M.xy[sel][0] > (x0 + x1) / 2;
    txt(svg, X(M.xy[sel][0]) + (left ? -12 : 12), Y(M.xy[sel][1]) + 4, M.phrases[sel], 'mp-l sel', left ? 'end' : 'start');
    [['car', 'cars'], ['med', 'medicine'], ['food', 'food'], ['hist', 'history']].forEach(([g, n], k) => { el('circle', { cx: 16 + k * 70, cy: H - 12, r: 5, class: 'mp-key ' + g }, svg); txt(svg, 25 + k * 70, H - 8, n, 'tick'); });
    const all = M.sim[sel].map((s, j) => [s, j]).filter(([, j]) => j !== sel).sort((a, b) => b[0] - a[0]);
    out.innerHTML = `<p class="al-h">${esc(M.phrases[sel])}</p><p class="note">cosine in 384 dimensions, highest first · click a phrase to select it</p><ol class="mp-list">` + all.map(([s, j]) => `<li class="${M.groups[j]}" data-j="${j}" tabindex="0"><span>${esc(M.phrases[j])}</span><b>${f3(s)}</b></li>`).join('') + '</ol>';
    out.querySelectorAll('.mp-list li').forEach(li => { const go = () => { sel = +li.dataset.j; render(); }; li.addEventListener('click', go); li.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); });
  }
  render();
}

/* ---------- Part VIII: model calls ---------- */
function initModelCalls() {
  const N = document.getElementById('mc-n'), Q = document.getElementById('mc-q'), out = document.getElementById('mc-out');
  function render() {
    const n = Math.round(Math.pow(10, +N.value)), q = Math.round(Math.pow(10, +Q.value)), ms = 5;
    document.getElementById('mc-n-val').textContent = big(n); document.getElementById('mc-q-val').textContent = big(q);
    const t = (calls) => { const s = calls * ms / 1000; return s < 60 ? s.toPrecision(3) + ' s' : s < 3600 ? (s / 60).toPrecision(3) + ' min' : s < 86400 * 2 ? (s / 3600).toPrecision(3) + ' h' : s < 86400 * 730 ? (s / 86400).toPrecision(3) + ' days' : (s / 86400 / 365).toPrecision(3) + ' years'; };
    out.innerHTML = `<div class="table-wrap"><table class="summary sc-small rr-num"><thead><tr><th></th><th>offline, once</th><th>online, per day</th><th>model time per day at 5 ms a call</th></tr></thead><tbody>` +
      `<tr><td><b>Bi-encoder</b></td><td>${big(n)} document encodings</td><td>${big(q)} query encodings</td><td class="hit">${t(q)}</td></tr>` +
      `<tr><td><b>Cross-encoder</b> (query and document together)</td><td>nothing can be precomputed</td><td>${big(n * q)} pair encodings</td><td>${t(n * q)}</td></tr></tbody></table></div>` +
      `<p class="rr-note">5 ms per model call is an illustrative figure. The bi-encoder still has to compare the query vector with ${big(n)} stored vectors, but a dot product is far cheaper than a model call (<a href="lab09-ann-faiss.html#exact">Lab 09</a>).</p>`;
  }
  [N, Q].forEach(s => s.addEventListener('input', render));
  render();
}

/* ---------- Part IX: tiny collection queries ---------- */
function initTinyQueries() {
  const T = D.tiny, out = document.getElementById('tq-out');
  pills(document.getElementById('tq-q'), T.queries.map((q, i) => [i, q]), 0, (i) => render(+i));
  function render(i) {
    const rows = T.texts.map((t, j) => [t, T.scores[i][j]]).sort((a, b) => b[1] - a[1]);
    const qw = new Set(T.queries[i].toLowerCase().split(/\s+/));
    out.innerHTML = `<div class="em-bars">` + rows.map(([t, s]) => { const shared = t.toLowerCase().split(/\s+/).filter(w => qw.has(w)); return `<div class="tq-row"><span class="tq-t">${esc(t)}${shared.length ? '' : ' <small class="tq-no">no shared word</small>'}</span><span class="em-bar"><span style="width:${Math.max(0, s) * 100}%"></span></span><b class="tq-s">${f3(s)}</b></div>`; }).join('') + '</div>';
  }
  render(0);
}

/* ---------- Part IX: failure cases ---------- */
function initFail() {
  const F = D.fail, out = document.getElementById('fl-out');
  const NOTE = {
    negation: ['negation', [2, 3], 'The dense model ranks the two neural-network texts first: the word "not" hardly moves the embedding. BM25 does no better (every score is 0), since no lexical method understands negation either.'],
    code: ['exact code', [2], 'The dense model puts a <b>different</b> error code first (0.937): similar-looking strings, similar vectors. The one text with the exact code is third. The tokenizer (Part II) cuts 0x80070005 into seven pieces (0, ##x, ##80, ##0, ##70, ##00, ##5), and the other codes are built from almost the same pieces. BM25 finds the right text at once, because the whole token 0x80070005 matches.'],
    year: ['number / year', [1], 'The dense model ranks RoBERTa (2019) and Sesame Street\'s Bert above the BERT paper; the year barely matters to it. BM25 on four texts gets it wrong too.'],
    rfc: ['identifier', [1], 'Dense: other RFCs look alike and rank above the text that actually mentions RFC 9309. BM25 finds it: the rare token 9309 decides.'],
    para: ['paraphrase', [0, 1], 'Here dense retrieval helps: "automobile maintenance and servicing" shares no word with the query, BM25 gives it 0, the dense model 0.376, above the unrelated texts.'],
  };
  pills(document.getElementById('fl-q'), Object.keys(F).map(k => [k, NOTE[k][0]]), 'code', render);
  function render(k) {
    const c = F[k], good = NOTE[k][1];
    const rank = (arr) => { const o = arr.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]); const r = []; o.forEach(([, i], k2) => { r[i] = k2 + 1; }); return r; };
    const rd = rank(c.dense), rb = rank(c.bm25), mb = Math.max(...c.bm25, 1e-9);
    out.innerHTML = `<p class="qe-query">query: <b>${esc(c.q)}</b></p><div class="table-wrap"><table class="summary sc-small rr-num fl-table"><thead><tr><th>candidate text</th><th>dense cosine</th><th>rank</th><th>BM25</th><th>rank</th></tr></thead><tbody>` +
      c.docs.map((t, i) => `<tr class="${good.includes(i) ? 'good' : ''}"><td>${esc(t)}</td><td><span class="fl-bar"><span style="width:${Math.max(0, c.dense[i]) * 100}%"></span></span>${f3(c.dense[i])}</td><td class="${rd[i] === 1 ? 'hl' : ''}">${rd[i]}</td><td><span class="fl-bar b"><span style="width:${c.bm25[i] / mb * 100}%"></span></span>${f3(c.bm25[i])}</td><td class="${rb[i] === 1 && c.bm25[i] > 0 ? 'hl' : ''}">${c.bm25[i] > 0 ? rb[i] : '–'}</td></tr>`).join('') + '</tbody></table></div>' +
      `<p class="rr-note">Green rows: what the user wanted. ${NOTE[k][2]}</p>`;
  }
  render('code');
}

/* ---------- Summary: pairwise heatmap ---------- */
function initHeatmap() {
  const M = D.map, t = document.getElementById('hm'), info = document.getElementById('hm-cell');
  const short = (p) => p.length > 22 ? p.slice(0, 20) + '…' : p;
  t.innerHTML = `<thead><tr><th></th>${M.phrases.map(p => `<th><span>${esc(short(p))}</span></th>`).join('')}</tr></thead><tbody>` +
    M.phrases.map((p, i) => `<tr><th>${esc(short(p))}</th>${M.sim[i].map((s, j) => `<td data-i="${i}" data-j="${j}" style="background:color-mix(in srgb, var(--indigo) ${Math.round(Math.max(0, s) * 100)}%, var(--surface));${s > 0.55 ? 'color:#fff;' : ''}" title="${esc(p)} · ${esc(M.phrases[j])}: ${f3(s)}">${s.toFixed(2)}</td>`).join('')}</tr>`).join('') + '</tbody>';
  t.querySelectorAll('td').forEach(c => c.addEventListener('click', () => { const i = +c.dataset.i, j = +c.dataset.j; t.querySelectorAll('td.on').forEach(x => x.classList.remove('on')); c.classList.add('on'); info.innerHTML = `<b>${esc(M.phrases[i])}</b> · <b>${esc(M.phrases[j])}</b>: cosine ${f3(M.sim[i][j])}`; }));
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  if (!D) return;
  if (VOC) initTokenizer();
  initLookup();
  initBankPics();
  initSelfAttn();
  initDotProduct();
  initSoftmax();
  initQKV();
  initWordOrder();
  initMask();
  initPooling();
  initGeneric();
  initMap();
  initModelCalls();
  initTinyQueries();
  initFail();
  initHeatmap();
});

}

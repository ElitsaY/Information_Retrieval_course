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

/* ---------- Part IV: one feed-forward unit (invented numbers) ---------- */
const UNIT = { inputs: [{ name: 'living thing', w: 1, x: 0.9 }, { name: 'tired', w: 1, x: 0.8 }, { name: 'a place', w: -1, x: 0.1 }], b: -1 };
function initUnit() {
  const box = document.getElementById('ff-in'), out = document.getElementById('ff-out'), f1 = (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
  box.innerHTML = UNIT.inputs.map((u, i) => `<div class="beam-control show"><label for="ff-x${i}">${u.name} <small>(weight ${u.w > 0 ? '+' : '−'}${Math.abs(u.w).toFixed(1)})</small></label><input type="range" id="ff-x${i}" min="0" max="1" step="0.1" value="${u.x}" autocomplete="off"><span class="val" id="ff-v${i}"></span></div>`).join('');
  const ins = UNIT.inputs.map((_, i) => document.getElementById('ff-x' + i));
  const svg = document.getElementById('ff-unit'), YS = [45, 118, 191], S = [270, 118];
  function draw(x, sum, y) {
    svg.innerHTML = '';
    const t = (px, py, str, cls, anchor = 'middle') => { const e = el('text', { x: px, y: py, class: cls, 'text-anchor': anchor }, svg); e.textContent = str; return e; };
    // edges: thickness = |weight × input|, colour = sign of the contribution
    UNIT.inputs.forEach((u, i) => {
      const c = u.w * x[i], y0 = YS[i];
      el('line', { x1: 125, y1: y0, x2: S[0] - 30, y2: S[1] + (y0 - S[1]) * 0.18, class: 'fu-e ' + (c > 0 ? 'pos' : c < 0 ? 'neg' : 'zero'), 'stroke-width': 1.5 + 6 * Math.abs(c) }, svg);
      const x2 = S[0] - 30, y2 = S[1] + (y0 - S[1]) * 0.18, mx = 180, my = y0 + (y2 - y0) * (mx - 125) / (x2 - 125), sw = 1.5 + 6 * Math.abs(c);
      t(mx, y2 < y0 ? my + 16 + sw / 2 : my - 7 - sw / 2 - (y2 > y0 ? 6 : 0), `× ${u.w > 0 ? '+' : '−'}${Math.abs(u.w)} = ${c < 0 ? '−' : c > 0 ? '+' : ''}${Math.abs(c).toFixed(1)}`, 'fu-w');
    });
    UNIT.inputs.forEach((u, i) => {
      el('circle', { cx: 105, cy: YS[i], r: 20, class: 'fu-in', style: `fill:color-mix(in srgb, var(--ids) ${Math.round(10 + 70 * x[i])}%, var(--surface))` }, svg);
      t(105, YS[i] + 5, x[i].toFixed(1), 'fu-v');
      t(78, YS[i] + 5, u.name, 'fu-n', 'end');
    });
    // bias
    el('rect', { x: S[0] - 34, y: 6, width: 68, height: 26, rx: 7, class: 'fu-b' }, svg);
    t(S[0], 24, `bias −${Math.abs(UNIT.b).toFixed(1)}`, 'fu-bt');
    el('line', { x1: S[0], y1: 32, x2: S[0], y2: S[1] - 30, class: 'fu-e neg', 'stroke-width': 1.5 + 6 * Math.abs(UNIT.b) / 1.5 }, svg);
    // sum node
    el('circle', { cx: S[0], cy: S[1], r: 28, class: 'fu-sum' }, svg);
    t(S[0], S[1] - 4, 'Σ', 'fu-sig');
    t(S[0], S[1] + 14, (sum < 0 ? '−' : '') + Math.abs(sum).toFixed(1), 'fu-v');
    // ReLU panel
    const X = (v) => 330 + (Math.max(-1.5, Math.min(1.5, v)) + 1.5) / 3 * 84, Y = (v) => 168 - Math.min(1.5, v) / 1.5 * 84;
    el('line', { x1: S[0] + 29, y1: S[1], x2: 322, y2: S[1], class: 'fu-ar' }, svg);
    el('rect', { x: 324, y: 74, width: 96, height: 104, rx: 8, class: 'fu-box' }, svg);
    el('line', { x1: 330, y1: 168, x2: 414, y2: 168, class: 'fu-ax' }, svg); el('line', { x1: X(0), y1: 80, x2: X(0), y2: 172, class: 'fu-ax' }, svg);
    el('polyline', { points: `${X(-1.5)},${Y(0)} ${X(0)},${Y(0)} ${X(1.5)},${Y(1.5)}`, class: 'fu-relu' }, svg);
    el('circle', { cx: X(sum), cy: Y(Math.max(0, sum)), r: 5.5, class: 'fu-dot' + (y > 0 ? ' on' : '') }, svg);
    t(372, 68, 'ReLU', 'fu-n');
    // output
    el('line', { x1: 421, y1: S[1], x2: 426, y2: S[1], class: 'fu-ar' }, svg);
    el('circle', { cx: 450, cy: S[1], r: 22, class: 'fu-out' + (y > 0 ? ' on' : ''), style: `fill:color-mix(in srgb, var(--ucs) ${Math.round(8 + 80 * Math.min(1, y))}%, var(--surface))` }, svg);
    t(450, S[1] + 5, y.toFixed(1), 'fu-v');
    t(450, S[1] + 38, y > 0 ? 'on' : 'off', 'fu-st' + (y > 0 ? ' on' : ''));
    [['inputs', 105], ['× weights', 190], ['add + bias', S[0]], ['on or off', 372], ['output', 450]].forEach(([s, px]) => t(px, 230, s, 'fu-cap'));
  }
  function render() {
    const x = ins.map(e => +e.value), sum = Math.round(x.reduce((a, v, i) => a + UNIT.inputs[i].w * v, UNIT.b) * 100) / 100, y = Math.max(0, sum);
    x.forEach((v, i) => { document.getElementById('ff-v' + i).textContent = v.toFixed(1); });
    draw(x, sum, y);
    const terms = x.map((v, i) => `${UNIT.inputs[i].w > 0 ? (i ? '+ ' : '') : '− '}${v.toFixed(1)}`).join(' ');
    out.innerHTML = `weighted sum: ${terms} − 1.0 (bias) = <b>${f1(sum)}</b> → ReLU → <b>${y.toFixed(1)}</b>` +
      `<span class="ff-bar"><i style="width:${Math.min(1, y) * 100}%"></i></span>` +
      (y > 0 ? `The unit is <b>on</b>: “a tired living thing” is present.` : `The unit is <b>off</b> (output 0): the pattern is not there.`);
  }
  ins.forEach(e => e.addEventListener('input', render));
  render();
}

/* ---------- Part V: residual connection and normalization (invented numbers) ---------- */
const RS = { x: [2.0, -1.0, 0.5, 3.5], f: [0.6, 0.4, -0.8, 0.2] };
function initResidual() {
  const out = document.getElementById('rs-out'), f2s = (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
  let on = true;
  const bars = (v, cls) => `<div class="rs-bars">${v.map(x => `<span class="rs-b"><i class="${cls}${x < 0 ? ' neg' : ''}" style="height:${Math.min(100, Math.abs(x) / 4 * 100)}%"></i><b>${f2s(x)}</b></span>`).join('')}</div>`;
  function render() {
    const add = on ? RS.x.map((v, i) => +(v + RS.f[i]).toFixed(4)) : RS.f.slice();
    const mean = add.reduce((a, b) => a + b, 0) / add.length, sd = Math.sqrt(add.reduce((a, b) => a + (b - mean) ** 2, 0) / add.length);
    const norm = add.map(v => (v - mean) / sd);
    const step = (n, title, sub, v, cls, extra = '') => `<div class="rs-step${extra}"><p class="rs-h"><span>${n}</span>${title}<small>${sub}</small></p>${bars(v, cls)}</div>`;
    out.innerHTML = `<div class="rs-steps">` +
      step(1, 'input x', 'the token vector', RS.x, 'x') +
      step(2, 'block(x)', 'what the block wants to add', RS.f, 'f') +
      step(3, on ? 'x + block(x)' : 'block(x) only', on ? 'residual: add, don\'t replace' : 'no residual: x is thrown away', add, on ? 'a' : 'f', on ? '' : ' lost') +
      step(4, 'normalize', `average ${f2s(mean)} → 0, spread ${f2s(sd)} → 1`, norm, 'n') + `</div>` +
      `<p class="lt-out">${on ? 'The output still carries the input: the biggest number is still in position 4, as in x, now slightly corrected by the block.' : 'Without the residual connection the output depends only on block(x): position 4, the largest number of x, is no longer the largest. Whatever the block did not copy is lost.'}</p>`;
  }
  pills(document.getElementById('rs-mode'), [['on', 'with residual connection'], ['off', 'without']], 'on', (v) => { on = v === 'on'; render(); });
  render();
}

/* ---------- Part V: word order with and without positions ---------- */
const WO = [
  { a: 'dog bites man', b: 'man bites dog', ma: 'the dog does the biting', mb: 'the man does the biting' },
  { a: 'flights from Sofia to London', b: 'flights from London to Sofia', ma: 'you start in Sofia', mb: 'you start in London' },
];
function initWordOrder() {
  const out = document.getElementById('wo-out');
  let k = 0, pos = false;
  function row(label, toks, other, meaning) {
    const seen = pos ? toks.map((t, i) => `<span class="tk-chip${other[i] !== t ? ' wo-diff' : ''}">${esc(t)}<sub>${i + 1}</sub></span>`)
      : toks.slice().sort().map(t => `<span class="tk-chip wo-bag">${esc(t)}</span>`);
    return `<div class="wo-row"><span class="wo-l">${label}</span><div class="wo-col"><p class="wo-s">${toks.map(esc).join(' ')} <small>(${meaning})</small></p>` +
      `<div class="wo-seen"><span class="wo-h">${pos ? 'model sees: tokens + positions' : 'model sees: a bag of tokens'}</span>${seen.join('')}</div></div></div>`;
  }
  function render() {
    const P = WO[k], A = P.a.split(' '), B = P.b.split(' ');
    out.innerHTML = row('A', A, B, P.ma) + row('B', B, A, P.mb) +
      `<p class="wo-verdict ${pos ? 'ok' : 'bad'}">${pos ? `<b>Different:</b> the highlighted tokens sit at different positions, so the model can tell the two sentences apart.` : `<b>Identical:</b> both sentences give exactly the same tokens, so the model could not tell them apart.`}</p>`;
  }
  pills(document.getElementById('wo-pair'), WO.map((p, i) => [String(i), `${p.a} / ${p.b}`]), '0', (v) => { k = +v; render(); });
  pills(document.getElementById('wo-mode'), [['off', 'without positions'], ['on', 'with positions']], 'off', (v) => { pos = v === 'on'; render(); });
  render();
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
  initUnit();
  initResidual();
  initWordOrder();
});

}

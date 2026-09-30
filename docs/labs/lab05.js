/* ===== Lab 05 interactivity ===== */

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
const f4 = (v) => (Math.abs(v) < 5e-5 ? '0' : v.toFixed(4));
function pills(box, items, cur, onPick) {
  box.innerHTML = '';
  items.forEach(([k, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'strat-btn' + (k === cur ? ' active' : ''); b.textContent = label; b.dataset.k = k;
    b.addEventListener('click', () => { box.querySelectorAll('.strat-btn').forEach(x => x.classList.toggle('active', x === b)); onPick(k); });
    box.appendChild(b);
  });
}
function mathIn(node) { if (window.renderMathInElement) renderMathInElement(node, { delimiters: [{ left: '\\(', right: '\\)', display: false }], throwOnError: false }); }


/* ====================== Cranfield ====================== */
const C = typeof CRAN !== 'undefined' ? CRAN : null;
const unflat = (flat) => { const m = []; for (let i = 0; i < flat.length; i += 2) m.push([flat[i], flat[i + 1]]); return m; };
let IDX = null;            // \b\w+\b tokens, for scikit-learn's TF-IDF
function buildIndex() {
  if (IDX || !C) return IDX;
  IDX = { N: C.ids.length, V: C.vocab, docTerms: C.terms.map(unflat), vocabId: new Map(C.vocab.map((w, i) => [w, i])) };
  return IDX;
}
const queryTokens = (q) => (q.toLowerCase().match(/[\p{L}\p{N}_]+/gu) || []);
// TfidfVectorizer(lowercase=True, norm="l2"): tokens of 2+ word characters, smoothed idf, raw tf, L2-normalized rows
let TFIDF = null;
function tfidfSystem() {
  if (TFIDF) return TFIDF;
  const I = buildIndex(), df = new Map(), docs = [];
  I.docTerms.forEach(ts => {
    const m = new Map();
    ts.forEach(([t, f]) => { const w = I.V[t]; if (w.length >= 2) m.set(w, f); });
    docs.push(m); m.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1));
  });
  const idf = new Map([...df].map(([w, d]) => [w, Math.log((1 + I.N) / (1 + d)) + 1]));
  const post = new Map(), dnorm = [];
  docs.forEach((m, i) => { let s = 0; m.forEach((f, w) => { const x = f * idf.get(w); s += x * x; if (!post.has(w)) post.set(w, []); post.get(w).push([i, f]); }); dnorm.push(Math.sqrt(s)); });
  return (TFIDF = { df, idf, post, dnorm });
}
function topK(scores, k) { return scores.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0] || b[1] - a[1]).slice(0, k); }   // like argsort()[::-1]
function searchTfidf(q, k = 100) {
  const I = buildIndex(), S = tfidfSystem(), scores = new Array(I.N).fill(0);
  const qc = new Map(); queryTokens(q).forEach(w => { if (w.length >= 2 && S.idf.has(w)) qc.set(w, (qc.get(w) || 0) + 1); });
  let qn = 0; qc.forEach((f, w) => { const x = f * S.idf.get(w); qn += x * x; }); qn = Math.sqrt(qn);
  if (qn > 0) qc.forEach((f, w) => { const qw = f * S.idf.get(w) / qn; S.post.get(w).forEach(([i, tf]) => { scores[i] += qw * tf * S.idf.get(w) / S.dnorm[i]; }); });
  return topK(scores, k).map(([s, i], r) => ({ rank: r + 1, i, doc_id: C.ids[i], score: s }));
}
// rank_bm25's BM25Okapi on text.lower().split() tokens: idf = ln(N - df + 0.5) - ln(df + 0.5), negative idf -> 0.25 * average idf
let OK = null;
function okapiIndex() {
  if (OK || !C) return OK;
  const N = C.ids.length, docTerms = C.wterms.map(unflat), len = docTerms.map(ts => ts.reduce((s, [, f]) => s + f, 0));
  const avgdl = len.reduce((a, b) => a + b, 0) / N, post = new Map();
  docTerms.forEach((ts, i) => ts.forEach(([t, f]) => { if (!post.has(t)) post.set(t, []); post.get(t).push([i, f]); }));
  const idf = new Map(); let sum = 0;
  post.forEach((p, t) => { const v = Math.log(N - p.length + 0.5) - Math.log(p.length + 0.5); idf.set(t, v); sum += v; });
  const eps = 0.25 * sum / idf.size;
  idf.forEach((v, t) => { if (v < 0) idf.set(t, eps); });
  return (OK = { N, len, avgdl, post, idf, wid: new Map(C.wvocab.map((w, i) => [w, i])) });
}
function searchBm25(q, k = 100, k1 = 1.5, b = 0.75) {
  const O = okapiIndex(), scores = new Array(O.N).fill(0);
  q.toLowerCase().split(/\s+/).filter(Boolean).forEach(w => {            // every query token, repeats included
    const t = O.wid.get(w); if (t === undefined) return;
    const idf = O.idf.get(t);
    O.post.get(t).forEach(([i, tf]) => { scores[i] += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * O.len[i] / O.avgdl)); });
  });
  return topK(scores, k).map(([s, i], r) => ({ rank: r + 1, i, doc_id: C.ids[i], score: s }));
}
const qLabel = (i) => `${i + 1} · ${C.queries[i].length > 90 ? C.queries[i].slice(0, 88) + '…' : C.queries[i]}`;
function fillQuerySelect(sel, cur = 0) { sel.innerHTML = C.queries.map((_, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${esc(qLabel(i))}</option>`).join(''); }
const sameList = (a, b) => a.every((r, k) => r.doc_id === b[k].doc_id);
const overlap = (a, b) => a.filter(r => b.some(s => s.doc_id === r.doc_id)).length;


/* ---------- evaluation measures (the definitions trec_eval / ir_measures use) ---------- */
// run: ranked list of doc ids; judged: {doc_id: grade}; relevant means grade >= rel
function relevantCount(judged, rel = 1) { return Object.values(judged).filter(g => g >= rel).length; }
function precisionAt(run, judged, k, rel = 1) { let h = 0; for (let i = 0; i < k; i++) if (i < run.length && (judged[run[i]] ?? 0) >= rel) h++; return h / k; }
function recallAt(run, judged, k, rel = 1) { const R = relevantCount(judged, rel); if (!R) return 0; let h = 0; for (let i = 0; i < Math.min(k, run.length); i++) if ((judged[run[i]] ?? 0) >= rel) h++; return h / R; }
function reciprocalRank(run, judged, rel = 1) { for (let i = 0; i < run.length; i++) if ((judged[run[i]] ?? 0) >= rel) return 1 / (i + 1); return 0; }
function averagePrecision(run, judged, rel = 1) {
  const R = relevantCount(judged, rel); if (!R) return 0;
  let h = 0, s = 0; run.forEach((d, i) => { if ((judged[d] ?? 0) >= rel) { h++; s += h / (i + 1); } });
  return s / R;
}
// gain(g): linear = g (ir_measures' default nDCG, dcg='log2'), exp = 2^g - 1 (dcg='exp-log2'); grades below 0 count as 0
const gainOf = (g, exp) => (g <= 0 ? 0 : exp ? Math.pow(2, g) - 1 : g);
function dcg(grades, k, exp) { let s = 0; grades.slice(0, k).forEach((g, i) => { s += gainOf(g, exp) / Math.log2(i + 2); }); return s; }
function ndcgAt(run, judged, k, exp = false) {
  const ideal = Object.values(judged).filter(g => g > 0).sort((a, b) => b - a);
  const idcg = dcg(ideal, k, exp); if (!idcg) return 0;
  return dcg(run.map(d => judged[d] ?? 0), k, exp) / idcg;
}
const MEASURES = [
  ['P@10', 'P(rel=1)@10', (r, j) => precisionAt(r, j, 10)],
  ['Recall@100', 'Recall(rel=1)@100', (r, j) => recallAt(r, j, 100)],
  ['MRR', 'RR(rel=1)', (r, j) => reciprocalRank(r, j)],
  ['MAP', 'AP(rel=1)', (r, j) => averagePrecision(r, j)],
  ['nDCG@10', 'nDCG@10', (r, j) => ndcgAt(r, j, 10, false)],
];

/* ---------- maths ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- hero: ranked lists with relevant / non-relevant marks ---------- */
function initHero() {
  const svg = document.getElementById('ev-hero-bg');
  const r = rng(12);
  for (let c = 0; c < 8; c++) {
    const x0 = c * 160 - 20 + r() * 30, y0 = 12 + r() * 50;
    for (let i = 0; i < 9; i++) {
      const rel = r() < 0.45 - i * 0.04;
      el('rect', { x: x0, y: y0 + i * 26, width: 84 - i * 5, height: 15, rx: 6, class: 'bar' + (rel ? ' rel' : '') }, svg);
    }
  }
}

/* ---------- Part I: which system is better? ---------- */
function initWhich() {
  const A = ['D8', 'D4', 'D19', 'D2', 'D7'], B = ['D2', 'D8', 'D3', 'D19', 'D4'];
  const box = document.getElementById('wh-box'), out = document.getElementById('wh-out');
  const all = [...new Set([...A, ...B])].sort((x, y) => +x.slice(1) - +y.slice(1));
  const judged = {};
  function render() {
    const nRel = Object.values(judged).filter(Boolean).length;
    const row = (name, L) => `<div class="wh-row"><span class="wh-name">System ${name}</span>${L.map((d, i) => `<button type="button" class="wh-doc${judged[d] ? ' rel' : ''}" data-d="${d}"><small>${i + 1}</small>${d}</button>`).join('')}</div>`;
    box.innerHTML = row('A', A) + row('B', B);
    box.querySelectorAll('.wh-doc').forEach(b => b.addEventListener('click', () => { judged[b.dataset.d] = !judged[b.dataset.d]; render(); }));
    if (!nRel) { out.innerHTML = `<p class="big">Which system is better? <b>We do not know.</b></p><p class="note">Click documents to mark them relevant (as an assessor would). The documents are ${all.join(', ')}.</p>`; return; }
    const J = Object.fromEntries(Object.entries(judged).map(([d, v]) => [d, v ? 1 : 0]));
    const m = (L) => [precisionAt(L, J, 5), reciprocalRank(L, J), averagePrecision(L, J)];
    const [a, b] = [m(A), m(B)];
    const cell = (x, y) => `<td class="${x > y + 1e-9 ? 'win' : ''}">${x.toFixed(3)}</td>`;
    out.innerHTML = `<p class="note">${nRel} relevant document${nRel > 1 ? 's' : ''} marked: ${all.filter(d => judged[d]).join(', ')} (and we assume no others exist).</p>` +
      `<div class="rr-tw"><table class="summary sc-small rr-num"><thead><tr><th></th><th>P@5</th><th>RR</th><th>AP</th></tr></thead><tbody>` +
      `<tr><td>System A</td>${a.map((x, i) => cell(x, b[i])).join('')}</tr><tr><td>System B</td>${b.map((x, i) => cell(x, a[i])).join('')}</tr></tbody></table></div>` +
      `<p class="note" style="margin-top:0.5rem;">The better system depends on which documents are relevant, and sometimes on which measure you look at.</p>`;
  }
  render();
}

/* ---------- Part II: precision at k ---------- */
function initPrecision() {
  const K = document.getElementById('pc-k'), list = document.getElementById('pc-list'), out = document.getElementById('pc-out');
  const L = [true, false, true, false, true];
  function render() {
    const k = +K.value; document.getElementById('pc-k-val').textContent = k;
    const card = (x, i) => `<button type="button" class="pc-doc${x ? ' rel' : ''}${i < k ? '' : ' out'}" data-i="${i}"><small>rank ${i + 1}</small><b>D${i + 1}</b><span>${x ? 'relevant' : 'not relevant'}</span></button>`;
    list.innerHTML = `<div class="pc-ret"><span class="pc-lab">retrieved: top ${k}</span><div class="pc-row">${L.slice(0, k).map(card).join('')}</div></div>` +
      (k < L.length ? `<div class="pc-rest"><span class="pc-lab">not retrieved</span><div class="pc-row">${L.slice(k).map((x, j) => card(x, k + j)).join('')}</div></div>` : '');
    list.querySelectorAll('.pc-doc').forEach(b => b.addEventListener('click', () => { L[+b.dataset.i] = !L[+b.dataset.i]; render(); }));
    const r = L.slice(0, k).filter(Boolean).length, P = L.map((_, j) => L.slice(0, j + 1).filter(Boolean).length / (j + 1));
    out.innerHTML = `<p class="big">\\(P@${k} = \\dfrac{\\text{relevant in the top ${k}}}{${k}} = \\dfrac{${r}}{${k}} = \\) <b>${(r / k).toFixed(3)}</b></p>` +
      `<div class="pc-bar">${L.slice(0, k).map(x => `<span class="${x ? 'rel' : ''}"></span>`).join('')}</div>` +
      `<div class="rr-tw" style="margin-top:0.7rem;"><table class="summary sc-small rr-num"><thead><tr><th>k</th>${P.map((_, j) => `<th>${j + 1}</th>`).join('')}</tr></thead><tbody><tr><td>P@k</td>${P.map((v, j) => `<td class="${j === k - 1 ? 'hl' : ''}">${v.toFixed(2)}</td>`).join('')}</tr></tbody></table></div>` +
      `<p class="note">${k < L.length && L.slice(k).some(Boolean) ? `The relevant document${L.slice(k).filter(Boolean).length > 1 ? 's' : ''} below the cutoff do${L.slice(k).filter(Boolean).length > 1 ? '' : 'es'} not count: precision only judges what was retrieved.` : 'Precision only judges what was retrieved.'}</p>`;
    mathIn(out);
  }
  K.addEventListener('input', render);
  render();
}

/* ---------- Part II: recall at k ---------- */
function initRecall() {
  const K = document.getElementById('rc-k'), Xs = document.getElementById('rc-x'), grid = document.getElementById('rc-grid'), out = document.getElementById('rc-out');
  const ranked = [1, 2, 3, 4, 5], relInRanking = [1, 3, 5], outside = [12, 19, 24, 29];
  function render() {
    const k = +K.value, x = +Xs.value;
    document.getElementById('rc-k-val').textContent = k; document.getElementById('rc-x-val').textContent = x;
    const rel = new Set([...relInRanking, ...outside.slice(0, x)]), ret = new Set(ranked.slice(0, k));
    grid.innerHTML = Array.from({ length: 30 }, (_, i) => {
      const d = i + 1, r = rel.has(d), t = ret.has(d);
      return `<span class="rc-doc${t ? ' ret' : ''}${r ? (t ? ' found' : ' miss') : ''}" title="D${d}${r ? ', relevant' : ''}${t ? ', retrieved' : ''}">D${d}</span>`;
    }).join('');
    const found = [...rel].filter(d => ret.has(d)).length, R = rel.size, missed = [...rel].filter(d => !ret.has(d));
    out.innerHTML = `<p class="big">\\(Recall@${k} = \\dfrac{\\text{relevant in the top ${k}}}{\\text{all relevant}} = \\dfrac{${found}}{${R}} = \\) <b>${(found / R).toFixed(3)}</b></p>` +
      `<p class="note">Missed: ${missed.length ? missed.map(d => 'D' + d).join(', ') : 'none'}. ${x ? `${x} relevant document${x > 1 ? 's lie' : ' lies'} outside the ranking: no cutoff can find ${x > 1 ? 'them' : 'it'}, so even Recall@5 is only 3/${R}.` : 'Every relevant document is in the ranking, so Recall@5 = 1.'} For comparison, \\(P@${k} = ${found}/${k}\\) ignores the missed ones.</p>`;
    mathIn(out);
  }
  [K, Xs].forEach(e => e.addEventListener('input', render));
  render();
}

/* ---------- Parts II–III: a binary ranking playground ---------- */
function initPlayground() {
  const box = document.getElementById('pg-rank'), rIn = document.getElementById('pg-R'), svg = document.getElementById('pg-svg'), out = document.getElementById('pg-out');
  const PRE = { toy: ['R N R N R', 3], A: ['R R R N N N N N N N', 3], B: ['N N N N N N N R R R', 3], mixed: ['N R N N R N R N N N', 5] };
  let L = [];
  const load = (k) => { L = PRE[k][0].split(' ').map(x => x === 'R'); rIn.value = PRE[k][1]; render(); };
  pills(document.getElementById('pg-presets'), [['toy', 'Toy: R N R N R'], ['A', 'Ranking A'], ['B', 'Ranking B'], ['mixed', '5 relevant, 3 found']], 'toy', load);
  rIn.addEventListener('input', render);
  function render() {
    const found = L.filter(Boolean).length;
    if (+rIn.value < found) rIn.value = found;
    const R = +rIn.value, n = L.length;
    box.innerHTML = L.map((x, i) => `<button type="button" class="pg-cell${x ? ' rel' : ''}" data-i="${i}"><small>${i + 1}</small>${x ? 'R' : 'N'}</button>`).join('') +
      (n < 10 ? `<button type="button" class="pg-add" title="Add a rank">+</button>` : '') + (n > 1 ? `<button type="button" class="pg-add" data-del="1" title="Remove the last rank">−</button>` : '');
    box.querySelectorAll('.pg-cell').forEach(b => b.addEventListener('click', () => { L[+b.dataset.i] = !L[+b.dataset.i]; render(); }));
    box.querySelectorAll('.pg-add').forEach(b => b.addEventListener('click', () => { if (b.dataset.del) L.pop(); else L.push(false); render(); }));
    const P = L.map((_, k) => L.slice(0, k + 1).filter(Boolean).length / (k + 1)), Rc = L.map((_, k) => L.slice(0, k + 1).filter(Boolean).length / R);
    // plot P@k and Recall@k
    svg.innerHTML = '';
    const W = 460, H = 240, X0 = 40, Rm = 14, T = 12, B = 36, x = (k) => X0 + (n > 1 ? k / (n - 1) : 0.5) * (W - X0 - Rm), y = (v) => H - B - v * (H - B - T);
    [0, 0.5, 1].forEach(v => { el('line', { x1: X0, x2: W - Rm, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, X0 - 6, y(v) + 4, v, 'tick', 'end'); });
    L.forEach((rel, k) => { txt(svg, x(k), H - B + 16, k + 1, 'tick', 'middle'); if (rel) el('rect', { x: x(k) - 9, y: T, width: 18, height: H - B - T, class: 'pg-relband' }, svg); });
    [[P, 'pg-p'], [Rc, 'pg-r']].forEach(([v, cls]) => { el('polyline', { points: v.map((p, k) => `${x(k)},${y(p)}`).join(' '), class: cls }, svg); v.forEach((p, k) => el('circle', { cx: x(k), cy: y(p), r: 3.5, class: cls + '-d' }, svg)); });
    txt(svg, X0 + (W - X0 - Rm) / 2, H - 4, 'rank k', 'tick', 'middle');
    const ranks = L.map((x, i) => (x ? i + 1 : 0)).filter(Boolean);
    const rr = ranks.length ? 1 / ranks[0] : 0;
    const ap = ranks.reduce((s, r, j) => s + (j + 1) / r, 0) / R;
    const frac = (a, b) => `\\tfrac{${a}}{${b}}`;
    out.innerHTML = `<div class="rr-tw"><table class="summary sc-small rr-num"><thead><tr><th>k</th>${L.map((_, k) => `<th>${k + 1}</th>`).join('')}</tr></thead><tbody>` +
      `<tr><td>P@k</td>${P.map(v => `<td>${v.toFixed(2)}</td>`).join('')}</tr><tr><td>Recall@k</td>${Rc.map(v => `<td>${v.toFixed(2)}</td>`).join('')}</tr></tbody></table></div>` +
      `<p class="big" style="margin-top:0.6rem;">RR = ${ranks.length ? `\\(1 / ${ranks[0]}\\) = <b>${rr.toFixed(3)}</b>` : '<b>0</b> (no relevant result)'}</p>` +
      `<p class="big">AP = ${ranks.length ? `\\(\\dfrac{${ranks.map((r, j) => frac(j + 1, r)).join(' + ')}${found < R ? ' + 0'.repeat(0) : ''}}{${R}}\\)` : '0'} = <b>${ap.toFixed(3)}</b></p>` +
      (found < R ? `<p class="note">${R - found} relevant document${R - found > 1 ? 's are' : ' is'} never retrieved: ${R - found > 1 ? 'they add' : 'it adds'} 0 to the sum but still count in the denominator.</p>` : '');
    mathIn(out);
  }
  load('toy');
}

/* ---------- Part IV: DCG and nDCG ---------- */
function initDcg() {
  const inp = document.getElementById('dg-in'), out = document.getElementById('dg-out');
  let exp = true;
  inp.value = '3, 0, 2, 1';
  pills(document.getElementById('dg-gain'), [['exp', 'gain = 2^rel − 1'], ['lin', 'gain = rel (ir_measures default)']], 'exp', k => { exp = k === 'exp'; render(); });
  document.getElementById('dg-ideal').addEventListener('click', () => { inp.value = inp.value.split(/[\s,]+/).filter(Boolean).map(Number).sort((a, b) => b - a).join(', '); render(); });
  function table(grades, label) {
    let cum = 0;
    return `<p class="al-h">${label}</p><div class="rr-tw"><table class="summary sc-small rr-num"><thead><tr><th>rank i</th><th>rel</th><th>gain</th><th>log₂(i+1)</th><th>gain / log₂(i+1)</th><th>running DCG</th></tr></thead><tbody>` +
      grades.map((g, i) => { const gn = gainOf(g, exp), d = Math.log2(i + 2); cum += gn / d; return `<tr><td>${i + 1}</td><td>${g}</td><td>${gn}</td><td>${d.toFixed(3)}</td><td>${(gn / d).toFixed(3)}</td><td>${cum.toFixed(3)}</td></tr>`; }).join('') + '</tbody></table></div>';
  }
  function render() {
    const g = inp.value.split(/[\s,]+/).filter(Boolean).map(Number).filter(v => Number.isFinite(v) && v >= 0 && v <= 4).slice(0, 10);
    if (!g.length) { out.innerHTML = '<p class="note">Type grades from 0 to 4, e.g. 3, 0, 2, 1.</p>'; return; }
    const ideal = g.slice().sort((a, b) => b - a), k = g.length, D = dcg(g, k, exp), I = dcg(ideal, k, exp);
    out.innerHTML = table(g, 'System ranking') + table(ideal, 'Ideal ranking (highest grade first)') +
      `<p class="big" style="margin-top:0.6rem;">DCG@${k} = <b>${D.toFixed(4)}</b>, IDCG@${k} = <b>${I.toFixed(4)}</b>, nDCG@${k} = ${D.toFixed(4)} / ${I.toFixed(4)} = <b>${I ? (D / I).toFixed(4) : '—'}</b></p>`;
  }
  inp.addEventListener('input', render);
  render();
}

/* ---------- Cranfield: runs and per-query measures, computed once ---------- */
let EV = null;
function evaluate() {
  if (EV || !C) return EV;
  const sys = { tfidf: C.queries.map(q => searchTfidf(q, 100).map(r => r.doc_id)), bm25: C.queries.map(q => searchBm25(q, 100).map(r => r.doc_id)) };
  const per = {}, agg = {};
  Object.entries(sys).forEach(([s, runs]) => {
    per[s] = {}; agg[s] = {};
    MEASURES.forEach(([name, , f]) => { per[s][name] = runs.map((run, i) => f(run, C.qrels[String(i + 1)])); agg[s][name] = per[s][name].reduce((a, b) => a + b, 0) / runs.length; });
    per[s]['nDCG@10 (2^rel−1)'] = runs.map((run, i) => ndcgAt(run, C.qrels[String(i + 1)], 10, true));
    agg[s]['nDCG@10 (2^rel−1)'] = per[s]['nDCG@10 (2^rel−1)'].reduce((a, b) => a + b, 0) / runs.length;
  });
  return (EV = { sys, per, agg });
}
const GRADE_DEF = { 4: 'complete answer', 3: 'high relevance', 2: 'useful', 1: 'minimum interest', '-1': 'no interest' };
const gradeBadge = (g) => `<span class="rr-g ${g === null || g === undefined ? 'none' : 'g' + (g < 0 ? 'n' : g)}" title="${g === null || g === undefined ? 'not judged' : 'grade ' + g + ': ' + GRADE_DEF[g]}">${g === null || g === undefined ? '–' : g}</span>`;
function initGrades() {
  const cnt = {}; Object.values(C.qrels).forEach(m => Object.values(m).forEach(g => { cnt[g] = (cnt[g] || 0) + 1; }));
  const tot = Object.values(cnt).reduce((a, b) => a + b, 0);
  const DEF = { 4: 'References which are a complete answer to the question.', 3: 'A high degree of relevance: without them the research would have been impracticable or much more work.', 2: 'Useful, as general background or for methods for some aspects of the work.', 1: 'Minimum interest, e.g. included from a historical viewpoint.', '-1': 'References of no interest.' };
  document.getElementById('gr-table').innerHTML = `<thead><tr><th>grade</th><th>meaning (ir_datasets)</th><th>judgments</th><th>binary (rel ≥ 1)</th></tr></thead><tbody>` +
    ['4', '3', '2', '1', '-1'].map(g => `<tr><td>${gradeBadge(+g)}</td><td>${DEF[g]}</td><td>${cnt[g]} (${(100 * cnt[g] / tot).toFixed(1)}%)</td><td>${+g >= 1 ? 'relevant' : 'not relevant'}</td></tr>`).join('') + '</tbody>';
}
function initEvalTable() {
  const E = evaluate(), t = document.getElementById('ev-table');
  const names = [...MEASURES.map(m => m[0]), 'nDCG@10 (2^rel−1)'];
  t.innerHTML = `<thead><tr><th>measure</th><th>TF-IDF</th><th>BM25</th><th>difference</th><th>what it rewards</th></tr></thead><tbody>` +
    names.map((n, i) => {
      const a = E.agg.tfidf[n], b = E.agg.bm25[n], d = b - a;
      const why = ['clean top 10', 'finding the relevant material within 100', 'an early first relevant result', 'relevant results high throughout', 'high grades near the top (linear gain)', 'high grades near the top (exponential gain)'][i];
      return `<tr><td><b>${n}</b></td><td class="${a > b ? 'win' : ''}">${a.toFixed(4)}</td><td class="${b > a ? 'win' : ''}">${b.toFixed(4)}</td><td>${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(4)} (${d >= 0 ? '+' : '−'}${Math.abs(100 * d / a).toFixed(1)}%)</td><td class="note">${why}</td></tr>`;
    }).join('') + '</tbody>';
}

/* ---------- per-query analysis ---------- */
function initPerQuery() {
  const E = evaluate(), svg = document.getElementById('pq-svg'), out = document.getElementById('pq-out'), sel = document.getElementById('pq-sel');
  let metric = 'MAP';
  pills(document.getElementById('pq-metric'), ['MAP', 'P@10', 'MRR', 'nDCG@10'].map(m => [m, m === 'MAP' ? 'AP' : m === 'MRR' ? 'RR' : m]), metric, k => { metric = k; render(); });
  sel.innerHTML = C.queries.map((q, i) => `<option value="${i}">${esc(`${i + 1} · ${q.length > 80 ? q.slice(0, 78) + '…' : q}`)}</option>`).join('');
  let cur = 0;
  function pickDefault() { const a = E.per.tfidf.MAP, b = E.per.bm25.MAP; let best = 0; a.forEach((v, i) => { if (Math.abs(b[i] - v) > Math.abs(b[best] - a[best])) best = i; }); return best; }
  cur = pickDefault(); sel.value = cur;
  sel.addEventListener('change', () => { cur = +sel.value; render(); });
  function render() {
    const a = E.per.tfidf[metric], b = E.per.bm25[metric], n = a.length;
    const better = a.map((v, i) => b[i] - v);
    const bmWins = better.filter(d => d > 1e-9).length, tfWins = better.filter(d => d < -1e-9).length, ties = n - bmWins - tfWins;
    svg.innerHTML = '';
    const W = 420, H = 420, L = 44, R = 12, T = 12, B = 40, x = (v) => L + v * (W - L - R), y = (v) => H - B - v * (H - B - T);
    [0, 0.25, 0.5, 0.75, 1].forEach(v => { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, L - 6, y(v) + 4, v, 'tick', 'end'); txt(svg, x(v), H - B + 16, v, 'tick', 'middle'); });
    el('line', { x1: x(0), y1: y(0), x2: x(1), y2: y(1), class: 'pq-diag' }, svg);
    txt(svg, x(0.03), y(0.95), 'BM25 better', 'lbl'); txt(svg, x(0.97), y(0.05), 'TF-IDF better', 'lbl', 'end');
    a.forEach((v, i) => {
      const c = el('circle', { cx: x(v), cy: y(b[i]), r: i === cur ? 7 : 4.2, class: 'pq-pt' + (b[i] - v > 1e-9 ? ' bm' : v - b[i] > 1e-9 ? ' tf' : '') + (i === cur ? ' cur' : '') }, svg);
      c.addEventListener('click', () => { cur = i; sel.value = i; render(); });
      el('title', {}, c).textContent = `query ${i + 1}: TF-IDF ${v.toFixed(3)}, BM25 ${b[i].toFixed(3)}`;
    });
    txt(svg, L + (W - L - R) / 2, H - 6, `TF-IDF ${metric === 'MAP' ? 'AP' : metric === 'MRR' ? 'RR' : metric}`, 'tick', 'middle');
    txt(svg, 12, T + (H - B - T) / 2, `BM25 ${metric === 'MAP' ? 'AP' : metric === 'MRR' ? 'RR' : metric}`, 'tick', 'middle', { transform: `rotate(-90 12 ${T + (H - B - T) / 2})` });
    const qid = String(cur + 1), J = C.qrels[qid], A10 = E.sys.tfidf[cur].slice(0, 10), B10 = E.sys.bm25[cur].slice(0, 10);
    const list = (L) => '<ol class="pq-list">' + L.map(d => { const i = C.ids.indexOf(d); return `<li>${gradeBadge(J[d])}<span class="rr-doc">doc ${d}</span><span class="pq-t">${esc(C.titles[i] || '(empty)')}</span></li>`; }).join('') + '</ol>';
    const mv = (s) => MEASURES.map(([n]) => `${n === 'MAP' ? 'AP' : n === 'MRR' ? 'RR' : n} ${E.per[s][n][cur].toFixed(3)}`).join(' · ');
    out.innerHTML = `<p class="big">BM25 better on <b>${bmWins}</b> queries, TF-IDF on <b>${tfWins}</b>, equal on ${ties}. Mean: TF-IDF ${E.agg.tfidf[metric].toFixed(4)}, BM25 ${E.agg.bm25[metric].toFixed(4)}.</p>` +
      `<p class="note">Query ${qid} (${relevantCount(J)} relevant document${relevantCount(J) === 1 ? '' : 's'}): <i>${esc(C.queries[cur])}</i></p>` +
      `<div class="pq-two"><div><p class="al-h">TF-IDF <span>${mv('tfidf')}</span></p>${list(A10)}</div><div><p class="al-h">BM25 <span>${mv('bm25')}</span></p>${list(B10)}</div></div>`;
  }
  render();
}

/* ---------- Part VII: RAG and Recall@k ---------- */
function initRag() {
  const ks = document.getElementById('rg-k'), ps = document.getElementById('rg-pos'), box = document.getElementById('rg-box'), svg = document.getElementById('rg-svg'), out = document.getElementById('rg-out');
  const E = C ? evaluate() : null;
  function render() {
    const k = +ks.value, pos = +ps.value;
    document.getElementById('rg-k-val').textContent = k; document.getElementById('rg-pos-val').textContent = pos;
    box.innerHTML = Array.from({ length: 15 }, (_, i) => `<span class="rg-p${i < k ? ' in' : ''}${i + 1 === pos ? ' ev' : ''}">${i + 1 === pos ? '★' : i + 1}</span>`).join('') +
      `<p class="note" style="margin:0.5rem 0 0;">${pos <= k ? `The evidence is at rank ${pos}, inside the top ${k}: the LLM can use it.` : `❗ The evidence is at rank ${pos}, but the LLM only receives the top ${k}: it never sees it.`}</p>`;
    if (!E) return;
    svg.innerHTML = '';
    const W = 460, H = 250, L = 40, R = 12, T = 12, B = 36, K = 50, x = (v) => L + (v - 1) / (K - 1) * (W - L - R), y = (v) => H - B - v * (H - B - T);
    [0, 0.25, 0.5, 0.75].forEach(v => { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, L - 6, y(v) + 4, v, 'tick', 'end'); });
    [1, 10, 20, 30, 40, 50].forEach(v => txt(svg, x(v), H - B + 16, v, 'tick', 'middle'));
    const curve = (s) => Array.from({ length: K }, (_, i) => E.sys[s].reduce((acc, run, q) => acc + recallAt(run, C.qrels[String(q + 1)], i + 1), 0) / E.sys[s].length);
    const cT = curve('tfidf'), cB = curve('bm25');
    [[cT, 'rg-tf'], [cB, 'rg-bm']].forEach(([c, cls]) => el('polyline', { points: c.map((v, i) => `${x(i + 1)},${y(v)}`).join(' '), class: cls }, svg));
    el('line', { x1: x(Math.min(k, K)), x2: x(Math.min(k, K)), y1: T, y2: H - B, class: 'rg-k' }, svg);
    txt(svg, L + (W - L - R) / 2, H - 4, 'k (passages given to the model)', 'tick', 'middle');
    out.innerHTML = `<p class="big">Cranfield, mean Recall@${k}: TF-IDF <b>${cT[k - 1].toFixed(3)}</b>, BM25 <b>${cB[k - 1].toFixed(3)}</b></p><p class="note">With the top ${k} documents as context, on average ${(100 * cT[k - 1]).toFixed(0)}% (TF-IDF) of the relevant documents of a query would reach the model.</p>`;
  }
  [ks, ps].forEach(s => s.addEventListener('input', render));
  render();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initWhich();
  initPrecision();
  initRecall();
  initPlayground();
  initDcg();
  if (C) { initGrades(); initEvalTable(); initPerQuery(); }
  initRag();
});

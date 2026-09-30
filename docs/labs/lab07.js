/* ===== Lab 07 interactivity ===== */

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
const f3 = (v) => v.toFixed(3), f4 = (v) => v.toFixed(4);
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
function frac(n, d) { const g = (a, b) => (b ? g(b, a % b) : a), k = g(n, d) || 1; return d / k === 1 ? String(n / k) : `${n / k}/${d / k}`; }


/* ====================== toy collection (Parts II and III, invented) ====================== */
const TOY = [
  ['D1', 'automobile maintenance manual'],
  ['D2', 'how to fix car brakes: a maintenance guide'],
  ['D3', 'vehicle servicing and engine maintenance'],
  ['D4', 'car prices drop this summer'],
  ['D5', 'therapy for myocardial infarction'],
  ['D6', 'emergency care after a heart attack'],
  ['D7', 'panic attack treatment options'],
  ['D8', 'jaguar cars: engine power and top speed'],
  ['D9', 'how fast can a jaguar run? big cat hunting speed'],
  ['D10', 'the jaguar: speed and strength of a big cat'],
  ['D11', 'python memory management and garbage collection'],
  ['D12', 'the reticulated python is the longest snake'],
  ['D13', 'computer memory upgrade guide'],
];
const words = (s) => s.toLowerCase().match(/[a-z]+/g) || [];
const TOY_STOP = new Set(['a', 'after', 'and', 'can', 'for', 'how', 'is', 'of', 'the', 'this', 'to']);


/* ====================== Cranfield (pure; C = CRAN from lab04-cranfield.js) ====================== */
const C = typeof CRAN !== 'undefined' ? CRAN : (typeof global !== 'undefined' && global.CRAN) || null;
const unflat = (flat) => { const m = []; for (let i = 0; i < flat.length; i += 2) m.push([flat[i], flat[i + 1]]); return m; };
// ranking like numpy's scores.argsort()[::-1]: score descending, ties by larger index first
function topIdx(scores, k) { return Array.from(scores, (s, i) => [s, i]).sort((a, b) => b[0] - a[0] || b[1] - a[1]).slice(0, k).map(x => x[1]); }
// rank_bm25's BM25Okapi on text.lower().split() tokens
let OK = null;
function okapi() {
  if (OK) return OK;
  const N = C.ids.length, docTerms = C.wterms.map(unflat), len = docTerms.map(ts => ts.reduce((s, [, f]) => s + f, 0));
  const avgdl = len.reduce((a, b) => a + b, 0) / N, post = new Map();
  docTerms.forEach((ts, i) => ts.forEach(([t, f]) => { if (!post.has(t)) post.set(t, []); post.get(t).push([i, f]); }));
  const idf = new Map(); let sum = 0;
  post.forEach((p, t) => { const v = Math.log(N - p.length + 0.5) - Math.log(p.length + 0.5); idf.set(t, v); sum += v; });
  const eps = 0.25 * sum / idf.size;
  idf.forEach((v, t) => { if (v < 0) idf.set(t, eps); });
  const cc = new Float64Array(C.wvocab.length); docTerms.forEach(ts => ts.forEach(([t, f]) => { cc[t] += f; }));
  return (OK = { N, len, avgdl, post, idf, wid: new Map(C.wvocab.map((w, i) => [w, i])), cc, CL: len.reduce((a, b) => a + b, 0) });
}
const splitTokens = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
function bm25Scores(q, k1 = 1.5, b = 0.75) {
  const O = okapi(), scores = new Float64Array(O.N);
  splitTokens(q).forEach(w => {
    const t = O.wid.get(w); if (t === undefined) return;
    const idf = O.idf.get(t);
    O.post.get(t).forEach(([i, tf]) => { scores[i] += idf * (tf * (k1 + 1) / (tf + k1 * (1 - b + b * O.len[i] / O.avgdl))); });
  });
  return scores;
}
// scikit-learn TfidfVectorizer(lowercase=True, norm="l2"), no stop words (Lab 04's TF-IDF, cosine search)
let TF = null;
function tfidfIndex() {
  if (TF) return TF;
  const N = C.ids.length, df = new Map(), docs = [];
  C.terms.forEach(flat => { const m = new Map(); unflat(flat).forEach(([t, f]) => { if (C.vocab[t].length >= 2) m.set(C.vocab[t], f); }); docs.push(m); m.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1)); });
  const idf = new Map([...df].map(([w, d]) => [w, Math.log((1 + N) / (1 + d)) + 1]));
  const post = new Map(), dnorm = [];
  docs.forEach((m, i) => { let s = 0; m.forEach((f, w) => { const x = f * idf.get(w); s += x * x; if (!post.has(w)) post.set(w, []); post.get(w).push([i, f]); }); dnorm.push(Math.sqrt(s)); });
  return (TF = { N, idf, post, dnorm });
}
function tfidfScores(q) {
  const S = tfidfIndex(), scores = new Float64Array(S.N);
  const qc = new Map(); (q.toLowerCase().match(/[\p{L}\p{N}_]+/gu) || []).forEach(w => { if (w.length >= 2 && S.idf.has(w)) qc.set(w, (qc.get(w) || 0) + 1); });
  let qn = 0; qc.forEach((f, w) => { const x = f * S.idf.get(w); qn += x * x; }); qn = Math.sqrt(qn);
  if (qn > 0) qc.forEach((f, w) => { const qw = f * S.idf.get(w) / qn; S.post.get(w).forEach(([i, tf]) => { scores[i] += qw * tf * S.idf.get(w) / S.dnorm[i]; }); });
  return scores;
}
// TfidfVectorizer(stop_words="english"): L2-normalized rows over the non-stop words, for choosing PRF terms
let TS = null;
function tfidfStop() {
  if (TS) return TS;
  const N = C.ids.length, stop = new Set(C.stop), df = new Map(), docs = [];
  C.terms.forEach(flat => { const m = new Map(); unflat(flat).forEach(([t, f]) => { const w = C.vocab[t]; if (w.length >= 2 && !stop.has(w)) m.set(w, f); }); docs.push(m); m.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1)); });
  const idf = new Map([...df].map(([w, d]) => [w, Math.log((1 + N) / (1 + d)) + 1]));
  const rows = docs.map(m => { const r = new Map(); let s = 0; m.forEach((f, w) => { const x = f * idf.get(w); r.set(w, x); s += x * x; }); s = Math.sqrt(s); if (s > 0) r.forEach((x, w) => r.set(w, x / s)); return r; });
  return (TS = { rows });
}
function prfCandidates(q, kDocs) {
  const top = topIdx(bm25Scores(q), kDocs), S = tfidfStop(), acc = new Map();
  top.forEach(i => S.rows[i].forEach((x, w) => acc.set(w, (acc.get(w) || 0) + x)));
  const qTerms = new Set(q.toLowerCase().match(/\b\w\w+\b/g) || []);
  const cands = [...acc].map(([w, s]) => [w, s / kDocs]).filter(([w]) => !qTerms.has(w))
    .sort((a, b) => (b[1] - a[1] > 1e-12 ? 1 : a[1] - b[1] > 1e-12 ? -1 : a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return { top, cands };
}
const expandQuery = (q, terms) => terms.length ? q + ' ' + terms.join(' ') : q;
// query likelihood with Jelinek–Mercer smoothing, on the same whitespace tokens; skipOOV = the fixed version
function qlScores(q, lam, skipOOV = true) {
  const O = okapi(), N = O.N, scores = new Float64Array(N);
  for (const w of splitTokens(q)) {
    const t = O.wid.get(w), pc = t === undefined ? 0 : O.cc[t] / O.CL;
    if (pc === 0) { if (skipOOV) continue; scores.fill(-Infinity); return scores; }
    const add = new Float64Array(N).fill(Math.log(lam * pc));
    O.post.get(t).forEach(([i, tf]) => { add[i] = Math.log((1 - lam) * (tf / O.len[i]) + lam * pc); });
    for (let i = 0; i < N; i++) scores[i] += add[i];
  }
  return scores;
}

/* ---------- evaluation measures (as in Lab 05; trec_eval orders by score, then doc id descending) ---------- */
function runOf(scores, k = 100) {
  return topIdx(scores, k).map(i => [scores[i], C.ids[i]]).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0)).map(x => x[1]);
}
function relevantCount(judged, rel = 1) { return Object.values(judged).filter(g => g >= rel).length; }
function precisionAt(run, judged, k, rel = 1) { let h = 0; for (let i = 0; i < k; i++) if (i < run.length && (judged[run[i]] ?? 0) >= rel) h++; return h / k; }
function recallAt(run, judged, k, rel = 1) { const R = relevantCount(judged, rel); if (!R) return 0; let h = 0; for (let i = 0; i < Math.min(k, run.length); i++) if ((judged[run[i]] ?? 0) >= rel) h++; return h / R; }
function reciprocalRank(run, judged, rel = 1) { for (let i = 0; i < run.length; i++) if ((judged[run[i]] ?? 0) >= rel) return 1 / (i + 1); return 0; }
function averagePrecision(run, judged, rel = 1) {
  const R = relevantCount(judged, rel); if (!R) return 0;
  let h = 0, s = 0; run.forEach((d, i) => { if ((judged[d] ?? 0) >= rel) { h++; s += h / (i + 1); } });
  return s / R;
}
const gainOf = (g) => (g <= 0 ? 0 : g);
function dcg(grades, k) { let s = 0; grades.slice(0, k).forEach((g, i) => { s += gainOf(g) / Math.log2(i + 2); }); return s; }
function ndcgAt(run, judged, k) { const ideal = Object.values(judged).filter(g => g > 0).sort((a, b) => b - a); const idcg = dcg(ideal, k); return idcg ? dcg(run.map(d => judged[d] ?? 0), k) / idcg : 0; }
const MEASURES = [['P@10', (r, j) => precisionAt(r, j, 10)], ['Recall@100', (r, j) => recallAt(r, j, 100)], ['MRR', (r, j) => reciprocalRank(r, j)], ['MAP', (r, j) => averagePrecision(r, j)], ['nDCG@10', (r, j) => ndcgAt(r, j, 10)]];
function evaluateSystem(scoreFn) {
  const per = {}; MEASURES.forEach(([n]) => { per[n] = []; });
  C.queries.forEach((q, i) => { const run = runOf(scoreFn(q, i)), J = C.qrels[String(i + 1)]; MEASURES.forEach(([n, f]) => per[n].push(f(run, J))); });
  const agg = {}; MEASURES.forEach(([n]) => { agg[n] = per[n].reduce((a, b) => a + b, 0) / per[n].length; });
  return { per, agg };
}
const prfScoreFn = (k, m) => (q) => bm25Scores(expandQuery(q, prfCandidates(q, k).cands.slice(0, m).map(c => c[0])));


/* ====================== n-gram models (pure) ====================== */
function bigramModel(lines) {
  const S = lines.map(l => l.trim()).filter(Boolean).map(l => ['[s]', ...l.split(/\s+/).filter(w => w !== '[s]' && w !== '[/s]'), '[/s]']);
  const bi = new Map(), hist = new Map(), next = new Set(), H = new Set();
  S.forEach(s => { for (let i = 0; i + 1 < s.length; i++) { const k = s[i] + '\u0001' + s[i + 1]; bi.set(k, (bi.get(k) || 0) + 1); hist.set(s[i], (hist.get(s[i]) || 0) + 1); next.add(s[i + 1]); H.add(s[i]); } });
  const order = (a, b) => (a === '[s]' ? -1 : b === '[s]' ? 1 : a === '[/s]' ? 1 : b === '[/s]' ? -1 : 0);
  const firstSeen = []; S.forEach(s => s.forEach(w => { if (!firstSeen.includes(w)) firstSeen.push(w); }));
  const V = firstSeen.filter(w => next.has(w)).sort(order), rows = firstSeen.filter(w => H.has(w)).sort(order);
  return { S, bi, hist, V, rows, count: (a, b) => bi.get(a + '\u0001' + b) || 0 };
}
// returns [numerator, denominator] so fractions can be shown exactly
function bigramProb(M, a, b, mode, beta = 0.5) {
  const c = M.count(a, b), h = M.hist.get(a) || 0, V = M.V.length;
  if (mode === 'mle') return [c, h];
  if (mode === 'lap') return [c + 1, h + V];
  return [c + beta, h + beta * V];
}
function goodTuring(counts) {
  const N = counts.reduce((s, [, c]) => s + c, 0), Nc = new Map();
  counts.forEach(([, c]) => Nc.set(c, (Nc.get(c) || 0) + 1));
  return { N, Nc, unseen: (Nc.get(1) || 0) / N, rows: counts.map(([n, c]) => { const cs = (c + 1) * (Nc.get(c + 1) || 0) / Nc.get(c); return { n, c, nc: Nc.get(c), nc1: Nc.get(c + 1) || 0, cs, p: cs / N }; }) };
}

if (typeof module !== 'undefined') module.exports = { TOY, words, okapi, bm25Scores, tfidfScores, prfCandidates, expandQuery, qlScores, runOf, evaluateSystem, prfScoreFn, averagePrecision, bigramModel, bigramProb, goodTuring, topIdx };
if (typeof document !== 'undefined') {


/* ---------- math ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- hero: words drawn at the size of their probability ---------- */
function initHero() {
  const svg = document.getElementById('lm-hero-bg'), r = rng(7);
  const W = ['wing', 'drag', 'flow', 'boundary', 'layer', 'pressure', 'heat', 'shock', 'lift', 'mach', 'the', 'of', 'P(w|d)', 'jaguar', 'car', 'automobile', 'repair', 'maintenance', 'λ', 'Emma', 'sugar', 'coffee', 'P(q|d)', 'airfoil'];
  for (let i = 0; i < 34; i++) {
    const w = W[i % W.length], s = 14 + Math.pow(r(), 2.2) * 46;
    txt(svg, r() * 1200, 25 + r() * 270, w, 'hw' + (r() < 0.3 ? ' b' : r() < 0.5 ? ' c' : ''), 'middle', { 'font-size': s.toFixed(0) });
  }
}

/* ---------- Part II: query expansion ---------- */
function initExpansion() {
  const Q = {
    car: ['car repair', 'The user wants to repair a car.', ['D1', 'D2', 'D3'], [['car', ['automobile', 'vehicle']], ['repair', ['maintenance', 'fix', 'servicing']]]],
    heart: ['heart attack treatment', 'The user wants the treatment of a heart attack.', ['D5', 'D6'], [['heart attack', ['myocardial', 'infarction', 'cardiac']], ['treatment', ['therapy', 'care']]]],
    jag: ['jaguar speed', 'The user means the <b>animal</b>.', ['D9', 'D10'], [['jaguar, the animal', ['cat', 'animal', 'run', 'fast']], ['jaguar, the car', ['car', 'cars', 'engine']]]],
    py: ['python memory', 'The user means the <b>programming language</b>.', ['D11'], [['python, the language', ['programming', 'garbage', 'collection']], ['python, the snake', ['snake', 'reptile']]]],
  };
  let cur = 'car', picked = new Set();
  const W = document.getElementById('qe-w'), terms = document.getElementById('qe-terms'), list = document.getElementById('qe-list'), out = document.getElementById('qe-out');
  pills(document.getElementById('qe-q'), Object.entries(Q).map(([k, v]) => [k, v[0]]), cur, (k) => { cur = k; picked = new Set(); build(); });
  function build() {
    const [, need, , groups] = Q[cur];
    document.getElementById('qe-need').innerHTML = need;
    terms.innerHTML = groups.map(([g, ts]) => `<div class="qe-group"><span class="qe-g">${esc(g)}</span>${ts.map(t => `<button type="button" class="qe-t${picked.has(t) ? ' on' : ''}" data-t="${t}">+ ${t}</button>`).join('')}</div>`).join('');
    terms.querySelectorAll('.qe-t').forEach(b => b.addEventListener('click', () => { const t = b.dataset.t; picked.has(t) ? picked.delete(t) : picked.add(t); b.classList.toggle('on'); render(); }));
    render();
  }
  function render() {
    const [q, , rel, groups] = Q[cur], w = +W.value, orig = words(q);
    document.getElementById('qe-w-val').textContent = w.toFixed(1);
    const exp = [...picked];
    const rows = TOY.map(([id, t], i) => {
      const ws = new Set(words(t)), mo = orig.filter(x => ws.has(x)), me = exp.filter(x => ws.has(x));
      return { id, t, i, mo, me, s: mo.length + w * me.length, rel: rel.includes(id) };
    }).filter(r => r.s > 0).sort((a, b) => b.s - a.s || a.i - b.i);
    const hl = (t, r) => esc(t).replace(/[A-Za-z]+/g, m => r.mo.includes(m.toLowerCase()) ? `<mark class="o">${m}</mark>` : r.me.includes(m.toLowerCase()) ? `<mark class="e">${m}</mark>` : m);
    list.innerHTML = `<p class="qe-query">query: <b>${esc(q)}</b>${exp.length ? ' <span class="qe-plus">+ ' + exp.map(esc).join(' ') + '</span>' : ''}</p>` +
      (rows.length ? '<ol class="qe-res">' + rows.map(r => `<li class="${r.rel ? 'rel' : ''}${!r.mo.length ? ' only-e' : ''}"><span class="qe-id">${r.id}</span><span class="qe-txt">${hl(r.t, r)}</span><span class="qe-s">${+r.s.toFixed(2)}</span></li>`).join('') + '</ol>' : '<p class="note">No document shares a word with the query.</p>');
    const found = rows.filter(r => r.rel).length, R = rel.length, pR = rows.slice(0, R).filter(r => r.rel).length;
    const drift = rows.filter(r => !r.rel && !r.mo.length);
    out.innerHTML = `<p class="big">Recall: <b>${found} / ${R}</b> relevant documents retrieved. R-precision (relevant among the top ${R}): <b>${pR} / ${R}</b>.</p>` +
      `<p class="note">Relevant: ${rel.join(', ')} (green). ${rows.length} document${rows.length === 1 ? '' : 's'} retrieved.</p>` +
      (drift.length ? `<p>❗ <b>Query drift</b>: ${drift.map(r => r.id).join(', ')} ${drift.length === 1 ? 'is' : 'are'} retrieved only through expansion terms, and not relevant.</p>` : '') +
      (!exp.length ? `<p class="note">Add expansion terms above. Try the sense the user did <b>not</b> mean, too.</p>` : '');
  }
  W.addEventListener('input', render);
  build();
}

/* ---------- Part III: Rocchio in two dimensions ---------- */
function initRocchio2D() {
  const D = [['R1', 0.5, 0.8, 'r'], ['R2', 0.7, 0.8, 'r'], ['N1', 0.0, 0.95, 'n'], ['N2', 0.2, 0.85, 'n'], ['d5', 0.9, 0.3, ''], ['d6', 0.85, 0.6, ''], ['d7', 0.35, 0.3, ''], ['d8', 0.95, 0.1, ''], ['d9', 0.55, 0.45, ''], ['d10', 0.4, 1.0, '']];
  const lab = D.map(d => d[3]);
  const q0 = [1, 0], svg = document.getElementById('ro-svg'), out = document.getElementById('ro-out');
  const S = ['a', 'b', 'g'].map(k => document.getElementById('ro-' + k));
  function centroid(k) { const xs = D.filter((_, i) => lab[i] === k); return xs.length ? [xs.reduce((s, d) => s + d[1], 0) / xs.length, xs.reduce((s, d) => s + d[2], 0) / xs.length] : null; }
  const cos = (a, b) => { const n = Math.hypot(...a) * Math.hypot(...b); return n ? (a[0] * b[0] + a[1] * b[1]) / n : 0; };
  function render() {
    const [a, b, g] = S.map(s => +s.value);
    ['a', 'b', 'g'].forEach((k, i) => { document.getElementById(`ro-${k}-val`).textContent = +S[i].value; });
    const cr = centroid('r'), cn = centroid('n');
    const raw = [0, 1].map(j => a * q0[j] + (cr ? b * cr[j] : 0) - (cn ? g * cn[j] : 0)), qn = raw.map(v => Math.max(0, v));
    svg.innerHTML = '';
    const L = 42, T = 14, P = 290, sc = P / 1.5, X = (v) => L + v * sc, Y = (v) => T + P - v * sc;
    const defs = el('defs', {}, svg);
    [['ro-ah', 'ro-ahf'], ['ro-ah2', 'ro-ahf2']].forEach(([id, c]) => { const m = el('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', class: c }, m); });
    [0, 0.5, 1, 1.5].forEach(v => { el('line', { x1: X(0), x2: X(1.5), y1: Y(v), y2: Y(v), class: 'grid-line' }, svg); el('line', { x1: X(v), x2: X(v), y1: Y(0), y2: Y(1.5), class: 'grid-line' }, svg); txt(svg, X(v), Y(0) + 16, v, 'tick', 'middle'); txt(svg, X(0) - 6, Y(v) + 4, v, 'tick', 'end'); });
    txt(svg, X(1.5), Y(0) + 32, 'term 1 →', 'tick', 'end'); txt(svg, X(0) + 4, Y(1.5) - 2, '↑ term 2', 'tick');
    if (cr) { el('path', { d: `M${X(cr[0]) - 6},${Y(cr[1])} h12 M${X(cr[0])},${Y(cr[1]) - 6} v12`, class: 'ro-c r' }, svg); txt(svg, X(cr[0]) + 4, Y(cr[1]) + 20, 'relevant centroid', 'ro-cl r'); }
    if (cn) { el('path', { d: `M${X(cn[0]) - 6},${Y(cn[1])} h12 M${X(cn[0])},${Y(cn[1]) - 6} v12`, class: 'ro-c n' }, svg); txt(svg, X(cn[0]) - 4, Y(1.2), 'non-relevant centroid', 'ro-cl n'); }
    el('line', { x1: X(0), y1: Y(0), x2: X(q0[0]), y2: Y(q0[1]), class: 'ro-q', 'marker-end': 'url(#ro-ah)' }, svg);
    txt(svg, X(0.62), Y(0) - 7, 'q old', 'ro-ql', 'middle');
    const nq = Math.hypot(...qn), s1 = nq > 1.45 ? 1.45 / nq : 1;
    el('line', { x1: X(0), y1: Y(0), x2: X(qn[0] * s1), y2: Y(qn[1] * s1), class: 'ro-qn', 'marker-end': 'url(#ro-ah2)' }, svg);
    txt(svg, X(qn[0] * s1) + 6, Y(qn[1] * s1) - 4, 'q new', 'ro-ql n');
    D.forEach(([n, x, y], i) => {
      const g2 = el('g', { class: 'ro-d ' + (lab[i] || 'u'), tabindex: 0, role: 'button', 'aria-label': n }, svg);
      el('circle', { cx: X(x), cy: Y(y), r: 9 }, g2); txt(g2, X(x), Y(y) - 13, n, 'ro-dl', 'middle');
      const cyc = () => { lab[i] = lab[i] === 'r' ? 'n' : lab[i] === 'n' ? '' : 'r'; render(); };
      g2.addEventListener('click', cyc); g2.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cyc(); } });
    });
    const v = (p) => `[${p.map(x => +x.toFixed(3)).join(', ')}]`;
    const before = D.map(d => [d[0], cos(q0, [d[1], d[2]])]).sort((x, y) => y[1] - x[1]).map(x => x[0]);
    const after = D.map(d => [d[0], cos(qn, [d[1], d[2]])]).sort((x, y) => y[1] - x[1]);
    const tag = (n) => { const i = D.findIndex(d => d[0] === n); return `<span class="ro-tag ${lab[i] || 'u'}">${n}</span>`; };
    out.innerHTML = `<p class="big">\\(\\vec q_{new} = ${a}\\cdot[1, 0]${cr ? ` + ${b}\\cdot${v(cr)}` : ''}${cn ? ` - ${g}\\cdot${v(cn)}` : ''} = ${v(raw)}\\)</p>` +
      (raw.some(x => x < 0) ? `<p class="note">Negative weights set to 0: \\(${v(qn)}\\).</p>` : '') +
      `<p>${qn[1] > 0 ? `❗ Term 2 had weight 0 in the original query; now it has ${+qn[1].toFixed(3)}: <b>the expansion effect</b>.` : 'Term 2 still has weight 0: mark some relevant documents.'}</p>` +
      `<p class="note">Cosine ranking before: ${before.map(tag).join(' ')}</p><p class="note">after: ${after.map(x => tag(x[0])).join(' ')}</p>`;
    mathIn(out);
  }
  S.forEach(s => s.addEventListener('input', render));
  render();
}

/* ---------- Part III: Rocchio on words ---------- */
function initRocchioWords() {
  const box = document.getElementById('rf-docs'), out = document.getElementById('rf-out');
  const vec = (s) => { const m = new Map(); words(s).filter(w => !TOY_STOP.has(w)).forEach(w => m.set(w, (m.get(w) || 0) + 1)); const n = Math.sqrt([...m.values()].reduce((a, b) => a + b * b, 0)); m.forEach((v, w) => m.set(w, v / n)); return m; };
  const V = TOY.map(([id, t]) => [id, t, vec(t)]), q0 = vec('car repair');
  const lab = {}; lab.D2 = 'r'; lab.D4 = 'n';
  const A = 1, B = 0.75, G = 0.15;
  const cos = (a, b) => { let s = 0; a.forEach((x, w) => { s += x * (b.get(w) || 0); }); const n = Math.sqrt([...a.values()].reduce((p, x) => p + x * x, 0)) * Math.sqrt([...b.values()].reduce((p, x) => p + x * x, 0)); return n ? s / n : 0; };
  function render() {
    const rank0 = V.map(([id, t, v], i) => ({ id, t, i, s: cos(q0, v) })).sort((a, b) => b.s - a.s || a.i - b.i);
    box.innerHTML = `<p class="qe-query">query: <b>car repair</b> · click R / N to judge</p><ol class="qe-res rf-res">` + rank0.map(r => `<li class="${lab[r.id] === 'r' ? 'rel' : lab[r.id] === 'n' ? 'nrel' : ''}"><span class="qe-id">${r.id}</span><span class="qe-txt">${esc(r.t)}</span><span class="rf-btns"><button type="button" data-id="${r.id}" data-l="r" class="${lab[r.id] === 'r' ? 'on' : ''}" aria-label="relevant">R</button><button type="button" data-id="${r.id}" data-l="n" class="${lab[r.id] === 'n' ? 'on' : ''}" aria-label="non-relevant">N</button></span><span class="qe-s">${f3(r.s)}</span></li>`).join('') + '</ol>';
    box.querySelectorAll('.rf-btns button').forEach(b => b.addEventListener('click', () => { lab[b.dataset.id] = lab[b.dataset.id] === b.dataset.l ? undefined : b.dataset.l; render(); }));
    const R = V.filter(([id]) => lab[id] === 'r'), NR = V.filter(([id]) => lab[id] === 'n');
    const qn = new Map(); q0.forEach((x, w) => qn.set(w, A * x));
    R.forEach(([, , v]) => v.forEach((x, w) => qn.set(w, (qn.get(w) || 0) + B * x / R.length)));
    NR.forEach(([, , v]) => v.forEach((x, w) => qn.set(w, (qn.get(w) || 0) - G * x / NR.length)));
    const terms = [...qn].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    const qc = new Map(terms.filter(([, x]) => x > 0));
    const rank1 = V.map(([id, t, v], i) => ({ id, t, i, s: cos(qc, v) })).filter(r => r.s > 0).sort((a, b) => b.s - a.s || a.i - b.i);
    out.innerHTML = `<p class="al-h">New query</p><p class="note" style="margin-top:-0.4rem;">\\(\\alpha = 1\\), \\(\\beta = 0.75\\), \\(\\gamma = 0.15\\)</p><div class="rf-terms">` + terms.map(([w, x]) => `<span class="chip rf-t${q0.has(w) ? '' : ' new'}${x <= 0 ? ' neg' : ''}">${esc(w)} <small>${x > 0 ? f3(x) : '0 (' + f3(x) + ')'}</small></span>`).join('') + `</div>` +
      `<p class="note" style="margin-top:0.5rem;">Highlighted: terms that were not in the query. ${R.length ? '' : 'No relevant document marked yet.'}</p>` +
      `<p class="al-h" style="margin-top:0.8rem;">Ranking with the new query</p><ol class="qe-res">` + rank1.slice(0, 8).map(r => `<li class="${['D1', 'D2', 'D3'].includes(r.id) ? 'rel' : ''}"><span class="qe-id">${r.id}</span><span class="qe-txt">${esc(r.t)}</span><span class="qe-s">${f3(r.s)}</span></li>`).join('') + '</ol>' +
      `<p class="note">Green: the documents about repairing a car (D1–D3). The original query finds only D2 of them; after marking D2, the shared word <i>maintenance</i> brings in D1 and D3. Mark D3 too and <i>engine</i> pulls in the jaguar car D8: drift.</p>`;
    mathIn(out);
  }
  render();
}

/* ---------- Cranfield helpers for widgets ---------- */
const GRADE_DEF = { 4: 'complete answer', 3: 'high relevance', 2: 'useful', 1: 'minimum interest', '-1': 'no interest' };
const gradeBadge = (g) => `<span class="rr-g ${g === null || g === undefined ? 'none' : 'g' + (g < 0 ? 'n' : g)}" title="${g === null || g === undefined ? 'not judged' : 'grade ' + g + ': ' + GRADE_DEF[g]}">${g === null || g === undefined ? '–' : g}</span>`;
const qLabel = (i) => `${i + 1} · ${C.queries[i].length > 90 ? C.queries[i].slice(0, 88) + '…' : C.queries[i]}`;
function fillQuerySelect(sel, cur = 0) { sel.innerHTML = C.queries.map((_, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${esc(qLabel(i))}</option>`).join(''); }
function topList(scores, J, k, mark) {
  return '<ol class="pq-list">' + topIdx(scores, k).map(i => { const d = C.ids[i]; return `<li class="${mark && mark(d) ? 'pf-new' : ''}">${gradeBadge(J[d])}<span class="rr-doc">doc ${d}</span><span class="pq-t" title="${esc(C.titles[i])}">${esc(C.titles[i] || '(empty)')}</span></li>`; }).join('') + '</ol>';
}
const mline = (run, J) => `AP ${f3(averagePrecision(run, J))} · P@10 ${f3(run.slice(0, 10).filter(d => (J[d] ?? 0) >= 1).length / 10)}`;

/* ---------- Part IV: pseudo-relevance feedback on Cranfield ---------- */
function initPrf() {
  const sel = document.getElementById('pf-sel'), K = document.getElementById('pf-k'), M = document.getElementById('pf-m'), terms = document.getElementById('pf-terms'), lists = document.getElementById('pf-lists');
  fillQuerySelect(sel, 0);
  let cands = [], on = new Set(), top = [];
  function recompute() {
    const i = +sel.value, k = +K.value, m = +M.value;
    document.getElementById('pf-k-val').textContent = k; document.getElementById('pf-m-val').textContent = m;
    ({ top, cands } = prfCandidates(C.queries[i], k));
    on = new Set(cands.slice(0, m).map(c => c[0]));
    render();
  }
  function render() {
    const i = +sel.value, q = C.queries[i], J = C.qrels[String(i + 1)], m = +M.value;
    const shown = cands.slice(0, Math.max(10, m));
    terms.innerHTML = `<span class="qe-g">feedback: docs ${top.map(t => C.ids[t]).join(', ')} · candidate terms by mean TF-IDF</span>` + shown.map(([w, s], j) => `<button type="button" class="qe-t${on.has(w) ? ' on' : ''}" data-t="${esc(w)}">${j < m ? '' : '+ '}${esc(w)} <small>${f3(s)}</small></button>`).join('');
    terms.querySelectorAll('.qe-t').forEach(b => b.addEventListener('click', () => { const w = b.dataset.t; on.has(w) ? on.delete(w) : on.add(w); render(); }));
    const add = shown.map(c => c[0]).filter(w => on.has(w)), eq = expandQuery(q, add);
    const s0 = bm25Scores(q), s1 = bm25Scores(eq), r0 = runOf(s0), r1 = runOf(s1), t0 = new Set(r0.slice(0, 10));
    lists.innerHTML = `<div><p class="al-h">BM25 <span>${mline(r0, J)}</span></p>${topList(s0, J, 10)}</div>` +
      `<div><p class="al-h">BM25 + PRF <span>${mline(r1, J)}</span></p><p class="rr-note pf-eq">+ ${add.length ? add.map(esc).join(' ') : '(no terms)'}</p>${topList(s1, J, 10, d => !t0.has(d))}</div>`;
  }
  sel.addEventListener('change', recompute);
  [K, M].forEach(s => s.addEventListener('input', recompute));
  document.getElementById('pf-all').addEventListener('click', () => {
    const out = document.getElementById('pf-all-out'), k = +K.value, m = +M.value;
    out.innerHTML = '<p class="note">Computing…</p>';
    setTimeout(() => {
      const base = evaluateSystem(q => bm25Scores(q)), prf = evaluateSystem(prfScoreFn(k, m));
      const up = prf.per.MAP.filter((v, i) => v > base.per.MAP[i] + 1e-9).length, down = prf.per.MAP.filter((v, i) => v < base.per.MAP[i] - 1e-9).length;
      out.innerHTML = `<div class="table-wrap"><table class="summary sc-small rr-num"><thead><tr><th>\\(k = ${k}\\), \\(m = ${m}\\)</th>${MEASURES.map(([n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>` +
        [['BM25', base], ['BM25 + PRF', prf]].map(([n, r]) => `<tr><td><b>${n}</b></td>${MEASURES.map(([mm]) => `<td class="${r === prf && prf.agg[mm] > base.agg[mm] ? 'hit' : ''}">${f4(r.agg[mm])}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>' +
        `<p>Per query (AP): PRF <b>helps ${up}</b>, <b>hurts ${down}</b>, leaves ${225 - up - down} unchanged.</p>`;
      mathIn(out);
    }, 30);
  });
  recompute();
}

/* ---------- Part V: bigram playground ---------- */
function initBigram() {
  const T = document.getElementById('bg-train'), X = document.getElementById('bg-test'), mat = document.getElementById('bg-mat'), out = document.getElementById('bg-out'), Bs = document.getElementById('bg-beta');
  T.value = 'I am Sam\nSam I am\nSam I like\nSam I do like\ndo I like Sam';
  X.value = 'I do like Sam';
  let mode = 'mle', row = 'Sam';
  pills(document.getElementById('bg-sm'), [['mle', 'MLE'], ['lap', 'Laplace (add-1)'], ['beta', 'add-β']], mode, (k) => { mode = k; document.getElementById('bg-beta-row').classList.toggle('show', k === 'beta'); render(); });
  const fmt = (p) => mode === 'beta' ? (p[1] ? f3(p[0] / p[1]) : '–') : (p[1] ? frac(p[0], p[1]) : '–');
  function render() {
    const M = bigramModel(T.value.split('\n')), beta = +Bs.value;
    document.getElementById('bg-beta-val').textContent = beta;
    if (!M.rows.includes(row)) row = M.rows[1] || M.rows[0];
    mat.innerHTML = `<thead><tr><th>after ↓ · next →</th>${M.V.map(w => `<th>${esc(w)}</th>`).join('')}<th>c(prev)</th></tr></thead><tbody>` +
      M.rows.map(a => `<tr class="${a === row ? 'sel' : ''}" data-r="${esc(a)}"><th>${esc(a)}</th>${M.V.map(b => { const c = M.count(a, b); return `<td class="${c ? 'nz' : ''}" title="P(${esc(b)}|${esc(a)}) = ${fmt(bigramProb(M, a, b, mode, beta))}">${c}</td>`; }).join('')}<td class="h">${M.hist.get(a)}</td></tr>`).join('') + '</tbody>';
    mat.querySelectorAll('tbody tr').forEach(tr => tr.addEventListener('click', () => { row = tr.dataset.r; render(); }));
    const dist = M.V.map(b => { const p = bigramProb(M, row, b, mode, beta); return [b, p, p[0] / p[1]]; }).sort((x, y) => y[2] - x[2]);
    const best = dist.filter(d => Math.abs(d[2] - dist[0][2]) < 1e-12).map(d => d[0]);
    let toks = X.value.trim().split(/\s+/).filter(Boolean); if (toks[0] !== '[s]') toks = ['[s]', ...toks];
    let lp = 0, zero = false; const fac = [];
    for (let i = 1; i < toks.length; i++) { const p = bigramProb(M, toks[i - 1], toks[i], mode, beta); const v = p[1] ? p[0] / p[1] : 0; fac.push(`P(${esc(toks[i])}|${esc(toks[i - 1])}) = ${fmt(p)}`); if (v <= 0) zero = true; else lp += Math.log(v); }
    const n = toks.length - 1;
    out.innerHTML = `<p class="al-h">Next word after <b>${esc(row)}</b> <span>${{ mle: 'MLE', lap: 'Laplace', beta: 'add-β = ' + beta }[mode]}</span></p><p>${dist.map(([b, p]) => `<span class="chip${best.includes(b) ? ' cur' : ''}">${esc(b)} ${fmt(p)}</span>`).join(' ')}</p>` +
      `<p class="note">Click a row of the table to change the word. Most probable: <b>${best.map(esc).join(' or ')}</b>.</p>` +
      `<p class="al-h" style="margin-top:0.8rem;">Score: <code>${esc(toks.join(' '))}</code></p><p>${fac.join(' · ')}</p>` +
      (zero ? `<p class="big">P = <b>0</b>: an unseen bigram. Try Laplace.</p>` : `<p class="big">P = <b>${Math.exp(lp).toPrecision(4)}</b>, log P = ${f4(lp)}, perplexity \\(= P^{-1/${n}} =\\) <b>${Math.exp(-lp / n).toFixed(3)}</b></p>`);
    mathIn(out);
  }
  [T, X].forEach(e => e.addEventListener('input', render));
  Bs.addEventListener('input', render);
  render();
}

/* ---------- Part V: generate from Emma ---------- */
function initEmma() {
  if (typeof EMMA === 'undefined') return;
  const idx = new Map(EMMA.v.map((w, i) => [w, i])), start = document.getElementById('em-start'), out = document.getElementById('em-out'), nx = document.getElementById('em-next');
  let mode = 'sample', seed = 1;
  pills(document.getElementById('em-mode'), [['sample', 'Sample'], ['greedy', 'Greedy']], mode, (k) => { mode = k; render(); });
  document.getElementById('em-go').addEventListener('click', () => { seed++; render(); });
  function render() {
    const w0 = start.value.trim();
    if (!idx.has(w0)) { out.innerHTML = `<span class="note">"${esc(w0)}" does not occur in <i>Emma</i> (words are case-sensitive: try She, I, Emma, Mr, very).</span>`; nx.innerHTML = ''; return; }
    const r = rng(seed * 7919), seq = [w0];
    for (let s = 0; s < 20; s++) {
      const n = EMMA.n[idx.get(seq[seq.length - 1])]; if (!n.length) break;
      if (mode === 'greedy') { seq.push(EMMA.v[n[0]]); continue; }
      let tot = 0; for (let j = 1; j < n.length; j += 2) tot += n[j];
      let x = r() * tot, j = 0; while (x >= n[j + 1] && j + 2 < n.length) { x -= n[j + 1]; j += 2; }
      seq.push(EMMA.v[n[j]]);
    }
    out.innerHTML = seq.map((w, i) => `<span class="${i ? '' : 'first'}">${esc(w)}</span>`).join(' ');
    const n = EMMA.n[idx.get(w0)], c = EMMA.c[idx.get(w0)], top = [];
    for (let j = 0; j < Math.min(n.length, 16); j += 2) top.push([EMMA.v[n[j]], n[j + 1]]);
    nx.innerHTML = `<p class="al-h">P( next | ${esc(w0)} ) <span>c(${esc(w0)}) = ${c.toLocaleString('en')}, ${n.length / 2} different next words</span></p><div class="em-bars">` + top.map(([w, k]) => `<div class="em-row"><span class="em-w">${esc(w)}</span><span class="em-bar"><span style="width:${(100 * k / top[0][1]).toFixed(1)}%"></span></span><span class="em-p">${k}/${c} = ${f3(k / c)}</span></div>`).join('') + '</div>';
  }
  start.addEventListener('input', render);
  render();
}

/* ---------- Part VI: Good–Turing ---------- */
function initGoodTuring() {
  const inp = document.getElementById('gt-in'), out = document.getElementById('gt-out');
  const P = { fish: ['Fishing', 'carp:10, perch:3, whitefish:2, trout:1, salmon:1, eel:1'], afterI: ['After "I"', 'am:2, like:2, do:1'] };
  pills(document.getElementById('gt-pre'), Object.entries(P).map(([k, v]) => [k, v[0]]), 'fish', (k) => { inp.value = P[k][1]; render(); });
  inp.value = P.fish[1];
  function render() {
    const counts = inp.value.split(',').map(s => s.trim().split(':')).filter(p => p.length === 2 && +p[1] > 0).map(([n, c]) => [n.trim(), Math.round(+c)]);
    if (!counts.length) { out.innerHTML = '<p class="note">Type counts as name:count, separated by commas.</p>'; return; }
    const G = goodTuring(counts);
    out.innerHTML = `<p class="big">\\(N = ${G.N}\\), \\(N_1 = ${G.Nc.get(1) || 0}\\): \\(P(\\text{unseen}) = N_1 / N = ${frac(G.Nc.get(1) || 0, G.N)} \\approx ${f3(G.unseen)}\\)</p>` +
      `<div class="table-wrap"><table class="summary sc-small rr-num"><thead><tr><th>item</th><th>\\(c\\)</th><th>MLE \\(c/N\\)</th><th>\\(N_c\\)</th><th>\\(N_{c+1}\\)</th><th>\\(c^* = (c+1)N_{c+1}/N_c\\)</th><th>\\(P^* = c^*/N\\)</th></tr></thead><tbody>` +
      G.rows.map(r => `<tr><td><b>${esc(r.n)}</b></td><td>${r.c}</td><td>${frac(r.c, G.N)}</td><td>${r.nc}</td><td>${r.nc1}</td><td class="${r.cs === 0 ? 'gt-bad' : r.cs > r.c ? 'gt-bad' : ''}">${+r.cs.toFixed(3)}</td><td>${f3(r.p)}</td></tr>`).join('') + '</tbody></table></div>' +
      (G.rows.some(r => r.cs === 0) ? `<p class="note">❗ \\(c^* = 0\\) where no item occurs \\(c + 1\\) times: the "no word occurs \\(c+1\\) times" problem.</p>` : '') +
      (G.rows.some(r => r.cs > r.c) ? `<p class="note">❗ \\(c^* > c\\): with so little data the estimate is unreliable.</p>` : '');
    mathIn(out);
  }
  inp.addEventListener('input', render);
  render();
}

/* ---------- Part VIII: query likelihood on a toy collection ---------- */
function initQlToy() {
  const Q = document.getElementById('ql-q'), L = document.getElementById('ql-l'), box = document.getElementById('ql-docs'), out = document.getElementById('ql-out');
  const D = ['wing wing drag flow', 'wing wing flow', 'boundary layer flow over a flat plate', 'drag of a heated cylinder'];
  Q.value = 'wing drag';
  box.innerHTML = D.map((t, i) => `<label class="ql-d"><span>d${i + 1}</span><input class="ii-input" value="${esc(t)}" spellcheck="false" autocomplete="off" data-i="${i}"></label>`).join('');
  const inputs = [...box.querySelectorAll('input')];
  function render() {
    const lam = +L.value; document.getElementById('ql-l-val').textContent = lam.toFixed(2);
    const docs = inputs.map(x => x.value.toLowerCase().split(/\s+/).filter(Boolean)), all = docs.flat(), CL = all.length;
    const cc = new Map(); all.forEach(w => cc.set(w, (cc.get(w) || 0) + 1));
    const q = Q.value.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = docs.map((d, i) => {
      const tf = new Map(); d.forEach(w => tf.set(w, (tf.get(w) || 0) + 1));
      let lp = 0; const cells = q.map(w => { const pd = d.length ? (tf.get(w) || 0) / d.length : 0, pc = (cc.get(w) || 0) / CL, p = (1 - lam) * pd + lam * pc; lp += Math.log(p); return { w, tf: tf.get(w) || 0, n: d.length, pd, pc, p }; });
      return { i, cells, lp };
    });
    const order = rows.slice().sort((a, b) => b.lp - a.lp || a.i - b.i), rank = new Map(order.map((r, k) => [r.i, k + 1]));
    out.innerHTML = `<div class="table-wrap"><table class="summary sc-small rr-num ql-table"><thead><tr><th>doc</th>${q.map(w => `<th>P(${esc(w)} | d)</th>`).join('')}<th>\\(\\log P(q \\mid d)\\)</th><th>\\(P(q \\mid d)\\)</th><th>rank</th></tr></thead><tbody>` +
      rows.map(r => `<tr class="${rank.get(r.i) === 1 && isFinite(r.lp) ? 'top' : ''}"><td><b>d${r.i + 1}</b></td>${r.cells.map(c => `<td class="${c.p === 0 ? 'z' : ''}"><span class="ql-f">${lam < 1 ? `${+(1 - lam).toFixed(2)}·${c.tf}/${c.n}` : ''}${lam > 0 && lam < 1 ? ' + ' : ''}${lam > 0 ? `${+lam.toFixed(2)}·${cc.get(c.w) || 0}/${CL}` : ''}</span> = ${f4(c.p)}</td>`).join('')}<td>${isFinite(r.lp) ? f3(r.lp) : '−∞'}</td><td>${isFinite(r.lp) ? Math.exp(r.lp).toPrecision(3) : '0'}</td><td>${isFinite(r.lp) ? rank.get(r.i) : '–'}</td></tr>`).join('') + '</tbody></table></div>' +
      `<p class="note">Each cell: \\((1-\\lambda)\\cdot tf/|d| + \\lambda \\cdot tf_C/|C|\\), with \\(|C| = ${CL}\\) tokens. ${lam === 0 ? '❗ At \\(\\lambda = 0\\) this is plain maximum likelihood: a document missing any query word gets probability 0.' : q.some(w => !cc.get(w)) ? '❗ A query word that occurs in no document still gets probability 0 everywhere: smoothing with the collection cannot help (see Part IX).' : 'Every document now has a non-zero probability.'}</p>`;
    mathIn(out);
  }
  [Q, ...inputs].forEach(x => x.addEventListener('input', render));
  L.addEventListener('input', render);
  render();
}

/* ---------- Part IX: query likelihood vs BM25 on Cranfield ---------- */
function initQlCran() {
  const sel = document.getElementById('qc-sel'), L = document.getElementById('qc-l'), lists = document.getElementById('qc-lists'), svg = document.getElementById('qc-svg'), out = document.getElementById('qc-out'), table = document.getElementById('qc-table');
  fillQuerySelect(sel, 0);
  let sweep = null, base = null;
  function render() {
    const i = +sel.value, lam = +L.value, q = C.queries[i], J = C.qrels[String(i + 1)];
    document.getElementById('qc-l-val').textContent = lam.toFixed(2);
    const sq = qlScores(q, lam), sb = bm25Scores(q);
    const oov = splitTokens(q).filter(w => !okapi().wid.has(w));
    lists.innerHTML = `<div><p class="al-h">Query likelihood, λ = ${lam.toFixed(2)} <span>${mline(runOf(sq), J)}</span></p>${oov.length ? `<p class="rr-note pf-eq">skipped (not in the collection): ${oov.map(esc).join(' ')}</p>` : ''}${topList(sq, J, 10)}</div>` +
      `<div><p class="al-h">BM25 <span>${mline(runOf(sb), J)}</span></p>${topList(sb, J, 10)}</div>`;
    plot();
  }
  function plot() {
    svg.innerHTML = '';
    const W = 460, H = 250, Lm = 44, R = 12, T = 12, B = 36, x = (v) => Lm + (v - 0.05) / 0.9 * (W - Lm - R), y = (v) => H - B - (v - 0.1) / 0.2 * (H - B - T);
    [0.1, 0.15, 0.2, 0.25, 0.3].forEach(v => { el('line', { x1: Lm, x2: W - R, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, Lm - 6, y(v) + 4, v.toFixed(2), 'tick', 'end'); });
    [0.05, 0.25, 0.5, 0.75, 0.95].forEach(v => txt(svg, x(v), H - B + 16, v, 'tick', 'middle'));
    txt(svg, Lm + (W - Lm - R) / 2, H - 4, 'λ (weight of the collection model)', 'tick', 'middle');
    txt(svg, 12, T + (H - B - T) / 2, 'MAP', 'tick', 'middle', { transform: `rotate(-90 12 ${T + (H - B - T) / 2})` });
    if (!base) { txt(svg, W / 2, H / 2, 'computing MAP for every λ…', 'tick', 'middle'); return; }
    [['bm25', 'qc-bm'], ['tfidf', 'qc-tf']].forEach(([k, c]) => el('line', { x1: Lm, x2: W - R, y1: y(base[k].agg.MAP), y2: y(base[k].agg.MAP), class: c }, svg));
    if (sweep && sweep.length) {
      el('polyline', { points: sweep.map(([l, m]) => `${x(l)},${y(m)}`).join(' '), class: 'qc-ql' }, svg);
      sweep.forEach(([l, m]) => el('circle', { cx: x(l), cy: y(m), r: Math.abs(l - +L.value) < 1e-9 ? 5.5 : 3, class: 'qc-pt' + (Math.abs(l - +L.value) < 1e-9 ? ' cur' : '') }, svg));
      const cur = sweep.find(([l]) => Math.abs(l - +L.value) < 1e-9), best = sweep.reduce((a, b) => (b[1] > a[1] ? b : a));
      out.innerHTML = `<p class="big">MAP over 225 queries${cur ? `, λ = ${(+L.value).toFixed(2)}: <b>${f4(cur[1])}</b>` : ''}</p><p>BM25 ${f4(base.bm25.agg.MAP)} · TF-IDF ${f4(base.tfidf.agg.MAP)} · best λ on this grid: ${best[0].toFixed(2)} (${f4(best[1])})</p>` +
        (sweep.length < 19 ? '<p class="note">computing the other λ values…</p>' : '');
    }
  }
  function fillTable() {
    const rows = [['TF-IDF (Lab 04)', base.tfidf], ['BM25 (Lab 04)', base.bm25], ['BM25 + PRF, k = 3, m = 3', base.prf], ['Query likelihood, outline (λ = 0.2)', base.qlOutline], ['Query likelihood, fixed (λ = 0.2)', base.ql02]];
    table.innerHTML = `<thead><tr><th>System (225 queries, top 100)</th>${MEASURES.map(([n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>` +
      rows.map(([n, r]) => `<tr><td><b>${n}</b></td>${MEASURES.map(([m]) => `<td class="${Math.max(...rows.map(x => x[1].agg[m])) === r.agg[m] ? 'hit' : ''}">${f4(r.agg[m])}</td>`).join('')}</tr>`).join('') + '</tbody>';
  }
  sel.addEventListener('change', render);
  L.addEventListener('input', render);
  render();
  // evaluation in the background, after the page is interactive
  setTimeout(() => {
    base = { tfidf: evaluateSystem(q => tfidfScores(q)), bm25: evaluateSystem(q => bm25Scores(q)), prf: evaluateSystem(prfScoreFn(3, 3)), qlOutline: evaluateSystem(q => qlScores(q, 0.2, false)), ql02: evaluateSystem(q => qlScores(q, 0.2)) };
    fillTable(); sweep = [];
    const grid = Array.from({ length: 19 }, (_, j) => +(0.05 + 0.05 * j).toFixed(2));
    const step = (j) => { if (j >= grid.length) return; sweep.push([grid[j], evaluateSystem(q => qlScores(q, grid[j])).agg.MAP]); plot(); setTimeout(() => step(j + 1), 0); };
    step(0);
  }, 200);
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initExpansion();
  initRocchio2D();
  initRocchioWords();
  if (C) initPrf();
  initBigram();
  initEmma();
  initGoodTuring();
  initQlToy();
  if (C) initQlCran();
});

}

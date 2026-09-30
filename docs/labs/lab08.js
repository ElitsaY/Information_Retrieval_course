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
const big = (n) => n >= 1e12 ? (n / 1e12).toPrecision(3) + ' trillion' : n >= 1e9 ? (n / 1e9).toPrecision(3) + ' billion' : n >= 1e6 ? (n / 1e6).toPrecision(3) + ' million' : Math.round(n).toLocaleString('en');


/* ====================== Cranfield (pure; C = CRAN from lab04-cranfield.js, D = DENSE from lab08-dense.js) ====================== */
const C = typeof CRAN !== 'undefined' ? CRAN : (typeof global !== 'undefined' && global.CRAN) || null;
const D = typeof DENSE !== 'undefined' ? DENSE : (typeof global !== 'undefined' && global.DENSE) || null;
const unflat = (flat) => { const m = []; for (let i = 0; i < flat.length; i += 2) m.push([flat[i], flat[i + 1]]); return m; };
function topIdx(scores, k) { return Array.from(scores, (s, i) => [s, i]).sort((a, b) => b[0] - a[0] || b[1] - a[1]).slice(0, k).map(x => x[1]); }
let OK = null;
function okapi() {   // rank_bm25's BM25Okapi on text.lower().split() tokens (Lab 04)
  if (OK) return OK;
  const N = C.ids.length, docTerms = C.wterms.map(unflat), len = docTerms.map(ts => ts.reduce((s, [, f]) => s + f, 0));
  const avgdl = len.reduce((a, b) => a + b, 0) / N, post = new Map();
  docTerms.forEach((ts, i) => ts.forEach(([t, f]) => { if (!post.has(t)) post.set(t, []); post.get(t).push([i, f]); }));
  const idf = new Map(); let sum = 0;
  post.forEach((p, t) => { const v = Math.log(N - p.length + 0.5) - Math.log(p.length + 0.5); idf.set(t, v); sum += v; });
  const eps = 0.25 * sum / idf.size;
  idf.forEach((v, t) => { if (v < 0) idf.set(t, eps); });
  return (OK = { N, len, avgdl, post, idf, wid: new Map(C.wvocab.map((w, i) => [w, i])) });
}
function bm25Scores(q, k1 = 1.5, b = 0.75) {
  const O = okapi(), scores = new Float64Array(O.N);
  q.toLowerCase().split(/\s+/).filter(Boolean).forEach(w => {
    const t = O.wid.get(w); if (t === undefined) return;
    const idf = O.idf.get(t);
    O.post.get(t).forEach(([i, tf]) => { scores[i] += idf * (tf * (k1 + 1) / (tf + k1 * (1 - b + b * O.len[i] / O.avgdl))); });
  });
  return scores;
}
let TF = null;
function tfidfScores(q) {   // TfidfVectorizer(lowercase=True, norm="l2") + cosine (Lab 04)
  if (!TF) {
    const N = C.ids.length, df = new Map(), docs = [];
    C.terms.forEach(flat => { const m = new Map(); unflat(flat).forEach(([t, f]) => { if (C.vocab[t].length >= 2) m.set(C.vocab[t], f); }); docs.push(m); m.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1)); });
    const idf = new Map([...df].map(([w, d]) => [w, Math.log((1 + N) / (1 + d)) + 1]));
    const post = new Map(), dnorm = [];
    docs.forEach((m, i) => { let s = 0; m.forEach((f, w) => { const x = f * idf.get(w); s += x * x; if (!post.has(w)) post.set(w, []); post.get(w).push([i, f]); }); dnorm.push(Math.sqrt(s)); });
    TF = { N, idf, post, dnorm };
  }
  const scores = new Float64Array(TF.N), qc = new Map();
  (q.toLowerCase().match(/[\p{L}\p{N}_]+/gu) || []).forEach(w => { if (w.length >= 2 && TF.idf.has(w)) qc.set(w, (qc.get(w) || 0) + 1); });
  let qn = 0; qc.forEach((f, w) => { const x = f * TF.idf.get(w); qn += x * x; }); qn = Math.sqrt(qn);
  if (qn > 0) qc.forEach((f, w) => { const qw = f * TF.idf.get(w) / qn; TF.post.get(w).forEach(([i, tf]) => { scores[i] += qw * tf * TF.idf.get(w) / TF.dnorm[i]; }); });
  return scores;
}
// a run = doc ids in trec_eval order (score descending, then doc id descending), top 100
function runFromScores(scores, k = 100) { return topIdx(scores, k).map(i => [scores[i], C.ids[i]]).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0)).map(x => x[1]); }
function denseRun(qi) { return D.runs[qi].map(([i, s]) => [s, C.ids[i]]).sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0)).map(x => x[1]); }
function relevantCount(J) { return Object.values(J).filter(g => g >= 1).length; }
function precisionAt(run, J, k) { let h = 0; for (let i = 0; i < k; i++) if (i < run.length && (J[run[i]] ?? 0) >= 1) h++; return h / k; }
function recallAt(run, J, k) { const R = relevantCount(J); if (!R) return 0; let h = 0; for (let i = 0; i < Math.min(k, run.length); i++) if ((J[run[i]] ?? 0) >= 1) h++; return h / R; }
function reciprocalRank(run, J) { for (let i = 0; i < run.length; i++) if ((J[run[i]] ?? 0) >= 1) return 1 / (i + 1); return 0; }
function averagePrecision(run, J) { const R = relevantCount(J); if (!R) return 0; let h = 0, s = 0; run.forEach((d, i) => { if ((J[d] ?? 0) >= 1) { h++; s += h / (i + 1); } }); return s / R; }
function dcg(g, k) { let s = 0; g.slice(0, k).forEach((x, i) => { s += (x > 0 ? x : 0) / Math.log2(i + 2); }); return s; }
function ndcgAt(run, J, k) { const ideal = Object.values(J).filter(g => g > 0).sort((a, b) => b - a), id = dcg(ideal, k); return id ? dcg(run.map(d => J[d] ?? 0), k) / id : 0; }
const MEASURES = [['P@10', (r, j) => precisionAt(r, j, 10)], ['Recall@10', (r, j) => recallAt(r, j, 10)], ['Recall@100', (r, j) => recallAt(r, j, 100)], ['MRR', reciprocalRank], ['MAP', averagePrecision], ['nDCG@10', (r, j) => ndcgAt(r, j, 10)]];
let SYS = null;
function systems() {
  if (SYS) return SYS;
  const runs = { tfidf: C.queries.map(q => runFromScores(tfidfScores(q))), bm25: C.queries.map(q => runFromScores(bm25Scores(q))), dense: C.queries.map((_, i) => denseRun(i)) };
  const per = {}, agg = {};
  Object.entries(runs).forEach(([s, rs]) => { per[s] = {}; agg[s] = {}; MEASURES.forEach(([n, f]) => { per[s][n] = rs.map((r, i) => f(r, C.qrels[String(i + 1)])); agg[s][n] = per[s][n].reduce((a, b) => a + b, 0) / rs.length; }); });
  return (SYS = { runs, per, agg });
}
// scikit-learn TfidfVectorizer on a handful of texts: \b\w\w+\b tokens, smoothed idf, L2 rows
function tinyTfidf(texts) {
  const toks = texts.map(t => t.toLowerCase().match(/\b\w\w+\b/g) || []), N = texts.length;
  const vocab = [...new Set(toks.flat())].sort(), df = new Map(vocab.map(w => [w, toks.filter(t => t.includes(w)).length]));
  const rows = toks.map(t => { const v = vocab.map(w => t.filter(x => x === w).length * (Math.log((1 + N) / (1 + df.get(w))) + 1)); const n = Math.hypot(...v); return v.map(x => (n ? x / n : 0)); });
  return { vocab, rows };
}

if (typeof module !== 'undefined') module.exports = { systems, tinyTfidf, MEASURES };
if (typeof document !== 'undefined') {


/* ---------- math ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- hero: clusters of points, a query and its nearest neighbours ---------- */
function initHero() {
  const svg = document.getElementById('dr-hero-bg'), r = rng(8), pts = [];
  const centers = [[160, 90], [420, 210], [700, 80], [960, 200], [1110, 70]];
  centers.forEach(([cx, cy], k) => { for (let i = 0; i < 16; i++) { const a = r() * 6.283, d = Math.pow(r(), 0.7) * 70; pts.push([cx + Math.cos(a) * d * 1.4, cy + Math.sin(a) * d, k]); } });
  const q = [735, 120];
  pts.map(p => [Math.hypot(p[0] - q[0], p[1] - q[1]), p]).sort((a, b) => a[0] - b[0]).slice(0, 5).forEach(([, p]) => el('line', { x1: q[0], y1: q[1], x2: p[0], y2: p[1], class: 'hl' }, svg));
  pts.forEach(p => el('circle', { cx: p[0], cy: p[1], r: 5, class: 'hp c' + (p[2] % 3) }, svg));
  el('path', { d: `M${q[0]},${q[1] - 13} L${q[0] + 4},${q[1] - 4} L${q[0] + 13},${q[1] - 3} L${q[0] + 6},${q[1] + 3} L${q[0] + 8},${q[1] + 12} L${q[0]},${q[1] + 7} L${q[0] - 8},${q[1] + 12} L${q[0] - 6},${q[1] + 3} L${q[0] - 13},${q[1] - 3} L${q[0] - 4},${q[1] - 4} Z`, class: 'hq' }, svg);
}

/* ---------- Part I: sparse vs dense ---------- */
function initSparseDense() {
  const T = tinyTfidf(D.tiny.texts), v = T.rows[0], nz = v.filter(x => x > 0).length;
  document.getElementById('sd-sp-n').textContent = `${nz} of ${T.vocab.length} non-zero`;
  document.getElementById('sd-sparse').innerHTML = T.vocab.map((w, i) => `<span class="sd-t${v[i] > 0 ? ' nz' : ''}"><b>${v[i] > 0 ? f3(v[i]) : '0'}</b><small>${esc(w)}</small></span>`).join('');
  const box = document.getElementById('sd-dense'), info = document.getElementById('sd-cell'), vec = D.vec0, m = Math.max(...vec.map(Math.abs));
  box.innerHTML = vec.map((x, i) => `<span class="sd-c" data-i="${i}" style="background:color-mix(in srgb, ${x >= 0 ? 'var(--indigo)' : '#d9546e'} ${Math.round(12 + 88 * Math.abs(x) / m)}%, var(--surface))"></span>`).join('');
  const show = (i) => { info.innerHTML = `dimension ${i}: <b>${vec[i].toFixed(5)}</b> · first ten: [${vec.slice(0, 10).map(x => x.toFixed(3)).join(', ')}] · length \\(\\|v\\| = 1\\)`; mathIn(info); };
  box.querySelectorAll('.sd-c').forEach(c => { c.addEventListener('mouseenter', () => show(+c.dataset.i)); c.addEventListener('click', () => show(+c.dataset.i)); });
  show(0);
}

/* ---------- Part II: map of phrases ---------- */
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
    const shown = new Set([sel]);
    M.phrases.forEach((p, i) => {
      const g = el('g', { class: `mp-p ${M.groups[i]}${i === sel ? ' sel' : ''}`, tabindex: 0, role: 'button', 'aria-label': p }, svg);
      el('circle', { cx: X(M.xy[i][0]), cy: Y(M.xy[i][1]), r: i === sel ? 8 : 6 }, g);
      el('title', {}, g).textContent = p;
      const pick = () => { sel = i; render(); };
      g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    [...shown].forEach((i, k) => { const left = M.xy[i][0] > (x0 + x1) / 2; txt(svg, X(M.xy[i][0]) + (left ? -12 : 12), Y(M.xy[i][1]) + 4, M.phrases[i], 'mp-l sel', left ? 'end' : 'start'); });
    [['car', 'cars'], ['med', 'medicine'], ['food', 'food'], ['hist', 'history']].forEach(([g, n], k) => { el('circle', { cx: 16 + k * 70, cy: H - 12, r: 5, class: 'mp-key ' + g }, svg); txt(svg, 25 + k * 70, H - 8, n, 'tick'); });
    const all = M.sim[sel].map((s, j) => [s, j]).filter(([, j]) => j !== sel).sort((a, b) => b[0] - a[0]);
    out.innerHTML = `<p class="al-h">${esc(M.phrases[sel])}</p><p class="note">cosine in 384 dimensions, highest first · click a phrase to select it</p><ol class="mp-list">` + all.map(([s, j]) => `<li class="${M.groups[j]}" data-j="${j}" tabindex="0"><span>${esc(M.phrases[j])}</span><b>${f3(s)}</b></li>`).join('') + '</ol>';
    out.querySelectorAll('.mp-list li').forEach(li => { const go = () => { sel = +li.dataset.j; render(); }; li.addEventListener('click', go); li.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); });
  }
  render();
}

/* ---------- Part III: model calls ---------- */
function initModelCalls() {
  const N = document.getElementById('mc-n'), Q = document.getElementById('mc-q'), out = document.getElementById('mc-out');
  function render() {
    const n = Math.round(Math.pow(10, +N.value)), q = Math.round(Math.pow(10, +Q.value)), ms = 5;
    document.getElementById('mc-n-val').textContent = big(n); document.getElementById('mc-q-val').textContent = big(q);
    const t = (calls) => { const s = calls * ms / 1000; return s < 60 ? s.toPrecision(3) + ' s' : s < 3600 ? (s / 60).toPrecision(3) + ' min' : s < 86400 * 2 ? (s / 3600).toPrecision(3) + ' h' : s < 86400 * 730 ? (s / 86400).toPrecision(3) + ' days' : (s / 86400 / 365).toPrecision(3) + ' years'; };
    out.innerHTML = `<div class="table-wrap"><table class="summary sc-small rr-num"><thead><tr><th></th><th>offline, once</th><th>online, per day</th><th>model time per day at 5 ms a call</th></tr></thead><tbody>` +
      `<tr><td><b>Bi-encoder</b></td><td>${big(n)} document encodings</td><td>${big(q)} query encodings</td><td class="hit">${t(q)}</td></tr>` +
      `<tr><td><b>Cross-encoder</b> (query and document together)</td><td>nothing can be precomputed</td><td>${big(n * q)} pair encodings</td><td>${t(n * q)}</td></tr></tbody></table></div>` +
      `<p class="rr-note">5 ms per model call is an illustrative figure. The bi-encoder still has to compare the query vector with ${big(n)} stored vectors, but a dot product is far cheaper than a model call (<a href="#nn">Part VIII</a>).</p>`;
  }
  [N, Q].forEach(s => s.addEventListener('input', render));
  render();
}

/* ---------- Part IV: similarity functions ---------- */
function initSimFns() {
  const L = document.getElementById('sf-len'), NM = document.getElementById('sf-norm'), svg = document.getElementById('sf-svg'), out = document.getElementById('sf-out');
  const ang = (d) => d * Math.PI / 180;
  function render() {
    const len = +L.value, norm = NM.checked; document.getElementById('sf-len-val').textContent = len.toFixed(1);
    let q = [Math.cos(ang(20)), Math.sin(ang(20))].map(x => x * 1.2);
    let V = { A: [len * Math.cos(ang(55)), len * Math.sin(ang(55))], B: [1.0 * Math.cos(ang(28)), 1.0 * Math.sin(ang(28))], C: [0.8 * Math.cos(ang(-10)), 0.8 * Math.sin(ang(-10))] };
    const unit = (v) => { const n = Math.hypot(...v); return v.map(x => x / n); };
    if (norm) { q = unit(q); Object.keys(V).forEach(k => { V[k] = unit(V[k]); }); }
    svg.innerHTML = '';
    const O = [50, 290], sc = 85, P = (v) => [O[0] + v[0] * sc, O[1] - v[1] * sc];
    const defs = el('defs', {}, svg);
    ['q', 'd'].forEach(k => { const m = el('marker', { id: 'sf-a' + k, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'sf-ah ' + k }, m); });
    [1, 2, 3].forEach(rr => el('circle', { cx: O[0], cy: O[1], r: rr * sc, class: 'sf-ring' + (rr === 1 ? ' unit' : '') }, svg));
    el('line', { x1: O[0], y1: O[1], x2: 350, y2: O[1], class: 'grid-line' }, svg); el('line', { x1: O[0], y1: O[1], x2: O[0], y2: 10, class: 'grid-line' }, svg);
    Object.entries(V).forEach(([k, v]) => { const [x, y] = P(v); el('line', { x1: O[0], y1: O[1], x2: x, y2: y, class: 'sf-d', 'marker-end': 'url(#sf-ad)' }, svg); txt(svg, x + 6, y - 4, k, 'sf-l'); el('line', { x1: P(q)[0], y1: P(q)[1], x2: x, y2: y, class: 'sf-dist' }, svg); });
    const [qx, qy] = P(q); el('line', { x1: O[0], y1: O[1], x2: qx, y2: qy, class: 'sf-q', 'marker-end': 'url(#sf-aq)' }, svg); txt(svg, qx + 6, qy + 12, 'q', 'sf-l q');
    const rows = Object.entries(V).map(([k, v]) => { const dot = q[0] * v[0] + q[1] * v[1]; return { k, dot, cos: dot / (Math.hypot(...q) * Math.hypot(...v)), eu: Math.hypot(q[0] - v[0], q[1] - v[1]), len: Math.hypot(...v) }; });
    const order = (key, asc) => rows.slice().sort((a, b) => asc ? a[key] - b[key] : b[key] - a[key]).map(r => r.k).join(' > ');
    const same = order('cos') === order('dot') && order('cos') === order('eu', true);
    out.innerHTML = `<div class="table-wrap"><table class="summary sc-small rr-num"><thead><tr><th>doc</th><th>length</th><th>cosine</th><th>dot</th><th>distance</th></tr></thead><tbody>` +
      rows.map(r => `<tr><td><b>${r.k}</b></td><td>${f3(r.len)}</td><td>${f3(r.cos)}</td><td>${f3(r.dot)}</td><td>${f3(r.eu)}</td></tr>`).join('') + '</tbody></table></div>' +
      `<p>Ranking by cosine: <b>${order('cos')}</b><br>by dot product: <b>${order('dot')}</b><br>by distance: <b>${order('eu', true)}</b></p>` +
      `<p class="note">${same ? (norm ? 'Normalized: the three rankings are identical, as they must be.' : 'All three agree at this length. Stretch A.') : '❗ The rankings disagree: the dot product rewards the long vector A, although its direction is the furthest from q.'}</p>`;
  }
  L.addEventListener('input', render); NM.addEventListener('change', render);
  render();
}

/* ---------- Part V: tiny collection queries and heatmap ---------- */
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
function initHeatmap() {
  const M = D.map, t = document.getElementById('hm'), info = document.getElementById('hm-cell');
  const short = (p) => p.length > 22 ? p.slice(0, 20) + '…' : p;
  t.innerHTML = `<thead><tr><th></th>${M.phrases.map(p => `<th><span>${esc(short(p))}</span></th>`).join('')}</tr></thead><tbody>` +
    M.phrases.map((p, i) => `<tr><th>${esc(short(p))}</th>${M.sim[i].map((s, j) => `<td data-i="${i}" data-j="${j}" style="background:color-mix(in srgb, var(--indigo) ${Math.round(Math.max(0, s) * 100)}%, var(--surface));${s > 0.55 ? 'color:#fff;' : ''}" title="${esc(p)} · ${esc(M.phrases[j])}: ${f3(s)}">${s.toFixed(2)}</td>`).join('')}</tr>`).join('') + '</tbody>';
  t.querySelectorAll('td').forEach(c => c.addEventListener('click', () => { const i = +c.dataset.i, j = +c.dataset.j; t.querySelectorAll('td.on').forEach(x => x.classList.remove('on')); c.classList.add('on'); info.innerHTML = `<b>${esc(M.phrases[i])}</b> · <b>${esc(M.phrases[j])}</b>: cosine ${f3(M.sim[i][j])}`; }));
}

/* ---------- Cranfield helpers ---------- */
const GRADE_DEF = { 4: 'complete answer', 3: 'high relevance', 2: 'useful', 1: 'minimum interest', '-1': 'no interest' };
const gradeBadge = (g) => `<span class="rr-g ${g === null || g === undefined ? 'none' : 'g' + (g < 0 ? 'n' : g)}" title="${g === null || g === undefined ? 'not judged' : 'grade ' + g + ': ' + GRADE_DEF[g]}">${g === null || g === undefined ? '–' : g}</span>`;
const qLabel = (i) => `${i + 1} · ${C.queries[i].length > 90 ? C.queries[i].slice(0, 88) + '…' : C.queries[i]}`;
function fillQuerySelect(sel, cur = 0) { sel.innerHTML = C.queries.map((_, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${esc(qLabel(i))}</option>`).join(''); }
const docIdx = (id) => +id - 1;   // Cranfield ids are 1..1400 in order

/* ---------- Part VI: t-SNE map ---------- */
function initTsne() {
  const sel = document.getElementById('ts-sel'), svg = document.getElementById('ts-svg'), out = document.getElementById('ts-out');
  fillQuerySelect(sel, 0);
  const P = D.tsne, xs = P.map(p => p[0]), ys = P.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const X = (v) => 12 + (v - x0) / (x1 - x0) * 416, Y = (v) => 428 - (v - y0) / (y1 - y0) * 416;
  let clicked = null;
  function render() {
    const qi = +sel.value, J = C.qrels[String(qi + 1)], top = D.runs[qi].slice(0, 10).map(r => r[0]), topSet = new Set(top);
    svg.innerHTML = '';
    const g0 = el('g', {}, svg);
    for (let i = 0; i < 1400; i++) {
      const rel = (J[C.ids[i]] ?? 0) >= 1, c = el('circle', { cx: X(P[i][0]), cy: Y(P[i][1]), r: rel || topSet.has(i) ? 4.2 : 2.4, class: 'ts-d' + (rel ? ' rel' : '') + (topSet.has(i) ? ' top' : '') + (clicked === i ? ' clk' : '') }, rel || topSet.has(i) ? svg : g0);
      c.addEventListener('click', () => { clicked = i; render(); });
    }
    const [qx, qy] = P[1400 + qi];
    el('circle', { cx: X(qx), cy: Y(qy), r: 8, class: 'ts-q' }, svg);
    const nRel = relevantCount(J), found = top.filter(i => (J[C.ids[i]] ?? 0) >= 1).length;
    out.innerHTML = `<p class="al-h">Query ${qi + 1}</p><p class="note">${esc(C.queries[qi])}</p><p>Relevant documents: <b>${nRel}</b>; in the dense top 10: <b>${found}</b>.</p>` +
      (clicked !== null ? `<p>${gradeBadge(J[C.ids[clicked]])} <b>doc ${C.ids[clicked]}</b>: ${esc(C.titles[clicked])}${topSet.has(clicked) ? ` <span class="note">(dense rank ${top.indexOf(clicked) + 1})</span>` : ''}</p>` : '<p class="note">Click a dot to read its title.</p>') +
      `<p class="rr-note">t-SNE keeps near neighbors near where it can, but distances between far-apart regions mean little; some of the ringed top 10 may lie away from the query in 2-D although they are its closest vectors in 384-D.</p>`;
  }
  sel.addEventListener('change', () => { clicked = null; render(); });
  render();
}

/* ---------- Part VII: failure cases ---------- */
function initFail() {
  const F = D.fail, out = document.getElementById('fl-out');
  const NOTE = {
    negation: ['negation', [2, 3], 'The dense model ranks the two neural-network texts first: the word "not" hardly moves the embedding. BM25 does no better (every score is 0), since no lexical method understands negation either.'],
    code: ['exact code', [2], 'The dense model puts a <b>different</b> error code first (0.937): similar-looking strings, similar vectors. The one text with the exact code is third. The model\'s tokenizer cuts 0x80070005 into seven pieces (0, ##x, ##80, ##0, ##70, ##00, ##5), and the other codes are built from almost the same pieces. BM25 finds the right text at once, because the whole token 0x80070005 matches.'],
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

/* ---------- Part VII: evaluation table and per-query comparison ---------- */
function initEval() {
  const S = systems(), t = document.getElementById('ev-table');
  const rows = [['TF-IDF (Lab 04)', 'tfidf'], ['BM25 (Lab 04)', 'bm25'], ['Dense, all-MiniLM-L6-v2', 'dense']];
  t.innerHTML = `<thead><tr><th>System (225 queries)</th>${MEASURES.map(([n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(([n, k]) => `<tr><td><b>${n}</b></td>${MEASURES.map(([m]) => `<td class="${Math.max(...rows.map(r => S.agg[r[1]][m])) === S.agg[k][m] ? 'hit' : ''}">${f4(S.agg[k][m])}</td>`).join('')}</tr>`).join('') + '</tbody>';
}
function initPerQuery() {
  const S = systems(), sel = document.getElementById('cq-sel'), svg = document.getElementById('cq-svg'), out = document.getElementById('cq-out');
  const a = S.per.bm25.MAP, b = S.per.dense.MAP;
  let cur = a.map((v, i) => [Math.abs(b[i] - v), i]).sort((x, y) => y[0] - x[0])[0][1];
  fillQuerySelect(sel, cur);
  sel.addEventListener('change', () => { cur = +sel.value; render(); });
  function render() {
    svg.innerHTML = '';
    const W = 420, H = 420, L = 44, R = 12, T = 12, B = 40, x = (v) => L + v * (W - L - R), y = (v) => H - B - v * (H - B - T);
    [0, 0.25, 0.5, 0.75, 1].forEach(v => { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, L - 6, y(v) + 4, v, 'tick', 'end'); txt(svg, x(v), H - B + 16, v, 'tick', 'middle'); });
    el('line', { x1: x(0), y1: y(0), x2: x(1), y2: y(1), class: 'pq-diag' }, svg);
    txt(svg, x(0.03), y(0.95), 'dense better', 'lbl'); txt(svg, x(0.97), y(0.05), 'BM25 better', 'lbl', 'end');
    a.forEach((v, i) => {
      const c = el('circle', { cx: x(v), cy: y(b[i]), r: i === cur ? 7 : 4.2, class: 'pq-pt' + (b[i] - v > 1e-9 ? ' dn' : v - b[i] > 1e-9 ? ' bm' : '') + (i === cur ? ' cur' : '') }, svg);
      c.addEventListener('click', () => { cur = i; sel.value = i; render(); });
      el('title', {}, c).textContent = `query ${i + 1}: BM25 ${v.toFixed(3)}, dense ${b[i].toFixed(3)}`;
    });
    txt(svg, L + (W - L - R) / 2, H - 6, 'BM25 AP', 'tick', 'middle');
    txt(svg, 12, T + (H - B - T) / 2, 'dense AP', 'tick', 'middle', { transform: `rotate(-90 12 ${T + (H - B - T) / 2})` });
    const J = C.qrels[String(cur + 1)], rb = S.runs.bm25[cur].slice(0, 10), rd = S.runs.dense[cur].slice(0, 10), both = new Set(rb.filter(d => rd.includes(d)));
    const list = (r) => '<ol class="pq-list">' + r.map(d => `<li class="${both.has(d) ? 'cq-both' : ''}">${gradeBadge(J[d])}<span class="rr-doc">doc ${d}</span><span class="pq-t" title="${esc(C.titles[docIdx(d)])}">${esc(C.titles[docIdx(d)] || '(empty)')}</span></li>`).join('') + '</ol>';
    const up = b.filter((v, i) => v > a[i] + 1e-9).length, dn = b.filter((v, i) => v < a[i] - 1e-9).length;
    out.innerHTML = `<p class="big">Dense better on <b>${up}</b> queries, BM25 on <b>${dn}</b>, equal on ${225 - up - dn}.</p><p class="note">Query ${cur + 1}: <i>${esc(C.queries[cur])}</i> · ${both.size} of the top 10 in common (shaded)</p>` +
      `<div class="pq-two"><div><p class="al-h">BM25 <span>AP ${f3(a[cur])}</span></p>${list(rb)}</div><div><p class="al-h">Dense <span>AP ${f3(b[cur])}</span></p>${list(rd)}</div></div>`;
  }
  render();
}

/* ---------- Part VIII: brute force cost ---------- */
function initBruteForce() {
  const N = document.getElementById('bf-n'), out = document.getElementById('bf-out');
  let d = 384;
  pills(document.getElementById('bf-d'), [[384, 'd = 384 (MiniLM)'], [768, 'd = 768'], [1024, 'd = 1024']], d, (k) => { d = +k; render(); });
  function render() {
    const n = Math.round(Math.pow(10, +N.value)); document.getElementById('bf-n-val').textContent = big(n);
    const ops = n * d, bytes = ops * 4, sec = ops / 1e10;
    const mem = bytes < 1e6 ? (bytes / 1e3).toPrecision(3) + ' kB' : bytes < 1e9 ? (bytes / 1e6).toPrecision(3) + ' MB' : bytes < 1e12 ? (bytes / 1e9).toPrecision(3) + ' GB' : (bytes / 1e12).toPrecision(3) + ' TB';
    const tm = sec < 1e-3 ? (sec * 1e6).toPrecision(3) + ' µs' : sec < 1 ? (sec * 1e3).toPrecision(3) + ' ms' : sec.toPrecision(3) + ' s';
    out.innerHTML = `<div class="stat-strip"><div class="stat"><span class="n">${big(ops)}</span><span class="l">multiply-adds per query</span></div><div class="stat"><span class="n">${mem}</span><span class="l">vectors in memory (float32)</span></div><div class="stat"><span class="n">${tm}</span><span class="l">per query, brute force</span></div><div class="stat"><span class="n">${sec > 0 ? Math.max(1, Math.floor(1 / sec)).toLocaleString('en') : '–'}</span><span class="l">queries per second</span></div></div>` +
      `<p class="rr-note">${n <= 2000 ? 'Cranfield (1,400 abstracts): brute force is instant.' : n >= 5e7 ? '❗ Seconds per query and hundreds of gigabytes: this is where an ANN index becomes necessary.' : 'Still feasible on one machine, but every extra query costs a full scan.'}</p>`;
  }
  N.addEventListener('input', render);
  render();
}

/* ---------- Part IX: Recall@k ---------- */
function initRag() {
  const S = systems(), K = document.getElementById('rg-k'), svg = document.getElementById('rg-svg'), out = document.getElementById('rg-out');
  const curve = (s) => Array.from({ length: 50 }, (_, k) => S.runs[s].reduce((acc, run, q) => acc + recallAt(run, C.qrels[String(q + 1)], k + 1), 0) / 225);
  const cv = { dense: curve('dense'), bm25: curve('bm25'), tfidf: curve('tfidf') };
  function render() {
    const k = +K.value; document.getElementById('rg-k-val').textContent = k;
    svg.innerHTML = '';
    const W = 460, H = 250, L = 40, R = 12, T = 12, B = 36, x = (v) => L + (v - 1) / 49 * (W - L - R), y = (v) => H - B - v * (H - B - T);
    [0, 0.25, 0.5, 0.75].forEach(v => { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, L - 6, y(v) + 4, v, 'tick', 'end'); });
    [1, 10, 20, 30, 40, 50].forEach(v => txt(svg, x(v), H - B + 16, v, 'tick', 'middle'));
    [['tfidf', 'rg-tf'], ['bm25', 'rg-bm'], ['dense', 'rg-dn']].forEach(([s, c]) => el('polyline', { points: cv[s].map((v, i) => `${x(i + 1)},${y(v)}`).join(' '), class: c }, svg));
    el('line', { x1: x(k), x2: x(k), y1: T, y2: H - B, class: 'rg-k' }, svg);
    txt(svg, L + (W - L - R) / 2, H - 4, 'k (chunks given to the model)', 'tick', 'middle');
    out.innerHTML = `<p class="big">Mean Recall@${k}: dense <b>${f3(cv.dense[k - 1])}</b>, BM25 <b>${f3(cv.bm25[k - 1])}</b>, TF-IDF <b>${f3(cv.tfidf[k - 1])}</b></p><p class="note">With the top ${k} as context, on average ${(100 * cv.dense[k - 1]).toFixed(0)}% of a query's relevant documents reach the model with dense retrieval, ${(100 * cv.bm25[k - 1]).toFixed(0)}% with BM25.</p>`;
  }
  K.addEventListener('input', render);
  render();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  if (!D) return;
  initSparseDense();
  initMap();
  initModelCalls();
  initSimFns();
  initTinyQueries();
  initHeatmap();
  initFail();
  initBruteForce();
  if (C) { initTsne(); initEval(); initPerQuery(); initRag(); }
});

}

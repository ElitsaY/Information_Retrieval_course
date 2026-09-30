/* ===== Lab 09 interactivity ===== */

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
function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
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
// categorical colours for up to 32 lists, avoiding purple hues
const HUES = [205, 25, 150, 45, 185, 5, 95, 225];
const listColor = (l, faded = false) => `hsl(${HUES[l % 8]} ${faded ? 12 : 55}% ${faded ? 72 : [48, 62, 38, 70][Math.floor(l / 8) % 4]}%)`;


/* ====================== Cranfield IVF (pure; A = ANN from lab09-ann.js, C = CRAN) ====================== */
const A = typeof ANN !== 'undefined' ? ANN : (typeof global !== 'undefined' && global.ANN) || null;
const C = typeof CRAN !== 'undefined' ? CRAN : (typeof global !== 'undefined' && global.CRAN) || null;
const V = typeof VDB !== 'undefined' ? VDB : (typeof global !== 'undefined' && global.VDB) || null;
let RANK = null;
function ranks() {   // 225 x 1400 exact ranking (IndexFlatIP order)
  if (RANK) return RANK;
  const bin = typeof atob !== 'undefined' ? atob(A.rank) : Buffer.from(A.rank, 'base64').toString('binary');
  const n = A.probe.length, N = A.assign.length, out = [];
  for (let q = 0; q < n; q++) { const r = new Array(N); for (let i = 0; i < N; i++) { const o = 2 * (q * N + i); r[i] = bin.charCodeAt(o) | (bin.charCodeAt(o + 1) << 8); } out.push(r); }
  return (RANK = out);
}
const listSizes = () => { const s = new Array(A.nlist).fill(0); A.assign.forEach(l => s[l]++); return s; };
// IVFFlat with nprobe: exact scores inside the first nprobe lists of the query = the exact order filtered to those lists
function ivfSearch(q, nprobe, k = 100) {
  const lists = new Set(A.probe[q].slice(0, nprobe)), out = [];
  for (const i of ranks()[q]) { if (lists.has(A.assign[i])) { out.push(i); if (out.length === k) break; } }
  return out;
}
function relevantCount(J) { return Object.values(J).filter(g => g >= 1).length; }
function precisionAt(run, J, k) { let h = 0; for (let i = 0; i < k; i++) if (i < run.length && (J[run[i]] ?? 0) >= 1) h++; return h / k; }
function recallAt(run, J, k) { const R = relevantCount(J); if (!R) return 0; let h = 0; for (let i = 0; i < Math.min(k, run.length); i++) if ((J[run[i]] ?? 0) >= 1) h++; return h / R; }
function reciprocalRank(run, J) { for (let i = 0; i < run.length; i++) if ((J[run[i]] ?? 0) >= 1) return 1 / (i + 1); return 0; }
function averagePrecision(run, J) { const R = relevantCount(J); if (!R) return 0; let h = 0, s = 0; run.forEach((d, i) => { if ((J[d] ?? 0) >= 1) { h++; s += h / (i + 1); } }); return s / R; }
function dcg(g, k) { let s = 0; g.slice(0, k).forEach((x, i) => { s += (x > 0 ? x : 0) / Math.log2(i + 2); }); return s; }
function ndcgAt(run, J, k) { const ideal = Object.values(J).filter(g => g > 0).sort((a, b) => b - a), id = dcg(ideal, k); return id ? dcg(run.map(d => J[d] ?? 0), k) / id : 0; }
const MEASURES = [['P@10', (r, j) => precisionAt(r, j, 10)], ['Recall@10', (r, j) => recallAt(r, j, 10)], ['Recall@100', (r, j) => recallAt(r, j, 100)], ['MRR', reciprocalRank], ['MAP', averagePrecision], ['nDCG@10', (r, j) => ndcgAt(r, j, 10)]];
let SWEEP = null;
function sweep() {   // for nprobe = 1..nlist: mean ANN recall@10, mean vectors compared, IR metrics
  if (SWEEP) return SWEEP;
  const sizes = listSizes(), nq = A.probe.length, out = [];
  const exact10 = ranks().map(r => new Set(r.slice(0, 10)));
  for (let p = 1; p <= A.nlist; p++) {
    let rec = 0, scan = 0; const agg = {}; MEASURES.forEach(([n]) => { agg[n] = 0; });
    for (let q = 0; q < nq; q++) {
      const run = ivfSearch(q, p).map(i => C.ids[i]), top = ivfSearch(q, p, 10);
      rec += top.filter(i => exact10[q].has(i)).length / 10;
      scan += A.nlist + A.probe[q].slice(0, p).reduce((s, l) => s + sizes[l], 0);
      const J = C.qrels[String(q + 1)]; MEASURES.forEach(([n, f]) => { agg[n] += f(run, J); });
    }
    MEASURES.forEach(([n]) => { agg[n] /= nq; });
    out.push({ p, recall: rec / nq, scan: scan / nq, agg });
  }
  return (SWEEP = out);
}

// filtered vector search over the VDB chunks: 'pre' = filter, then top k; 'post' = top k, then filter
function vdbSearch(q, filt, mode, k = 3) {
  const pass = (c) => Object.entries(filt).every(([f, v]) => v === 'all' || String(c[f]) === v);
  const order = V.scores[q].map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  const allowed = order.filter(i => pass(V.chunks[i]));
  return { order, allowed: new Set(allowed), returned: mode === 'pre' ? allowed.slice(0, k) : order.slice(0, k).filter(i => pass(V.chunks[i])), top: order.slice(0, k) };
}

if (typeof module !== 'undefined') module.exports = { sweep, ivfSearch, ranks, vdbSearch };
if (typeof document !== 'undefined') {


/* ---------- math ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- 2-D toy points (invented), shared by the hero and both widgets ---------- */
function toyPoints(seed, n = 240) {
  const r = rng(seed), centers = [[80, 70], [200, 60], [330, 90], [110, 200], [250, 170], [360, 230], [170, 270], [300, 285]];
  return Array.from({ length: n }, (_, i) => { const c = centers[Math.floor(r() * centers.length)], s = 18 + 22 * r(); return [Math.min(410, Math.max(10, c[0] + gauss(r) * s)), Math.min(310, Math.max(10, c[1] + gauss(r) * s * 0.8))]; });
}
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
function kmeans(P, k, seed) {
  const r = rng(seed), C0 = [P[Math.floor(r() * P.length)]];
  while (C0.length < k) {   // k-means++ seeding
    const w = P.map(p => Math.min(...C0.map(c => d2(p, c)))), tot = w.reduce((a, b) => a + b, 0);
    let x = r() * tot, i = 0; while (x > w[i] && i < P.length - 1) { x -= w[i]; i++; } C0.push(P[i]);
  }
  let cent = C0.map(c => c.slice()), as = [];
  for (let it = 0; it < 25; it++) {
    as = P.map(p => { let b = 0, bd = Infinity; cent.forEach((c, j) => { const dd = d2(p, c); if (dd < bd) { bd = dd; b = j; } }); return b; });
    cent = cent.map((c, j) => { const m = P.filter((_, i) => as[i] === j); return m.length ? [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length] : c; });
  }
  return { cent, as };
}

/* ---------- hero: partitions and a graph ---------- */
function initHero() {
  const svg = document.getElementById('an-hero-bg'), P = toyPoints(3, 120).map(([x, y]) => [x * 2.9, y * 0.95]);
  const { as } = kmeans(P, 8, 5);
  P.forEach((p, i) => { const nn = P.map((q, j) => [d2(p, q), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]).slice(0, 2); nn.forEach(([, j]) => el('line', { x1: p[0], y1: p[1], x2: P[j][0], y2: P[j][1], class: 'he' }, svg)); });
  P.forEach((p, i) => el('circle', { cx: p[0], cy: p[1], r: 5, fill: listColor(as[i]), class: 'hp' }, svg));
}

/* ---------- Cranfield helpers ---------- */
const GRADE_DEF = { 4: 'complete answer', 3: 'high relevance', 2: 'useful', 1: 'minimum interest', '-1': 'no interest' };
const gradeBadge = (g) => `<span class="rr-g ${g === null || g === undefined ? 'none' : 'g' + (g < 0 ? 'n' : g)}" title="${g === null || g === undefined ? 'not judged' : 'grade ' + g + ': ' + GRADE_DEF[g]}">${g === null || g === undefined ? '–' : g}</span>`;
const qLabel = (i) => `${i + 1} · ${C.queries[i].length > 90 ? C.queries[i].slice(0, 88) + '…' : C.queries[i]}`;

/* ---------- Part I: t-SNE map ---------- */
function initTsne() {
  const sel = document.getElementById('ts-sel'), svg = document.getElementById('ts-svg'), out = document.getElementById('ts-out');
  sel.innerHTML = C.queries.map((_, i) => `<option value="${i}">${esc(qLabel(i))}</option>`).join('');
  const P = A.tsne, xs = P.map(p => p[0]), ys = P.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const X = (v) => 12 + (v - x0) / (x1 - x0) * 416, Y = (v) => 428 - (v - y0) / (y1 - y0) * 416;
  let clicked = null;
  function render() {
    const qi = +sel.value, J = C.qrels[String(qi + 1)], top = ranks()[qi].slice(0, 10), topSet = new Set(top);
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

/* ---------- Part II: easy and hard negatives ---------- */
function initNegatives() {
  const kinds = [['pos', 'positive \\(p^+\\)'], ['hard', 'hard negative'], ['easy', 'easy negative']];
  const box = document.getElementById('neg-list');
  box.innerHTML = kinds.map(([c, k], i) => `<div class="neg-row ${c}"><span class="neg-k">${k}</span><span class="neg-t">${esc(V.negTexts[i])}</span><span class="em-bar"><span style="width:${Math.max(0, V.neg[i]) * 100}%"></span></span><b>${f3(V.neg[i])}</b></div>`).join('');
  mathIn(box);
}

/* ---------- Part III: similarity functions ---------- */
function initSimFns() {
  const L = document.getElementById('sf-len'), NM = document.getElementById('sf-norm'), svg = document.getElementById('sf-svg'), out = document.getElementById('sf-out');
  const ang = (d) => d * Math.PI / 180;
  function render() {
    const len = +L.value, norm = NM.checked; document.getElementById('sf-len-val').textContent = len.toFixed(1);
    let q = [Math.cos(ang(20)), Math.sin(ang(20))].map(x => x * 1.2);
    let Vs = { A: [len * Math.cos(ang(55)), len * Math.sin(ang(55))], B: [1.0 * Math.cos(ang(28)), 1.0 * Math.sin(ang(28))], C: [0.8 * Math.cos(ang(-10)), 0.8 * Math.sin(ang(-10))] };
    const unit = (v) => { const n = Math.hypot(...v); return v.map(x => x / n); };
    if (norm) { q = unit(q); Object.keys(Vs).forEach(k => { Vs[k] = unit(Vs[k]); }); }
    svg.innerHTML = '';
    const O = [50, 290], sc = 85, P = (v) => [O[0] + v[0] * sc, O[1] - v[1] * sc];
    const defs = el('defs', {}, svg);
    ['q', 'd'].forEach(k => { const m = el('marker', { id: 'sf-a' + k, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'sf-ah ' + k }, m); });
    [1, 2, 3].forEach(rr => el('circle', { cx: O[0], cy: O[1], r: rr * sc, class: 'sf-ring' + (rr === 1 ? ' unit' : '') }, svg));
    el('line', { x1: O[0], y1: O[1], x2: 350, y2: O[1], class: 'grid-line' }, svg); el('line', { x1: O[0], y1: O[1], x2: O[0], y2: 10, class: 'grid-line' }, svg);
    Object.entries(Vs).forEach(([k, v]) => { const [x, y] = P(v); el('line', { x1: O[0], y1: O[1], x2: x, y2: y, class: 'sf-d', 'marker-end': 'url(#sf-ad)' }, svg); txt(svg, x + 6, y - 4, k, 'sf-l'); el('line', { x1: P(q)[0], y1: P(q)[1], x2: x, y2: y, class: 'sf-dist' }, svg); });
    const [qx, qy] = P(q); el('line', { x1: O[0], y1: O[1], x2: qx, y2: qy, class: 'sf-q', 'marker-end': 'url(#sf-aq)' }, svg); txt(svg, qx + 6, qy + 12, 'q', 'sf-l q');
    const rows = Object.entries(Vs).map(([k, v]) => { const dot = q[0] * v[0] + q[1] * v[1]; return { k, dot, cos: dot / (Math.hypot(...q) * Math.hypot(...v)), eu: Math.hypot(q[0] - v[0], q[1] - v[1]), len: Math.hypot(...v) }; });
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

/* ---------- Part IV: brute force cost ---------- */
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

/* ---------- Part IV: memory table ---------- */
function initMemory() {
  const t = document.getElementById('mm-table'), note = document.getElementById('mm-note');
  const B = { f32: [4, 'float32 (4 bytes)'], f16: [2, 'float16 (2 bytes)'], i8: [1, 'int8 (1 byte)'] };
  const fmt = (b) => b >= 1e12 ? (b / 1e12).toPrecision(3) + ' TB' : b >= 1e9 ? (b / 1e9).toPrecision(3) + ' GB' : (b / 1e6).toPrecision(3) + ' MB';
  function render(k) {
    const by = B[k][0], Ns = [[1400, 'Cranfield, 1,400'], [1e6, '1 million'], [1e7, '10 million'], [1e8, '100 million'], [1e9, '1 billion']];
    t.innerHTML = `<thead><tr><th>vectors \\(N\\)</th><th>\\(d = 384\\)</th><th>\\(d = 768\\)</th></tr></thead><tbody>` + Ns.map(([n, l]) => `<tr><td><b>${l}</b></td>${[384, 768].map(d => `<td class="${n * d * by > 1e11 ? 'mm-big' : ''}">${fmt(n * d * by)}</td>`).join('')}</tr>`).join('') + '</tbody>';
    if (window.renderMathInElement) renderMathInElement(t, { delimiters: [{ left: '\\(', right: '\\)', display: false }] });
    note.textContent = `DPR's 21,015,324 Wikipedia passages at d = 768 in ${B[k][1].split(' ')[0]}: ${fmt(21015324 * 768 * by)}. Raw vectors only, before any index overhead; shaded: more than 100 GB, beyond the memory of one ordinary server.`;
  }
  pills(document.getElementById('mm-t'), Object.entries(B).map(([k, v]) => [k, v[1]]), 'f32', render);
  render('f32');
}

/* ---------- Part V: IVF toy ---------- */
function initIvfToy() {
  const P = toyPoints(11), svg = document.getElementById('iv-svg'), out = document.getElementById('iv-out'), N = document.getElementById('iv-n'), Pr = document.getElementById('iv-p');
  let q = [228, 118], km = null, kmN = 0;
  svg.addEventListener('click', (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse()); q = [p.x, p.y]; render(); });
  function render() {
    const n = +N.value; Pr.max = n; if (+Pr.value > n) Pr.value = n;
    const np = +Pr.value; document.getElementById('iv-n-val').textContent = n; document.getElementById('iv-p-val').textContent = np;
    if (kmN !== n) { km = kmeans(P, n, 7); kmN = n; }
    const order = km.cent.map((c, j) => [d2(q, c), j]).sort((a, b) => a[0] - b[0]).map(x => x[1]), probed = new Set(order.slice(0, np));
    const exact = P.map((p, i) => [d2(q, p), i]).sort((a, b) => a[0] - b[0]).slice(0, 5).map(x => x[1]);
    const cand = P.map((p, i) => [d2(q, p), i]).filter(([, i]) => probed.has(km.as[i])), ann = cand.sort((a, b) => a[0] - b[0]).slice(0, 5).map(x => x[1]);
    svg.innerHTML = '';
    el('rect', { x: 0, y: 0, width: 420, height: 320, class: 'toy-bg' }, svg);
    P.forEach((p, i) => el('circle', { cx: p[0], cy: p[1], r: 3.6, fill: listColor(km.as[i], !probed.has(km.as[i])) }, svg));
    km.cent.forEach((c, j) => el('path', { d: `M${c[0] - 5},${c[1]} h10 M${c[0]},${c[1] - 5} v10`, class: 'toy-cent' + (probed.has(j) ? ' on' : '') }, svg));
    exact.forEach(i => el('circle', { cx: P[i][0], cy: P[i][1], r: 7.5, class: 'toy-ring' + (ann.includes(i) ? ' hit' : ' miss') }, svg));
    el('circle', { cx: q[0], cy: q[1], r: 6.5, class: 'toy-q' }, svg);
    const found = exact.filter(i => ann.includes(i)).length, scanned = cand.length;
    out.innerHTML = `<p class="big">ANN recall@5: <b>${found} / 5</b></p><p>Compared: <b>${n}</b> centroids + <b>${scanned}</b> of 240 points = ${n + scanned} distances (brute force: 240).</p>` +
      `<p class="note">${found < 5 ? '❗ Red rings: true neighbors that lie in a region that was not searched, typically near a region border. Raise nprobe.' : 'All 5 true neighbors found. Move the query near a border between regions, or lower nprobe.'}</p>`;
  }
  [N, Pr].forEach(s => s.addEventListener('input', render));
  render();
}

/* ---------- Part V: greedy search on a proximity graph ---------- */
function initGraphToy() {
  const P = toyPoints(23, 200), svg = document.getElementById('gr-svg'), out = document.getElementById('gr-out'), K = document.getElementById('gr-k');
  let q = [360, 250], entry = 0, er = rng(99);
  const nn = P.map((p, i) => P.map((x, j) => [d2(p, x), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]).map(x => x[1]));
  entry = nn.findIndex((_, i) => P[i][0] < 90 && P[i][1] < 110); if (entry < 0) entry = 0;
  svg.addEventListener('click', (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse()); q = [p.x, p.y]; render(); });
  document.getElementById('gr-e').addEventListener('click', () => { entry = Math.floor(er() * P.length); render(); });
  function render() {
    const k = +K.value; document.getElementById('gr-k-val').textContent = k;
    const adj = P.map(() => new Set());
    P.forEach((_, i) => nn[i].slice(0, k).forEach(j => { adj[i].add(j); adj[j].add(i); }));
    let cur = entry, path = [cur], evals = 1;
    for (;;) {
      let best = cur, bd = d2(q, P[cur]);
      adj[cur].forEach(j => { evals++; const dd = d2(q, P[j]); if (dd < bd) { bd = dd; best = j; } });
      if (best === cur) break;
      cur = best; path.push(cur);
    }
    const truth = P.map((p, i) => [d2(q, p), i]).sort((a, b) => a[0] - b[0])[0][1];
    svg.innerHTML = '';
    el('rect', { x: 0, y: 0, width: 420, height: 320, class: 'toy-bg' }, svg);
    const drawn = new Set();
    adj.forEach((s, i) => s.forEach(j => { const key = i < j ? i + '-' + j : j + '-' + i; if (drawn.has(key)) return; drawn.add(key); el('line', { x1: P[i][0], y1: P[i][1], x2: P[j][0], y2: P[j][1], class: 'gr-e' }, svg); }));
    for (let s = 1; s < path.length; s++) el('line', { x1: P[path[s - 1]][0], y1: P[path[s - 1]][1], x2: P[path[s]][0], y2: P[path[s]][1], class: 'gr-path' }, svg);
    P.forEach((p, i) => el('circle', { cx: p[0], cy: p[1], r: path.includes(i) ? 4.5 : 3, class: 'gr-n' + (path.includes(i) ? ' on' : '') }, svg));
    el('circle', { cx: P[truth][0], cy: P[truth][1], r: 8, class: 'toy-ring ' + (cur === truth ? 'hit' : 'miss') }, svg);
    el('rect', { x: P[entry][0] - 5, y: P[entry][1] - 5, width: 10, height: 10, class: 'gr-entry' }, svg);
    el('circle', { cx: q[0], cy: q[1], r: 6.5, class: 'toy-q' }, svg);
    out.innerHTML = `<p class="big">${cur === truth ? '✅ Found the nearest point' : '❗ Stuck at a local minimum'}</p><p><b>${path.length - 1}</b> hops, <b>${evals}</b> distances computed (brute force: 200).</p>` +
      `<p class="note">Square: entry point. Line: the greedy path. Ring: the true nearest neighbor (${cur === truth ? 'reached' : 'not reached: the search stopped at a point with no closer neighbor'}).</p>`;
  }
  K.addEventListener('input', render);
  render();
}

/* ---------- Part VII: vector database workflow, step by step ---------- */
function initWorkflow() {
  const steps = ['Ingest data', 'Generate embeddings', 'Store vectors + metadata', 'Embed the query', 'Similarity search', 'Return top-k'];
  const box = document.getElementById('wf-steps'), out = document.getElementById('wf-out');
  let st = 0, q = 0;
  const vec = (v) => `[${v.map(x => (x < 0 ? '−' : '') + Math.abs(x).toFixed(3)).join(', ')}, …]`;
  const meta = (c) => `<span class="vd-tag">${esc(c.department)}</span><span class="vd-tag">${c.year}</span><span class="vd-tag">${esc(c.type)}</span>`;
  pills(document.getElementById('wf-q'), V.queries.map((x, i) => [i, x]), 0, (i) => { q = +i; render(); });
  box.innerHTML = steps.map((t, i) => `<button type="button" class="wf-step" data-i="${i}"><b>${i + 1}</b> ${t}</button>`).join('');
  box.querySelectorAll('.wf-step').forEach(b => b.addEventListener('click', () => { st = +b.dataset.i; render(); }));
  document.getElementById('wf-prev').addEventListener('click', () => { st = Math.max(0, st - 1); render(); });
  document.getElementById('wf-next').addEventListener('click', () => { st = Math.min(steps.length - 1, st + 1); render(); });
  function render() {
    box.querySelectorAll('.wf-step').forEach((b, i) => { b.classList.toggle('on', i === st); b.classList.toggle('done', i < st); });
    const C = V.chunks, sc = V.scores[q], order = sc.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]), top = order.slice(0, 3);
    const docs = [...new Set(C.map(c => c.document))];
    const body = [
      () => `<p class="big">Offline. Collect the documents, split them into chunks, keep the metadata.</p><p class="note">${C.length} chunks from ${docs.length} documents: ${docs.map(esc).join(', ')}.</p>` +
        C.slice(0, 4).map(c => `<div class="wf-row"><b>${c.id}</b> ${esc(c.text)} ${meta(c)}</div>`).join('') + `<p class="note">… and ${C.length - 4} more.</p>`,
      () => `<p class="big">Offline. The embedding model turns every chunk into 384 numbers (first four shown).</p>` +
        C.map((c, i) => `<div class="wf-row"><b>${c.id}</b> <code>${vec(V.cv[i])}</code> <span class="note">${esc(c.text.slice(0, 48))}…</span></div>`).join(''),
      () => `<p class="big">Offline. Each record keeps the vector next to its text and metadata, and the index is built.</p><pre class="wf-json">${esc(JSON.stringify({ id: C[10].id, vector: '[' + V.cv[10].join(', ') + ', …]', text: C[10].text, metadata: { document: C[10].document, page: C[10].page, section: C[10].section, department: C[10].department, year: C[10].year, type: C[10].type } }, null, 2).replace(/"(\[[^"]*…\])"/, '$1'))}</pre>`,
      () => `<p class="big">Online. The query goes through the <b>same</b> embedding model.</p><div class="wf-row"><b>query</b> ${esc(V.queries[q])}</div><div class="wf-row"><b>vector</b> <code>${vec(V.qv[q])}</code> (384 numbers)</div><p class="note">A different model would put it in a different space: the stored vectors and the query vector must come from one model.</p>`,
      () => `<p class="big">Online. Compare the query vector with the stored vectors (unit vectors: inner product = cosine).</p>` +
        order.map(([s, i], r) => `<div class="wf-row wf-sc${r < 3 ? ' top' : ''}"><b>${C[i].id}</b><span class="fl-bar"><span style="width:${Math.max(0, s) * 100}%"></span></span><span class="wf-num">${f3(s)}</span> <span class="note">${esc(C[i].text.slice(0, 56))}…</span></div>`).join('') +
        `<p class="note">An index (Part V) would avoid scoring every vector; with twelve chunks, exact search is instant.</p>`,
      () => `<p class="big">Online. Return the top \\(k = 3\\), with content and metadata, ready for display or for a RAG prompt.</p>` +
        top.map(([s, i], r) => `<div class="wf-res"><span class="wf-rank">${r + 1}</span><div><p>${esc(C[i].text)}</p><p class="note">score ${f3(s)} · ${esc(C[i].document)}, p. ${C[i].page} · ${meta(C[i])}</p></div></div>`).join(''),
    ][st]();
    out.innerHTML = `<p class="al-h">Step ${st + 1} of 6: ${steps[st]}</p>` + body;
    mathIn(out);
  }
  render();
}

/* ---------- Part VII: filtered semantic search ---------- */
function initVdb() {
  const out = document.getElementById('vd-out'), sels = { department: 'vd-dep', year: 'vd-year', type: 'vd-type' };
  let q = 0, mode = 'pre';
  const filt = { department: 'all', year: 'all', type: 'all' };
  Object.entries(sels).forEach(([f, id]) => {
    const vals = [...new Set(V.chunks.map(c => String(c[f])))].sort((a, b) => f === 'year' ? b - a : a.localeCompare(b));
    const s = document.getElementById(id);
    s.innerHTML = `<option value="all">any</option>` + vals.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    s.addEventListener('change', () => { filt[f] = s.value; render(); });
  });
  pills(document.getElementById('vd-q'), V.queries.map((x, i) => [i, x]), 0, (i) => { q = +i; render(); });
  pills(document.getElementById('vd-mode'), [['pre', 'filter, then search'], ['post', 'search top 3, then filter']], mode, (m) => { mode = m; render(); });
  function render() {
    const r = vdbSearch(q, filt, mode), ret = new Set(r.returned), anyFilter = Object.values(filt).some(v => v !== 'all');
    const pre = vdbSearch(q, filt, 'pre');
    out.innerHTML = `<div class="table-wrap"><table class="summary sc-small rr-num vd-table"><thead><tr><th>#</th><th>cosine</th><th>chunk</th><th>metadata</th><th></th></tr></thead><tbody>` +
      r.order.map((i, k) => { const c = V.chunks[i], ok = r.allowed.has(i), inTop = r.top.includes(i);
        const status = ret.has(i) ? '<span class="vd-s ret">returned</span>' : !ok ? '<span class="vd-s off">filtered out</span>' : mode === 'post' && !inTop ? '<span class="vd-s">not in top 3</span>' : '';
        return `<tr class="${ret.has(i) ? 'vd-ret' : ok ? '' : 'vd-off'}${mode === 'post' && inTop ? ' vd-top' : ''}"><td>${k + 1}</td><td><span class="fl-bar"><span style="width:${Math.max(0, V.scores[q][i]) * 100}%"></span></span>${f3(V.scores[q][i])}</td><td>${esc(c.text)}<br><small class="vd-doc">${esc(c.id)} · ${esc(c.document)}, p. ${c.page}</small></td><td><span class="vd-tag">${esc(c.department)}</span><span class="vd-tag">${c.year}</span><span class="vd-tag">${esc(c.type)}</span></td><td>${status}</td></tr>`; }).join('') + '</tbody></table></div>' +
      `<p class="big">Returned <b>${r.returned.length}</b> of 3${r.returned.length ? ': ' + r.returned.map(i => V.chunks[i].id).join(', ') : ''}.</p>` +
      `<p class="rr-note">${!anyFilter ? 'No filter: plain semantic search over all twelve chunks. Choose a department, year or type.' : mode === 'post' && r.returned.length < pre.returned.length ? `❗ Filtering after the search lost results: the filter removed ${3 - r.returned.length} of the top 3 (shaded), although ${pre.returned.length - r.returned.length} more matching chunk${pre.returned.length - r.returned.length === 1 ? '' : 's'} exist${pre.returned.length - r.returned.length === 1 ? 's' : ''} further down.` : mode === 'post' ? 'Search, then filter: here the top 3 happened to survive the filter.' : 'Filter, then search: the top 3 among the chunks that satisfy the filter.'}</p>`;
  }
  render();
}

/* ---------- Part VIII: nprobe on Cranfield ---------- */
function initNprobe() {
  const S = sweep(), Pr = document.getElementById('nv-p'), svg = document.getElementById('nv-svg'), out = document.getElementById('nv-out'), table = document.getElementById('nv-table');
  const exact = S[S.length - 1];
  function render() {
    const p = +Pr.value, cur = S[p - 1]; document.getElementById('nv-p-val').textContent = p;
    svg.innerHTML = '';
    const W = 460, H = 260, L = 42, R = 12, T = 12, B = 38, x = (v) => L + v * (W - L - R), y = (v) => H - B - (v - 0.5) / 0.5 * (H - B - T);
    [0.5, 0.6, 0.7, 0.8, 0.9, 1].forEach(v => { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, L - 6, y(v) + 4, v.toFixed(1), 'tick', 'end'); });
    [0, 0.25, 0.5, 0.75, 1].forEach(v => txt(svg, x(v), H - B + 16, (v * 100) + '%', 'tick', 'middle'));
    txt(svg, L + (W - L - R) / 2, H - 4, 'vectors compared per query (share of the 1,400 + 32 centroids)', 'tick', 'middle');
    const pts = S.map(s => [s.scan / 1432, s.recall]), nd = S.map(s => [s.scan / 1432, s.agg['nDCG@10'] / exact.agg['nDCG@10']]);
    el('polyline', { points: nd.map(([a, b]) => `${x(a)},${y(Math.max(0.5, b))}`).join(' '), class: 'nv-nd' }, svg);
    el('polyline', { points: pts.map(([a, b]) => `${x(a)},${y(b)}`).join(' '), class: 'nv-rc' }, svg);
    pts.forEach(([a, b], i) => el('circle', { cx: x(a), cy: y(b), r: i === p - 1 ? 6 : 2.6, class: 'nv-pt' + (i === p - 1 ? ' cur' : '') }, svg));
    el('line', { x1: x(1400 / 1432), x2: x(1400 / 1432), y1: T, y2: H - B, class: 'nv-flat' }, svg); txt(svg, x(1400 / 1432) - 4, T + 10, 'flat index', 'tick', 'end');
    out.innerHTML = `<p class="big">nprobe = ${p}: ANN recall@10 <b>${f3(cur.recall)}</b></p><p>On average ${Math.round(cur.scan)} vectors compared per query (32 centroids + ${Math.round(cur.scan - 32)} documents), ${(100 * cur.scan / 1400).toFixed(0)}% of brute force.</p>` +
      `<p class="note">nDCG@10 ${f4(cur.agg['nDCG@10'])} vs exact ${f4(exact.agg['nDCG@10'])}. ${cur.agg['nDCG@10'] > exact.agg['nDCG@10'] + 1e-12 ? '❗ Higher than exact search, although the index misses exact neighbors.' : ''}</p>`;
    table.innerHTML = `<thead><tr><th>Search (225 queries)</th><th>ANN recall@10</th>${MEASURES.map(([n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>` +
      [['Exact (IndexFlatIP)', exact, true], [`IVF, nprobe = ${p}`, cur, false]].map(([n, s, ex]) => `<tr><td><b>${n}</b></td><td>${ex ? '1.000' : f3(s.recall)}</td>${MEASURES.map(([m]) => `<td class="${!ex && s.agg[m] > exact.agg[m] + 1e-12 ? 'hit' : ''}">${f4(s.agg[m])}</td>`).join('')}</tr>`).join('') + '</tbody>';
    if (window.nqRender) window.nqRender();
  }
  Pr.addEventListener('input', render);
  render();
}

/* ---------- Part VIII: one query on the map ---------- */
function initNprobeMap() {
  const sel = document.getElementById('nq-sel'), svg = document.getElementById('nq-svg'), out = document.getElementById('nq-out'), Pr = document.getElementById('nv-p');
  sel.innerHTML = C.queries.map((q, i) => `<option value="${i}">${esc(`${i + 1} · ${q.length > 90 ? q.slice(0, 88) + '…' : q}`)}</option>`).join('');
  const T = A.tsne, xs = T.map(p => p[0]), ys = T.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const X = (v) => 12 + (v - x0) / (x1 - x0) * 416, Y = (v) => 428 - (v - y0) / (y1 - y0) * 416;
  const sizes = listSizes();
  sel.value = 7;
  function render() {
    const q = +sel.value, p = +Pr.value, probed = A.probe[q].slice(0, p), ps = new Set(probed);
    const exact = ranks()[q].slice(0, 10), ann = new Set(ivfSearch(q, p, 10)), J = C.qrels[String(q + 1)];
    svg.innerHTML = '';
    const g0 = el('g', {}, svg);
    for (let i = 0; i < 1400; i++) el('circle', { cx: X(T[i][0]), cy: Y(T[i][1]), r: ps.has(A.assign[i]) ? 3 : 2.2, fill: listColor(A.assign[i], !ps.has(A.assign[i])) }, ps.has(A.assign[i]) ? svg : g0);
    exact.forEach(i => el('circle', { cx: X(T[i][0]), cy: Y(T[i][1]), r: 6.5, class: 'toy-ring ' + (ann.has(i) ? 'hit' : 'miss') }, svg));
    const [qx, qy] = T[1400 + q]; el('circle', { cx: X(qx), cy: Y(qy), r: 7.5, class: 'toy-q' }, svg);
    const missed = exact.filter(i => !ann.has(i));
    out.innerHTML = `<p class="al-h">Query ${q + 1}, nprobe = ${p}</p><p class="note">${esc(C.queries[q])}</p>` +
      `<p>Lists searched: ${probed.map(l => `<span class="nq-l" style="background:${listColor(l)}">${l}</span>`).join(' ')} (${probed.reduce((s, l) => s + sizes[l], 0)} documents)</p>` +
      `<p class="big">Exact top 10 found: <b>${10 - missed.length} / 10</b></p>` +
      (missed.length ? `<p class="note">Missed (list, relevance grade, title):</p><ul class="nq-miss">${missed.map(i => `<li><span class="nq-l" style="background:${listColor(A.assign[i])}">${A.assign[i]}</span> ${J[C.ids[i]] !== undefined ? `grade ${J[C.ids[i]]}` : 'not judged'} · ${esc(C.titles[i])}</li>`).join('')}</ul>` : '<p class="note">Nothing missed: raise the difficulty with nprobe = 1.</p>');
  }
  window.nqRender = render;
  sel.addEventListener('change', render);
  render();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  if (A && C) initTsne();
  if (V) initNegatives();
  initSimFns();
  initBruteForce();
  initMemory();
  initIvfToy();
  initGraphToy();
  if (V) { initWorkflow(); initVdb(); }
  if (A && C) { initNprobeMap(); initNprobe(); }
});

}

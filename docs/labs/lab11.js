/* ===== Lab 11 interactivity ===== */

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
const f3 = (v) => v.toFixed(3), f4 = (v) => v.toFixed(4), f5 = (v) => v.toFixed(5);
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


/* ====================== pure part: RRF, reranking, evaluation (H = HYB, C = CRAN) ====================== */
const H = typeof HYB !== 'undefined' ? HYB : (typeof global !== 'undefined' && global.HYB) || null;
const C = typeof CRAN !== 'undefined' ? CRAN : (typeof global !== 'undefined' && global.CRAN) || null;
// the outline's reciprocal_rank_fusion: sum of 1/(k + rank); ties keep first-insertion order (Python's stable sort over a dict)
function rrf(rankings, k = 60) {
  const s = new Map();
  rankings.forEach(r => r.forEach((d, i) => s.set(d, (s.get(d) || 0) + 1 / (k + i + 1))));
  return [...s].sort((a, b) => b[1] - a[1]);
}
let CE = null;
const ceMaps = () => CE || (CE = H.ce.map(q => new Map(q)));
const hybrid = (q, depth = 100, k = 60) => rrf([H.bm[q].slice(0, depth), H.dn[q].slice(0, depth)], k).map(x => x[0]);
// rerank the first c candidates by cross-encoder score (stable), keep the rest of the list after them
function rerank(q, list, c) { const m = ceMaps()[q]; return list.slice(0, c).map((d, i) => [d, i]).sort((a, b) => m.get(b[0]) - m.get(a[0]) || a[1] - b[1]).map(x => x[0]).concat(list.slice(c)); }
const J = (q) => C.qrels[String(q + 1)];
const gr = (q, i) => J(q)[C.ids[i]] ?? 0;
function nRel(q) { return Object.values(J(q)).filter(g => g >= 1).length; }
function precisionAt(q, r, k) { let h = 0; for (let i = 0; i < k; i++) if (i < r.length && gr(q, r[i]) >= 1) h++; return h / k; }
function recallAt(q, r, k) { const R = nRel(q); if (!R) return 0; let h = 0; for (let i = 0; i < Math.min(k, r.length); i++) if (gr(q, r[i]) >= 1) h++; return h / R; }
function rr(q, r) { for (let i = 0; i < r.length; i++) if (gr(q, r[i]) >= 1) return 1 / (i + 1); return 0; }
function ap(q, r) { const R = nRel(q); if (!R) return 0; let h = 0, s = 0; r.forEach((d, i) => { if (gr(q, d) >= 1) { h++; s += h / (i + 1); } }); return s / R; }
function dcg(g, k) { let s = 0; g.slice(0, k).forEach((x, i) => { s += (x > 0 ? x : 0) / Math.log2(i + 2); }); return s; }
function ndcg(q, r, k) { const ideal = Object.values(J(q)).filter(g => g > 0).sort((a, b) => b - a), id = dcg(ideal, k); return id ? dcg(r.map(d => gr(q, d)), k) / id : 0; }
const MEASURES = [['P@10', (q, r) => precisionAt(q, r, 10)], ['Recall@10', (q, r) => recallAt(q, r, 10)], ['Recall@50', (q, r) => recallAt(q, r, 50)], ['Recall@100', (q, r) => recallAt(q, r, 100)], ['MRR', rr], ['MAP', ap], ['nDCG@10', (q, r) => ndcg(q, r, 10)]];
const GRID_KEYS = { 'P@10': 'P@10', 'Recall@10': 'R@10', 'Recall@50': 'R@50', 'Recall@100': 'R@100', 'MRR': 'RR', 'MAP': 'AP', 'nDCG@10': 'nDCG@10' };
function evaluate(listOf) {
  const per = {}, agg = {};
  MEASURES.forEach(([n, f]) => { per[n] = H.bm.map((_, q) => f(q, listOf(q).slice(0, 100))); agg[n] = per[n].reduce((a, b) => a + b, 0) / per[n].length; });
  return { per, agg };
}

if (typeof module !== 'undefined') module.exports = { rrf, hybrid, rerank, evaluate, MEASURES };
if (typeof document !== 'undefined') {


/* ---------- math ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- hero: two ranked lists merging into one ---------- */
function initHero() {
  const svg = document.getElementById('hy-hero-bg'), r = rng(10);
  for (let c = 0; c < 6; c++) {
    const x0 = 40 + c * 200;
    for (let i = 0; i < 7; i++) {
      el('rect', { x: x0, y: 30 + i * 34, width: 50 - i * 4, height: 18, rx: 6, class: 'hb a' }, svg);
      el('rect', { x: x0 + 62, y: 30 + i * 34, width: 50 - i * 4, height: 18, rx: 6, class: 'hb b' }, svg);
      if (r() < 0.5) el('rect', { x: x0 + 124, y: 30 + i * 34, width: 44 - i * 3, height: 18, rx: 6, class: 'hb c' }, svg);
    }
  }
}

/* ---------- Part II: cost of scoring every document ---------- */
function initCost() {
  const N = document.getElementById('co-n'), Ms = document.getElementById('co-ms'), c = document.getElementById('co-c'), out = document.getElementById('co-out');
  const t = (s) => s < 1 ? (s * 1000).toPrecision(3) + ' ms' : s < 120 ? s.toPrecision(3) + ' s' : s < 7200 ? (s / 60).toPrecision(3) + ' min' : s < 172800 ? (s / 3600).toPrecision(3) + ' h' : (s / 86400).toPrecision(3) + ' days';
  function render() {
    const n = Math.round(Math.pow(10, +N.value)), ms = +Ms.value, cand = +c.value;
    document.getElementById('co-n-val').textContent = n.toLocaleString('en'); document.getElementById('co-ms-val').textContent = ms + ' ms'; document.getElementById('co-c-val').textContent = cand;
    out.innerHTML = `<div class="stat-strip"><div class="stat"><span class="n">${t(n * ms / 1000)}</span><span class="l">score all ${n.toLocaleString('en')} documents</span></div><div class="stat"><span class="n">${t(Math.min(cand, n) * ms / 1000)}</span><span class="l">score only ${Math.min(cand, n)} candidates</span></div></div>` +
      `<p class="rr-note">Per query, one pair at a time. The cross-encoder of Part V took 12.6 ms per pair on a laptop CPU and 5.2 ms in batches on its GPU.</p>`;
  }
  [N, Ms, c].forEach(s => s.addEventListener('input', render));
  render();
}

/* ---------- Part III: score fusion with alpha (precomputed with ir_measures) ---------- */
function initAlpha() {
  const A = document.getElementById('al-a'), svg = document.getElementById('al-svg'), out = document.getElementById('al-out');
  const G = Object.entries(H.grid).map(([k, v]) => [+k, v]).sort((a, b) => a[0] - b[0]);
  function render() {
    const a = +A.value, g = G.reduce((p, x) => Math.abs(x[0] - a) < Math.abs(p[0] - a) ? x : p)[1];
    document.getElementById('al-a-val').textContent = a.toFixed(2);
    svg.innerHTML = '';
    const W = 460, Ht = 230, L = 42, R = 12, T = 12, B = 36, x = (v) => L + v * (W - L - R), y = (v) => Ht - B - (v - 0.2) / 0.2 * (Ht - B - T);
    [0.2, 0.25, 0.3, 0.35, 0.4].forEach(v => { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, L - 6, y(v) + 4, v.toFixed(2), 'tick', 'end'); });
    [0, 0.25, 0.5, 0.75, 1].forEach(v => txt(svg, x(v), Ht - B + 16, v, 'tick', 'middle'));
    txt(svg, L + (W - L - R) / 2, Ht - 4, 'α (weight of BM25): 0 = dense only, 1 = BM25 only', 'tick', 'middle');
    [['AP', 'al-map'], ['nDCG@10', 'al-nd']].forEach(([m, c]) => el('polyline', { points: G.map(([k, v]) => `${x(k)},${y(v[m])}`).join(' '), class: c }, svg));
    el('line', { x1: x(a), x2: x(a), y1: T, y2: Ht - B, class: 'al-cur' }, svg);
    el('line', { x1: L, x2: W - R, y1: y(H.naive.AP), y2: y(H.naive.AP), class: 'al-naive' }, svg); txt(svg, W - R, y(H.naive.AP) - 4, 'naive BM25 + cosine: MAP', 'tick', 'end');
    out.innerHTML = `<p class="big">\\(\\alpha = ${a.toFixed(2)}\\): MAP <b>${f4(g.AP)}</b>, nDCG@10 <b>${f4(g['nDCG@10'])}</b>, Recall@100 <b>${f4(g['R@100'])}</b></p>` +
      `<p class="note">Naive sum of raw scores: MAP ${f4(H.naive.AP)}, nDCG@10 ${f4(H.naive['nDCG@10'])}, practically BM25 alone (0.2406, 0.2822). The best \\(\\alpha\\) here lies between 0.15 and 0.3, but it was chosen by looking at the test queries: an optimistic number.</p>`;
    mathIn(out);
  }
  A.addEventListener('input', render);
  render();
}

/* ---------- Part IV: worked RRF example ---------- */
function initRrfExample() {
  const K = document.getElementById('rx-k'), out = document.getElementById('rx-out'), bIn = document.getElementById('rx-b'), dIn = document.getElementById('rx-d');
  bIn.value = 'D8 D2 D5 D9 D1'; dIn.value = 'D3 D8 D5 D7 D2';
  function render() {
    const k = +K.value; document.getElementById('rx-k-val').textContent = k;
    const b = bIn.value.trim().split(/[\s,]+/).filter(Boolean), d = dIn.value.trim().split(/[\s,]+/).filter(Boolean);
    const fused = rrf([b, d], k), rank = (L, x) => { const i = L.indexOf(x); return i < 0 ? null : i + 1; };
    out.innerHTML = `<div class="table-wrap"><table class="summary sc-small rr-num rx-table"><thead><tr><th>fused</th><th>doc</th><th>BM25 rank</th><th>dense rank</th><th>\\(\\frac{1}{k + rank}\\) contributions</th><th>RRF</th></tr></thead><tbody>` +
      fused.map(([x, s], i) => { const rb = rank(b, x), rd = rank(d, x); return `<tr class="${rb && rd ? 'both' : ''}"><td>${i + 1}</td><td><b>${esc(x)}</b></td><td>${rb ?? '–'}</td><td>${rd ?? '–'}</td><td>${[rb, rd].filter(Boolean).map(r => `1/${k + r}`).join(' + ')}</td><td><b>${s.toFixed(6)}</b></td></tr>`; }).join('') + '</tbody></table></div>' +
      `<p class="rr-note">Shaded: documents both retrievers found. ${k <= 5 ? 'With a small k the top of each list dominates.' : 'With a large k all ranks count almost equally, and agreement between the lists dominates.'}</p>`;
    mathIn(out);
  }
  [bIn, dIn].forEach(e => e.addEventListener('input', render));
  K.addEventListener('input', render);
  render();
}

/* ---------- Part V: who can attend to whom (bi-encoder vs cross-encoder) ---------- */
function initCrossMask() {
  const A = CEATT, svg = document.getElementById('cx-svg'), out = document.getElementById('cx-out'), L = document.getElementById('cx-l');
  const t = A.tok, n = t.length, seg = A.seg;
  let mode = 'ce', sel = 1;
  const btns = document.querySelectorAll('#cx-mode .strat-btn');
  btns.forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; btns.forEach(x => x.classList.toggle('active', x === b)); render(); }));
  L.addEventListener('input', render);
  function render() {
    document.getElementById('cx-l-val').textContent = L.value;
    L.disabled = mode === 'bi';
    const W = A.w[+L.value - 1], x0 = 82, y0 = 82, c = 22;
    svg.innerHTML = '';
    t.forEach((w, j) => txt(svg, x0 + j * c + c / 2 + 3, y0 - 6, w, 'hm-l cx-l' + (seg[j] ? ' d' : ''), 'start', { transform: `rotate(-60 ${x0 + j * c + c / 2 + 3} ${y0 - 6})` }));
    t.forEach((w, i) => {
      const lab = txt(svg, x0 - 5, y0 + i * c + c / 2 + 4, w, 'hm-l cx-l' + (seg[i] ? ' d' : '') + (i === sel ? ' cur' : ''), 'end');
      lab.addEventListener('click', () => { sel = i; render(); });
      t.forEach((_, j) => {
        const cross = seg[i] !== seg[j], ok = mode === 'ce' || !cross, g = el('g', { class: 'hm-cell' }, svg);
        const op = mode === 'ce' ? 0.06 + 0.94 * Math.min(1, W[i][j] / 250) : 0.45;
        el('rect', { x: x0 + j * c + 1, y: y0 + i * c + 1, width: c - 2, height: c - 2, rx: 3, class: ok ? 'hm-w' + (cross ? ' cx-x' : '') : 'hm-masked', 'fill-opacity': ok ? op.toFixed(3) : 1 }, g);
        if (!ok) txt(g, x0 + j * c + c / 2, y0 + i * c + c / 2 + 4, '✕', 'hm-v small', 'middle');
        g.addEventListener('click', () => { sel = i; render(); });
      });
    });
    const q1 = seg.indexOf(1);
    el('line', { x1: x0, x2: x0 + n * c, y1: y0 + q1 * c, y2: y0 + q1 * c, class: 'cx-split' }, svg);
    el('line', { x1: x0 + q1 * c, x2: x0 + q1 * c, y1: y0, y2: y0 + n * c, class: 'cx-split' }, svg);
    el('rect', { x: x0 - 1, y: y0 + sel * c, width: n * c + 2, height: c, rx: 4, class: 'hm-sel' }, svg);
    const other = seg[sel] ? 'query' : 'document', mine = seg[sel] ? 'document' : 'query';
    if (mode === 'bi') {
      out.innerHTML = `<p class="big">Bi-encoder: <b>${esc(t[sel])}</b> (${mine}) sees only the ${mine}</p><p class="note">The ${other} tokens are not in its input at all: each text is encoded on its own, pooled into one vector, and the two vectors meet only in the final dot product.</p>`;
      return;
    }
    const row = W[sel].map(x => x / 1000), share = row.reduce((s, v, j) => s + (seg[j] !== seg[sel] && t[j] !== '[SEP]' && t[j] !== '[CLS]' ? v : 0), 0);
    const top = row.map((v, j) => [v, j]).filter(([, j]) => seg[j] !== seg[sel] && t[j] !== '[SEP]').sort((a, b) => b[0] - a[0]).slice(0, 3);
    out.innerHTML = `<p class="big">Cross-encoder, layer ${L.value}: <b>${esc(t[sel])}</b> (${mine}) gives <b>${share.toFixed(2)}</b> of its attention to the ${other}'s words</p>` +
      top.map(([v, j]) => `<div class="cm-bar aw-bar"><span>${esc(t[j])}</span><div><i style="width:${Math.min(100, v / 0.25 * 100).toFixed(1)}%"></i></div><b>${v.toFixed(2)}</b></div>`).join('') +
      `<p class="note">Top ${other} tokens for this row. The model's relevance score for the pair: ${A.logit} (a logit; only the order of such scores matters).</p>`;
  }
  render();
}

/* ---------- Cranfield helpers ---------- */
const GRADE_DEF = { 4: 'complete answer', 3: 'high relevance', 2: 'useful', 1: 'minimum interest', '-1': 'no interest' };
const gradeBadge = (g) => `<span class="rr-g ${g === null || g === undefined ? 'none' : 'g' + (g < 0 ? 'n' : g)}" title="${g === null || g === undefined ? 'not judged' : 'grade ' + g + ': ' + GRADE_DEF[g]}">${g === null || g === undefined ? '–' : g}</span>`;
function fillQuerySelect(sel, cur = 0) { sel.innerHTML = C.queries.map((q, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${esc(`${i + 1} · ${q.length > 90 ? q.slice(0, 88) + '…' : q}`)}</option>`).join(''); }
function list(q, r, tag) { return '<ol class="pq-list">' + r.slice(0, 10).map(i => `<li>${gradeBadge(J(q)[C.ids[i]])}${tag ? tag(i) : ''}<span class="rr-doc">doc ${C.ids[i]}</span><span class="pq-t" title="${esc(C.titles[i])}">${esc(C.titles[i] || '(empty)')}</span></li>`).join('') + '</ol>'; }
const qm = (q, r) => `AP ${f3(ap(q, r.slice(0, 100)))} · nDCG@10 ${f3(ndcg(q, r, 10))}`;
function metricsTable(rows, cols = MEASURES.map(m => m[0])) {
  return `<thead><tr><th>System (225 queries)</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(([n, e]) => `<tr><td><b>${n}</b></td>${cols.map(c => `<td class="${Math.max(...rows.map(r => r[1].agg[c])) === e.agg[c] ? 'hit' : ''}">${f4(e.agg[c])}</td>`).join('')}</tr>`).join('') + '</tbody>';
}
let BASE = null;
const base = () => BASE || (BASE = { bm25: evaluate(q => H.bm[q]), dense: evaluate(q => H.dn[q]) });

/* ---------- Part I: complementary retrievers ---------- */
function initComplement() {
  let onlyB = 0, onlyD = 0, both = 0, bWins = 0, dWins = 0;
  const B = base();
  H.bm.forEach((b, q) => {
    const sb = new Set(b), sd = new Set(H.dn[q]);
    Object.entries(J(q)).forEach(([id, g]) => { if (g < 1) return; const i = +id - 1; const inB = sb.has(i), inD = sd.has(i); if (inB && inD) both++; else if (inB) onlyB++; else if (inD) onlyD++; });
    if (B.bm25.per.MAP[q] > B.dense.per.MAP[q] + 1e-12) bWins++; else if (B.dense.per.MAP[q] > B.bm25.per.MAP[q] + 1e-12) dWins++;
  });
  document.getElementById('cp-out').innerHTML = `<div class="stat-strip"><div class="stat"><span class="n">${both}</span><span class="l">relevant, found by both</span></div><div class="stat"><span class="n">${onlyD}</span><span class="l">found only by dense</span></div><div class="stat"><span class="n">${onlyB}</span><span class="l">found only by BM25</span></div><div class="stat"><span class="n">${bWins} / ${dWins}</span><span class="l">queries where BM25 / dense has the higher AP</span></div></div>` +
    `<p class="rr-note">Relevant documents (grade ≥ 1) of all 225 Cranfield queries, in each system's top 100. Dense retrieval is the stronger system on average, yet BM25 alone finds ${onlyB} relevant documents that dense retrieval misses, and wins on ${bWins} queries.</p>`;
}

/* ---------- Part VI: hybrid retrieval on Cranfield ---------- */
function initHybrid() {
  const sel = document.getElementById('hy-sel'), D = document.getElementById('hy-d'), K = document.getElementById('hy-k'), lists = document.getElementById('hy-lists'), table = document.getElementById('hy-table');
  fillQuerySelect(sel, 0);
  let timer = null;
  function render() {
    const q = +sel.value, depth = +D.value, k = +K.value;
    document.getElementById('hy-d-val').textContent = depth; document.getElementById('hy-k-val').textContent = k;
    const b = H.bm[q].slice(0, depth), d = H.dn[q].slice(0, depth), sb = new Set(b), sd = new Set(d), h = hybrid(q, depth, k);
    const src = (i) => `<span class="hy-src ${sb.has(i) && sd.has(i) ? 'both' : sb.has(i) ? 'b' : 'd'}" title="${sb.has(i) && sd.has(i) ? 'in both lists' : sb.has(i) ? 'BM25 only' : 'dense only'}">${sb.has(i) && sd.has(i) ? 'B+D' : sb.has(i) ? 'B' : 'D'}</span>`;
    lists.innerHTML = `<div><p class="al-h">BM25 <span>${qm(q, H.bm[q])}</span></p>${list(q, b)}</div><div><p class="al-h">Dense <span>${qm(q, H.dn[q])}</span></p>${list(q, d)}</div><div><p class="al-h">Hybrid RRF <span>${qm(q, h)}</span></p>${list(q, h, src)}</div>`;
    clearTimeout(timer);
    timer = setTimeout(() => { const B = base(); table.innerHTML = metricsTable([['BM25', B.bm25], ['Dense', B.dense], [`Hybrid RRF (${depth}, k=${k})`, evaluate(qq => hybrid(qq, depth, k))]]); }, 60);
  }
  sel.addEventListener('change', render);
  [D, K].forEach(s => s.addEventListener('input', render));
  render();
}

/* ---------- Part VII: reranking on Cranfield ---------- */
function initRerank() {
  const sel = document.getElementById('rk-sel'), Cs = document.getElementById('rk-c'), lists = document.getElementById('rk-lists'), table = document.getElementById('rk-table'), out = document.getElementById('rk-out');
  fillQuerySelect(sel, 0);
  const HY = H.bm.map((_, q) => hybrid(q));
  let timer = null;
  function render() {
    const q = +sel.value, c = +Cs.value; document.getElementById('rk-c-val').textContent = c;
    const h = HY[q], r = rerank(q, h, c), m = ceMaps()[q];
    const moved = (i) => { const a = h.indexOf(i), b2 = r.indexOf(i); return `<span class="rk-mv ${a > b2 ? 'up' : a < b2 ? 'dn' : ''}" title="hybrid rank ${a + 1}">${a + 1}→</span>`; };
    lists.innerHTML = `<div><p class="al-h">Hybrid RRF <span>${qm(q, h)}</span></p>${list(q, h)}</div><div><p class="al-h">+ cross-encoder on the top ${c} <span>${qm(q, r)}</span></p>${list(q, r, moved)}</div>`;
    const lost = Object.entries(J(q)).filter(([id, g]) => g >= 1 && !h.slice(0, c).includes(+id - 1)).length;
    out.innerHTML = `<p>${nRel(q)} relevant documents; <b>${nRel(q) - lost}</b> are among the ${c} candidates the reranker sees. ${lost ? `❗ The other ${lost} cannot be recovered by reranking, whatever the model.` : 'All of them are candidates.'}</p>`;
    clearTimeout(timer);
    timer = setTimeout(() => { const B = base(); table.innerHTML = metricsTable([['BM25', B.bm25], ['Dense', B.dense], ['Hybrid RRF', evaluate(qq => HY[qq])], [`Hybrid RRF + cross-encoder, top ${c}`, evaluate(qq => rerank(qq, HY[qq], c))]], ['Recall@10', `Recall@${c <= 10 ? 10 : c <= 50 ? 50 : 100}`, 'MRR', 'MAP', 'nDCG@10'].filter((x, i, a) => a.indexOf(x) === i)); }, 60);
  }
  sel.addEventListener('change', render);
  Cs.addEventListener('input', render);
  render();
}

/* ---------- Part VIII: ablation ---------- */
function initAblation() {
  const B = base(), HY = H.bm.map((_, q) => hybrid(q));
  const rows = [['BM25', B.bm25], ['Dense', B.dense], ['Hybrid RRF', evaluate(q => HY[q])], ['Hybrid RRF + cross-encoder (top 50)', evaluate(q => rerank(q, HY[q], 50))], ['BM25 + cross-encoder (top 50)', evaluate(q => rerank(q, H.bm[q], 50))], ['Dense + cross-encoder (top 50)', evaluate(q => rerank(q, H.dn[q], 50))]];
  document.getElementById('ab-table').innerHTML = metricsTable(rows, ['Recall@100', 'MRR', 'MAP', 'nDCG@10']);
  const hy = rows[2][1].per, ce = rows[3][1].per;
  const up = ce['nDCG@10'].filter((v, i) => v > hy['nDCG@10'][i] + 1e-12).length, dn = ce['nDCG@10'].filter((v, i) => v < hy['nDCG@10'][i] - 1e-12).length;
  document.getElementById('ab-note').innerHTML = `Per query, reranking the hybrid top 50 raises nDCG@10 on <b>${up}</b> queries and lowers it on <b>${dn}</b>.`;
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initCost();
  if (!H) return;
  initAlpha();
  initRrfExample();
  if (typeof CEATT !== 'undefined') initCrossMask();
  if (C) { initComplement(); initHybrid(); initRerank(); initAblation(); }
});

}

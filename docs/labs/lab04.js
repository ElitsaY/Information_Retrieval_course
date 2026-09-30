/* ===== Lab 04 interactivity ===== */

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

/* ---------- toy corpus ---------- */
const TOY = {
  D1: 'information retrieval finds relevant documents',
  D2: 'boolean retrieval returns matching documents',
  D3: 'tf idf weights rare terms in documents',
  D4: 'bm25 uses term frequency and document length',
  D5: 'search engines rank documents for user queries',
};
const TOY_IDS = Object.keys(TOY);
const toyTok = (t) => t.toLowerCase().split(/\s+/).filter(Boolean);
const TOY_T = TOY_IDS.map(d => toyTok(TOY[d]));
const TOY_V = [...new Set(TOY_T.flat())].sort();
const TOY_N = TOY_IDS.length;
const TOY_DF = Object.fromEntries(TOY_V.map(w => [w, TOY_T.filter(ts => ts.includes(w)).length]));
const TOY_IDF = Object.fromEntries(TOY_V.map(w => [w, Math.log(TOY_N / TOY_DF[w])]));
const countIn = (ts, w) => ts.filter(x => x === w).length;
function toyVec(ts, logTf) {
  return TOY_V.map(w => { const c = countIn(ts, w); return c ? (logTf ? 1 + Math.log(c) : c) * TOY_IDF[w] : 0; });
}
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const norm = (a) => Math.sqrt(dot(a, a));
const DEFAULT_Q = 'retrieval relevant documents';

/* ---------- maths ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- hero: ranked result bars and saturation curves ---------- */
function initHero() {
  const svg = document.getElementById('rr-hero-bg');
  const r = rng(4);
  for (let c = 0; c < 7; c++) {
    const x0 = c * 180 - 30 + r() * 30, y0 = 18 + r() * 60;
    let w = 120 + r() * 40;
    for (let i = 0; i < 8; i++) { el('rect', { x: x0, y: y0 + i * 24, width: w, height: 13, rx: 6, class: 'bar b' + (i % 3) }, svg); w *= 0.78 + r() * 0.12; }
  }
  for (let k = 0; k < 4; k++) {
    const k1 = 0.6 + k * 0.7, pts = [];
    for (let t = 0; t <= 60; t++) { const tf = t / 2; pts.push(`${40 + t * 19},${280 - 90 * (tf * (k1 + 1)) / (tf + k1) / (k1 + 1) * 2}`); }
    el('polyline', { points: pts.join(' '), class: 'sat' }, svg);
  }
}

/* ---------- toy corpus table + tf / df ---------- */
function initToy() {
  document.getElementById('toy-docs').innerHTML = TOY_IDS.map((d, i) => `<tr data-s="ids"><td><b>${d}</b></td><td>${esc(TOY[d])} <span class="note">(${TOY_T[i].length} tokens)</span></td></tr>`).join('');
  const inp = document.getElementById('tf-q'), table = document.getElementById('tf-table'), box = document.getElementById('tf-docs');
  inp.value = DEFAULT_Q;
  let sel = null;
  function render() {
    const qs = [...new Set(toyTok(inp.value))];
    table.innerHTML = `<thead><tr><th>term</th><th>df</th>${TOY_IDS.map(d => `<th>tf in ${d}</th>`).join('')}</tr></thead><tbody>` +
      qs.map(w => `<tr data-s="ids" class="${w === sel ? 'sel' : ''}" data-w="${esc(w)}"><td><code>${esc(w)}</code></td><td><b>${TOY_DF[w] || 0}</b></td>${TOY_T.map(ts => `<td class="${countIn(ts, w) ? 'hit' : ''}">${countIn(ts, w)}</td>`).join('')}</tr>`).join('') + '</tbody>';
    const hl = new Set(sel ? [sel] : qs);
    box.innerHTML = TOY_IDS.map((d, i) => `<p><b>${d}</b> ${TOY_T[i].map(w => hl.has(w) ? `<mark>${esc(w)}</mark>` : esc(w)).join(' ')}</p>`).join('');
  }
  table.addEventListener('click', e => { const tr = e.target.closest('tr[data-w]'); if (tr) { sel = sel === tr.dataset.w ? null : tr.dataset.w; render(); } });
  inp.addEventListener('input', () => { sel = null; render(); });
  render();
}

/* ---------- IDF curves ---------- */
function initIdf() {
  const s = document.getElementById('idf-n'), svg = document.getElementById('idf-svg'), out = document.getElementById('idf-out');
  const QT = [['retrieval', 2], ['relevant', 1], ['documents', 4]];
  const F = { ln: (N, d) => Math.log(N / d), sk: (N, d) => Math.log((1 + N) / (1 + d)) + 1, bm: (N, d) => Math.log(1 + (N - d + 0.5) / (d + 0.5)) };
  function render() {
    const N = +s.value; document.getElementById('idf-n-val').textContent = N;
    svg.innerHTML = '';
    const W = 460, H = 290, L = 40, R = 14, T = 12, B = 40, ymax = Math.ceil(F.sk(N, 1) + 0.2);
    const x = (d) => L + (d - 1) / Math.max(1, N - 1) * (W - L - R), y = (v) => H - B - v / ymax * (H - B - T);
    for (let v = 0; v <= ymax; v++) { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, L - 6, y(v) + 4, v, 'tick', 'end'); }
    el('line', { x1: L, x2: W - R, y1: y(0), y2: y(0), class: 'axis' }, svg);
    [1, Math.round(N / 4), Math.round(N / 2), Math.round(3 * N / 4), N].filter((v, i, a) => v >= 1 && a.indexOf(v) === i).forEach(d => txt(svg, x(d), H - B + 16, d, 'tick', 'middle'));
    txt(svg, L + (W - L - R) / 2, H - 6, 'document frequency df', 'tick', 'middle');
    [['ln', 'idf-ln'], ['sk', 'idf-sk'], ['bm', 'idf-bm']].forEach(([k, cls]) => {
      const pts = []; for (let i = 0; i <= 120; i++) { const d = 1 + i / 120 * (N - 1); pts.push(`${x(d).toFixed(1)},${y(F[k](N, d)).toFixed(1)}`); }
      el('polyline', { points: pts.join(' '), class: cls }, svg);
    });
    QT.forEach(([w, d]) => {
      el('circle', { cx: x(d), cy: y(F.ln(N, d)), r: 5.5, class: 'idf-dot' }, svg);
      txt(svg, x(d) + 8, y(F.ln(N, d)) - 7, w, 'lbl');
    });
    out.innerHTML = `<div class="rr-tw"><table class="summary sc-small rr-num"><thead><tr><th>term</th><th>df</th><th>ln(N/df)</th><th>sklearn</th><th>BM25</th></tr></thead><tbody>` +
      QT.map(([w, d]) => `<tr><td><code>${w}</code></td><td>${d}</td><td><b>${f4(F.ln(N, d))}</b></td><td>${f4(F.sk(N, d))}</td><td>${f4(F.bm(N, d))}</td></tr>`).join('') + '</tbody></table></div>' +
      `<p class="note" style="margin-top:0.6rem;">At \\(N = 5\\): <code>relevant</code> gets \\(\\ln 5 = 1.6094\\), <code>documents</code> only \\(\\ln(5/4) = 0.2231\\). A term in all ${N} documents gets 0 with \\(\\ln(N/df)\\) but ${f4(F.sk(N, N))} with scikit-learn's formula.</p>`;
    mathIn(out);
  }
  s.addEventListener('input', render);
  render();
}

/* ---------- TF-IDF matrix ---------- */
function initTfidfMatrix() {
  const table = document.getElementById('tv-table'), note = document.getElementById('tv-note');
  let logTf = false;
  pills(document.getElementById('tv-tf'), [['raw', 'raw tf × idf'], ['log', '(1 + log tf) × idf']], 'raw', k => { logTf = k === 'log'; render(); });
  function render() {
    const D = TOY_T.map(ts => toyVec(ts, logTf)), Q = toyVec(toyTok(DEFAULT_Q), logTf), qs = new Set(toyTok(DEFAULT_Q));
    table.innerHTML = `<thead><tr><th>term</th><th>df</th><th>idf</th>${TOY_IDS.map(d => `<th>${d}</th>`).join('')}<th class="q">q</th></tr></thead><tbody>` +
      TOY_V.map((w, i) => `<tr class="${qs.has(w) ? 'qt' : ''}"><th>${esc(w)}</th><td>${TOY_DF[w]}</td><td>${f4(TOY_IDF[w])}</td>${D.map(v => `<td class="${v[i] ? 'nz' : ''}">${v[i] ? f4(v[i]) : ''}</td>`).join('')}<td class="q ${Q[i] ? 'nz' : ''}">${Q[i] ? f4(Q[i]) : ''}</td></tr>`).join('') +
      `<tr class="nr"><th>‖·‖</th><td></td><td></td>${D.map(v => `<td>${f4(norm(v))}</td>`).join('')}<td class="q">${f4(norm(Q))}</td></tr></tbody>`;
    note.innerHTML = `${TOY_V.length} vocabulary terms. Every term occurs at most once per document, so both TF variants give the same matrix here; they differ as soon as a term repeats: a term that occurs twice gets \\(2 \\cdot idf\\) with raw tf but \\((1 + \\ln 2) \\cdot idf \\approx 1.69 \\cdot idf\\) with the log variant.`;
    mathIn(note);
  }
  render();
}

/* ---------- cosine ranking on the toy corpus ---------- */
function initCosine() {
  const inp = document.getElementById('cs-q'), svg = document.getElementById('cs-svg'), out = document.getElementById('cs-out');
  const PRE = [DEFAULT_Q, 'document', 'boolean retrieval', 'retrieval retrieval', 'zzz'];
  pills(document.getElementById('cs-presets'), PRE.map(p => [p, p]), DEFAULT_Q, k => { inp.value = k; render(); });
  inp.value = DEFAULT_Q;
  function render() {
    const qt = toyTok(inp.value), Q = toyVec(qt, false), nq = norm(Q);
    const rows = TOY_IDS.map((d, i) => { const v = toyVec(TOY_T[i], false), dp = dot(Q, v), nd = norm(v); return { d, dp, nd, c: nq && nd ? dp / (nq * nd) : 0 }; })
      .map((r, i) => ({ ...r, i })).sort((a, b) => b.c - a.c || a.i - b.i);
    svg.innerHTML = '';
    const L = 44, W = 460, bw = W - L - 70;
    rows.forEach((r, k) => {
      const y = 18 + k * 42;
      txt(svg, 8, y + 17, r.d, 'lbl');
      el('rect', { x: L, y, width: bw, height: 24, rx: 6, class: 'cs-track' }, svg);
      el('rect', { x: L, y, width: Math.max(0, r.c) * bw, height: 24, rx: 6, class: 'cs-bar' + (k === 0 && r.c > 0 ? ' top' : '') }, svg);
      txt(svg, L + bw + 8, y + 17, r.c.toFixed(4), 'cs-v');
    });
    const unseen = qt.filter(w => !TOY_DF[w]);
    out.innerHTML = `<div class="rr-tw"><table class="summary sc-small rr-num"><thead><tr><th>doc</th><th>q · d</th><th>‖d‖</th><th>cos</th></tr></thead><tbody>` +
      rows.map(r => `<tr><td>${r.d}</td><td>${f4(r.dp)}</td><td>${f4(r.nd)}</td><td><b>${f4(r.c)}</b></td></tr>`).join('') + '</tbody></table></div>' +
      `<p class="note" style="margin-top:0.6rem;">‖q‖ = ${f4(nq)}.` + (unseen.length ? ` Not in the vocabulary, ignored: ${unseen.map(w => `<code>${esc(w)}</code>`).join(', ')}.` : '') +
      (nq === 0 ? ' ❗ The query vector is zero: every score is 0 and the order is meaningless.' : '') + '</p>';
  }
  inp.addEventListener('input', render);
  render();
}

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
function searchTfidf(q, k = 5) {
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
function searchBm25(q, k = 5, k1 = 1.5, b = 0.75) {
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

function initDemoStats() {
  const I = buildIndex(), S = tfidfSystem(), nnz = [...S.post.values()].reduce((s, p) => s + p.length, 0), V = S.idf.size;
  document.getElementById('dm-stats').innerHTML = [[`(${I.N.toLocaleString('en')}, ${V.toLocaleString('en')})`, 'X.shape'], [nnz.toLocaleString('en'), 'non-zero entries'], [(100 * nnz / (I.N * V)).toFixed(2) + '%', 'of the cells are non-zero'], [(nnz / I.N).toFixed(0), 'distinct terms per document']]
    .map(([n, l]) => `<div class="stat"><span class="n">${n}</span><span class="l">${l}</span></div>`).join('');
}
function resultRows(res) {
  return res.map(r => `<details class="rr-res"><summary><span class="rr-rank">${r.rank}</span><span class="rr-doc">doc ${r.doc_id}</span><span class="rr-title">${esc(C.titles[r.i] || '(empty document)')}</span><span class="rr-score">${r.score.toFixed(4)}</span></summary><p class="rr-snip">${esc(C.snip[r.i])}…</p></details>`).join('');
}
function initSearch() {
  const sel = document.getElementById('se-sel'), ta = document.getElementById('se-q'), out = document.getElementById('se-out');
  fillQuerySelect(sel, 0);
  sel.addEventListener('change', () => { ta.value = C.queries[+sel.value]; render(); });
  ta.addEventListener('input', render);
  ta.value = C.queries[0];
  function render() { out.innerHTML = `<p class="note">Top 5 by TF-IDF cosine similarity:</p><div class="rr-list">${resultRows(searchTfidf(ta.value, 5))}</div>`; }
  render();
}
function initCompare() {
  const sel = document.getElementById('cm-sel'), out = document.getElementById('cm-out'), k1s = document.getElementById('cm-k1'), bs = document.getElementById('cm-b');
  fillQuerySelect(sel, 0);
  function render() {
    const q = C.queries[+sel.value], k1 = +k1s.value, b = +bs.value;
    document.getElementById('cm-k1-val').textContent = k1.toFixed(1); document.getElementById('cm-b-val').textContent = b.toFixed(2);
    const A = searchTfidf(q, 5), Bm = searchBm25(q, 5, k1, b);
    const W = 760, rowH = 34, H = 30 + 5 * rowH, colW = 300;
    let s = `<svg class="ml-plot cm-svg" viewBox="0 0 ${W} ${H}" aria-label="TF-IDF and BM25 rankings side by side">`;
    s += `<text x="10" y="18" class="lbl">TF-IDF</text><text x="${W - 10}" y="18" class="lbl" text-anchor="end">BM25 (k1 = ${k1.toFixed(1)}, b = ${b.toFixed(2)})</text>`;
    A.forEach((r, k) => { const m = Bm.findIndex(x => x.doc_id === r.doc_id); if (m >= 0) s += `<path d="M${colW} ${36 + k * rowH} C ${W / 2} ${36 + k * rowH}, ${W / 2} ${36 + m * rowH}, ${W - colW} ${36 + m * rowH}" class="cm-link${k === m ? ' same' : ''}"/>`; });
    const cell = (r, x, anchor) => { const t = C.titles[r.i]; return `<text x="${x}" y="${40 + (r.rank - 1) * rowH}" text-anchor="${anchor}" class="cm-t"><tspan class="cm-id">${r.rank}. doc ${r.doc_id}</tspan> ${esc(t.length > 28 ? t.slice(0, 27) + '…' : t)}</text>`; };
    A.forEach(r => { s += cell(r, 10, 'start'); }); Bm.forEach(r => { s += cell(r, W - 10, 'end'); });
    s += '</svg>';
    out.innerHTML = `<div class="fig-scroll">${s}</div><p class="note" style="margin-top:0.4rem;">Shared documents: <b>${overlap(A, Bm)}</b> / 5 · same order: <b>${sameList(A, Bm) ? 'yes' : 'no'}</b> · top result ${A[0].doc_id === Bm[0].doc_id ? 'the same' : '<b>different</b>'}.</p>`;
  }
  [sel, k1s, bs].forEach(x => x.addEventListener('input', render));
  sel.addEventListener('change', render);
  render();
}
function initCompareTable() {
  const t = document.getElementById('cmp-table');
  t.innerHTML = '<thead><tr><th>query</th><th>TF-IDF top 5</th><th>BM25 top 5</th><th>shared</th><th>identical?</th></tr></thead><tbody>' +
    C.queries.slice(0, 5).map((q, i) => { const a = searchTfidf(q, 5), b = searchBm25(q, 5); return `<tr><td><b>${i + 1}</b> <span class="note">${esc(q.slice(0, 48))}…</span></td><td>${a.map(r => r.doc_id).join(', ')}</td><td>${b.map(r => r.doc_id).join(', ')}</td><td>${overlap(a, b)} / 5</td><td>${sameList(a, b) ? 'yes' : '<b>no</b>'}</td></tr>`; }).join('') + '</tbody>';
  let same = 0, top1 = 0;
  C.queries.forEach(q => { const a = searchTfidf(q, 5), b = searchBm25(q, 5); if (sameList(a, b)) same++; if (a[0].doc_id === b[0].doc_id) top1++; });
  document.getElementById('cmp-note').insertAdjacentHTML('beforebegin', `<p class="section-lede">Over all 225 queries, the two top-5 lists are identical ${same ? `for <b>${same}</b> queries` : 'for <b>none</b> of them'}; the top result is the same for ${top1} (${Math.round(100 * top1 / 225)}%).</p>`);
}

/* ---------- saturation ---------- */
function initSaturation() {
  const k1s = document.getElementById('sat-k1'), ls = document.getElementById('sat-l'), svg = document.getElementById('sat-svg'), out = document.getElementById('sat-out');
  function render() {
    const k1 = +k1s.value, lr = +ls.value, b = 0.75;
    document.getElementById('sat-k1-val').textContent = k1.toFixed(1); document.getElementById('sat-l-val').textContent = lr;
    const c = (tf) => tf * (k1 + 1) / (tf + k1 * (1 - b + b * lr));
    svg.innerHTML = '';
    const W = 460, H = 280, L = 40, R = 14, T = 12, B = 40, ymax = 4.2;
    const x = (tf) => L + tf / 30 * (W - L - R), y = (v) => H - B - Math.min(v, ymax) / ymax * (H - B - T);
    for (let v = 0; v <= 4; v++) { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, L - 6, y(v) + 4, v, 'tick', 'end'); }
    [0, 5, 10, 15, 20, 25, 30].forEach(t => txt(svg, x(t), H - B + 16, t, 'tick', 'middle'));
    el('line', { x1: L, x2: W - R, y1: y(0), y2: y(0), class: 'axis' }, svg);
    el('line', { x1: x(0), y1: y(k1 + 1), x2: x(30), y2: y(k1 + 1), class: 'sat-cap' }, svg);
    el('polyline', { points: [0, ymax].map(v => `${x(v)},${y(v)}`).join(' '), class: 'sat-raw' }, svg);
    const pts = []; for (let t = 0; t <= 30; t += 0.25) pts.push(`${x(t).toFixed(1)},${y(c(t)).toFixed(1)}`);
    el('polyline', { points: pts.join(' '), class: 'sat-bm' }, svg);
    for (let t = 1; t <= 30; t++) el('circle', { cx: x(t), cy: y(c(t)), r: t === 2 || t === 20 ? 5 : 2.6, class: 'sat-dot' + (t === 2 || t === 20 ? ' hl' : '') }, svg);
    txt(svg, L + (W - L - R) / 2, H - 6, 'term frequency tf', 'tick', 'middle');
    const g2 = c(2) - c(1), g20 = c(20) - c(19);
    out.innerHTML = `<p class="big">tf = 1: <b>${c(1).toFixed(3)}</b> · tf = 2: <b>${c(2).toFixed(3)}</b> · tf = 20: <b>${c(20).toFixed(3)}</b> · tf = 30: <b>${c(30).toFixed(3)}</b></p>` +
      `<p>Gain from the 2nd occurrence: ${g2.toFixed(3)}. Gain from the 20th: ${g20.toFixed(4)}, about <b>${Math.round(g2 / g20)}×</b> smaller.</p>` +
      `<p class="note">The curve approaches the ceiling \\(k_1 + 1 = ${(k1 + 1).toFixed(1)}\\) (times \\(idf\\)) but never reaches it. With a small \\(k_1\\) it bends early; a longer-than-average document (\\(|d|/\\text{avgdl} > 1\\)) needs more occurrences for the same contribution.</p>`;
    mathIn(out);
  }
  [k1s, ls].forEach(x => x.addEventListener('input', render));
  render();
}

/* ---------- length normalization on real documents ---------- */
function initLengthNorm() {
  const inp = document.getElementById('ln-term'), out = document.getElementById('ln-out'), O = okapiIndex();
  const PRE = ['flutter', 'boundary', 'heat', 'shock'];
  pills(document.getElementById('ln-presets'), PRE.map(p => [p, p]), PRE[0], k => { inp.value = k; render(); });
  inp.value = PRE[0];
  function render() {
    const w = inp.value.trim().toLowerCase(), t = O.wid.get(w);
    if (t === undefined) { out.innerHTML = `<p class="note"><code>${esc(w)}</code> is not a token of the Cranfield collection.</p>`; return; }
    const P = O.post.get(t), cnt = {};
    P.forEach(([, f]) => { cnt[f] = (cnt[f] || 0) + 1; });
    const tf = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a - b)[0];
    const docs = P.filter(([, f]) => f === tf).map(([i]) => i).sort((a, b) => O.len[a] - O.len[b]);
    const pick = [...new Set([docs[0], docs[Math.floor(docs.length / 4)], docs[Math.floor(docs.length / 2)], docs[Math.floor(3 * docs.length / 4)], docs[docs.length - 1]])];
    const bs = [0, 0.5, 0.75, 1], k1 = 1.2;
    const c = (i, b) => tf * (k1 + 1) / (tf + k1 * (1 - b + b * O.len[i] / O.avgdl));
    out.innerHTML = `<p class="note"><code>${esc(w)}</code> occurs in ${P.length} documents; ${docs.length} contain it exactly <b>${tf}</b> time${tf > 1 ? 's' : ''}. Five of them, from shortest to longest (average length ${O.avgdl.toFixed(1)} tokens):</p>` +
      `<div class="table-wrap"><table class="summary sc-small rr-num"><thead><tr><th>doc</th><th>|d|</th><th>|d| / avgdl</th>${bs.map(b => `<th>b = ${b}</th>`).join('')}</tr></thead><tbody>` +
      pick.map(i => `<tr><td>doc ${C.ids[i]}</td><td>${O.len[i]}</td><td>${(O.len[i] / O.avgdl).toFixed(2)}</td>${bs.map(b => `<td class="${b === 0.75 ? 'hl' : ''}">${c(i, b).toFixed(3)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>' +
      `<p class="note" style="margin-top:0.5rem;">With b = 0 every row is the same: length is ignored. As b grows, documents shorter than average gain and longer ones lose.</p>`;
  }
  inp.addEventListener('input', render);
  render();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initToy();
  initIdf();
  initTfidfMatrix();
  initCosine();
  initSaturation();
  if (!C) return;
  initDemoStats();
  initSearch();
  initLengthNorm();
  initCompare();
  initCompareTable();
});

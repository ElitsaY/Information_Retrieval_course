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

// Porter (1980) stemmer, original algorithm (the same code as Lab 01; checked against NLTK)
function porterStem(w) {
  if (w.length <= 2 || !/^[a-z]+$/.test(w)) return w;
  const cons = (s, i) => { const c = s[i]; if ('aeiou'.includes(c)) return false; if (c === 'y') return i === 0 || !cons(s, i - 1); return true; };
  const m = (s) => { let n = 0, i = 0; const L = s.length; while (i < L && cons(s, i)) i++; while (i < L) { while (i < L && !cons(s, i)) i++; if (i >= L) break; n++; while (i < L && cons(s, i)) i++; } return n; };
  const hasV = (s) => [...s].some((_, i) => !cons(s, i));
  const dbl = (s) => s.length >= 2 && s[s.length - 1] === s[s.length - 2] && cons(s, s.length - 1);
  const cvc = (s) => { const L = s.length; return L >= 3 && cons(s, L - 3) && !cons(s, L - 2) && cons(s, L - 1) && !'wxy'.includes(s[L - 1]); };
  // apply the rule with the longest matching suffix; stop there even if its condition fails
  const step = (s, rules, cond) => {
    let best = null;
    for (const [suf, rep] of rules) if (s.endsWith(suf) && (!best || suf.length > best[0].length)) best = [suf, rep];
    if (!best) return s;
    const stem = s.slice(0, -best[0].length);
    return cond(stem, best[0]) ? stem + best[1] : s;
  };
  // step 1a
  if (w.endsWith('sses')) w = w.slice(0, -2); else if (w.endsWith('ies')) w = w.slice(0, -2); else if (w.endsWith('ss')) {} else if (w.endsWith('s')) w = w.slice(0, -1);
  // step 1b
  let extra = false;
  if (w.endsWith('eed')) { if (m(w.slice(0, -3)) > 0) w = w.slice(0, -1); }
  else if (w.endsWith('ed') && hasV(w.slice(0, -2))) { w = w.slice(0, -2); extra = true; }
  else if (w.endsWith('ing') && hasV(w.slice(0, -3))) { w = w.slice(0, -3); extra = true; }
  if (extra) {
    if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) w += 'e';
    else if (dbl(w) && !'lsz'.includes(w[w.length - 1])) w = w.slice(0, -1);
    else if (m(w) === 1 && cvc(w)) w += 'e';
  }
  // step 1c
  if (w.endsWith('y') && hasV(w.slice(0, -1))) w = w.slice(0, -1) + 'i';
  // steps 2–4
  w = step(w, [['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'], ['anci', 'ance'], ['izer', 'ize'], ['abli', 'able'], ['alli', 'al'], ['entli', 'ent'], ['eli', 'e'], ['ousli', 'ous'], ['ization', 'ize'], ['ation', 'ate'], ['ator', 'ate'], ['alism', 'al'], ['iveness', 'ive'], ['fulness', 'ful'], ['ousness', 'ous'], ['aliti', 'al'], ['iviti', 'ive'], ['biliti', 'ble']], s => m(s) > 0);
  w = step(w, [['icate', 'ic'], ['ative', ''], ['alize', 'al'], ['iciti', 'ic'], ['ical', 'ic'], ['ful', ''], ['ness', '']], s => m(s) > 0);
  w = step(w, ['al', 'ance', 'ence', 'er', 'ic', 'able', 'ible', 'ant', 'ement', 'ment', 'ent', 'ion', 'ou', 'ism', 'ate', 'iti', 'ous', 'ive', 'ize'].map(x => [x, '']),
    (s, suf) => m(s) > 1 && (suf !== 'ion' || /[st]$/.test(s)));
  // step 5
  if (w.endsWith('e')) { const s = w.slice(0, -1); if (m(s) > 1 || (m(s) === 1 && !cvc(s))) w = s; }
  if (m(w) > 1 && dbl(w) && w.endsWith('l')) w = w.slice(0, -1);
  return w;
}


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
let IDX = null;            // built once from CRAN
function buildIndex() {
  if (IDX || !C) return IDX;
  const N = C.ids.length, V = C.vocab;
  const docTerms = C.terms.map(flat => { const m = []; for (let i = 0; i < flat.length; i += 2) m.push([flat[i], flat[i + 1]]); return m; });
  const bmLen = docTerms.map(ts => ts.reduce((s, [, f]) => s + f, 0));
  const avgdl = bmLen.reduce((a, b) => a + b, 0) / N;
  const vocabId = new Map(V.map((w, i) => [w, i]));
  IDX = { N, V, docTerms, bmLen, avgdl, vocabId, qrels: C.qrels, systems: {} };
  return IDX;
}
const queryTokens = (q) => (q.toLowerCase().match(/[\p{L}\p{N}_]+/gu) || []);
const STOP = new Set(C ? C.stop : []);
// a TF-IDF system: map every vocabulary term to an index term (or drop it), then build sklearn-style weights
function tfidfSystem(opts = {}) {
  const I = buildIndex(), key = JSON.stringify(opts);
  if (I.systems[key]) return I.systems[key];
  const map = I.V.map(w => {
    if (w.length < 2) return null;                                   // token_pattern \b\w\w+\b
    if (opts.stop && STOP.has(w)) return null;
    if (opts.num && /^\d+$/.test(w)) return null;
    return opts.stem ? porterStem(w) : w;
  });
  const df = new Map(), docs = [];
  I.docTerms.forEach(ts => {
    const m = new Map();
    ts.forEach(([t, f]) => { const k = map[t]; if (k !== null) m.set(k, (m.get(k) || 0) + f); });
    docs.push(m); m.forEach((_, k) => df.set(k, (df.get(k) || 0) + 1));
  });
  const idf = new Map([...df].map(([k, d]) => [k, Math.log((1 + I.N) / (1 + d)) + 1]));
  const post = new Map(), dnorm = [];
  docs.forEach((m, i) => { let s = 0; m.forEach((f, k) => { const w = f * idf.get(k); s += w * w; if (!post.has(k)) post.set(k, []); post.get(k).push([i, f]); }); dnorm.push(Math.sqrt(s)); });
  const toTerm = (w) => { if (w.length < 2 || (opts.stop && STOP.has(w)) || (opts.num && /^\d+$/.test(w))) return null; return opts.stem ? porterStem(w) : w; };
  return (I.systems[key] = { df, idf, post, dnorm, toTerm });
}
function topK(scores, k) { return scores.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, k); }
function searchTfidf(q, k = 10, opts = {}) {
  const I = buildIndex(), S = tfidfSystem(opts), scores = new Array(I.N).fill(0);
  const qc = new Map(); queryTokens(q).forEach(w => { const t = S.toTerm(w); if (t !== null && S.idf.has(t)) qc.set(t, (qc.get(t) || 0) + 1); });
  let qn = 0; qc.forEach((f, t) => { const w = f * S.idf.get(t); qn += w * w; }); qn = Math.sqrt(qn);
  if (qn > 0) qc.forEach((f, t) => { const qw = f * S.idf.get(t) / qn; S.post.get(t).forEach(([i, tf]) => { scores[i] += qw * tf * S.idf.get(t) / S.dnorm[i]; }); });
  return topK(scores, k).map(([s, i], r) => ({ rank: r + 1, i, doc_id: C.ids[i], score: s }));
}
let BM = null;
function bm25Index() {
  if (BM) return BM;
  const I = buildIndex(), post = new Map();
  I.docTerms.forEach((ts, i) => ts.forEach(([t, f]) => { if (!post.has(t)) post.set(t, []); post.get(t).push([i, f]); }));
  return (BM = { post });
}
const bm25Idf = (df, N) => Math.log(1 + (N - df + 0.5) / (df + 0.5));
function searchBm25(q, k = 10, k1 = 1.2, b = 0.75) {
  const I = buildIndex(), B = bm25Index(), scores = new Array(I.N).fill(0);
  new Set(queryTokens(q)).forEach(w => {
    const t = I.vocabId.get(w); if (t === undefined) return;
    const P = B.post.get(t), idf = bm25Idf(P.length, I.N);
    P.forEach(([i, tf]) => { scores[i] += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * I.bmLen[i] / I.avgdl)); });
  });
  return topK(scores, k).map(([s, i], r) => ({ rank: r + 1, i, doc_id: C.ids[i], score: s }));
}
const grade = (qid, docId) => { const g = (C.qrels[qid] || {})[docId]; return g === undefined ? null : g; };
const gradeBadge = (g) => `<span class="rr-g ${g === null ? 'none' : 'g' + (g < 0 ? 'n' : g)}" title="${g === null ? 'not judged' : 'relevance grade ' + g}">${g === null ? '–' : g}</span>`;
const qLabel = (i) => `${i + 1} · ${C.queries[i].length > 90 ? C.queries[i].slice(0, 88) + '…' : C.queries[i]}`;
function fillQuerySelect(sel, cur = 0) { sel.innerHTML = C.queries.map((_, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${esc(qLabel(i))}</option>`).join(''); }

function initCranStats() {
  const I = buildIndex();
  const nq = Object.values(C.qrels).reduce((s, m) => s + Object.keys(m).length, 0);
  const wsAvg = C.wslen.reduce((a, b) => a + b, 0) / I.N;
  document.getElementById('cr-stats').innerHTML = [[I.N.toLocaleString('en'), 'abstracts'], [C.queries.length, 'queries'], [nq.toLocaleString('en'), 'relevance judgments'], [wsAvg.toFixed(1), 'avg. tokens per doc']]
    .map(([n, l]) => `<div class="stat"><span class="n">${n}</span><span class="l">${l}</span></div>`).join('');
  const DEF = { '-1': 'References of no interest.', 1: 'Minimum interest, e.g. included from a historical viewpoint.', 2: 'Useful: general background, or methods for some aspects of the work.', 3: 'High relevance: without them the research would be impracticable or much more work.', 4: 'A complete answer to the question.' };
  const cnt = {}; Object.values(C.qrels).forEach(m => Object.values(m).forEach(g => { cnt[g] = (cnt[g] || 0) + 1; }));
  document.getElementById('cr-grades').innerHTML = ['4', '3', '2', '1', '-1'].map(g => `<tr data-s="ids"><td>${gradeBadge(+g)}</td><td>${DEF[g]}</td><td>${(cnt[g] || 0).toLocaleString('en')} (${((cnt[g] || 0) / nq * 100).toFixed(1)}%)</td></tr>`).join('');
}
function initLengths() {
  const I = buildIndex(), svg = document.getElementById('len-svg'), out = document.getElementById('len-out');
  const L = C.wslen, maxL = Math.max(...L), minL = Math.min(...L), bin = 25, nb = Math.ceil((maxL + 1) / bin);
  const counts = new Array(nb).fill(0); L.forEach(v => counts[Math.floor(v / bin)]++);
  const W = 460, H = 250, X0 = 40, R = 10, T = 12, B = 36, cmax = Math.max(...counts);
  const x = (v) => X0 + v / (nb * bin) * (W - X0 - R), y = (c) => H - B - c / cmax * (H - B - T);
  [0, Math.round(cmax / 2), cmax].forEach(c => { el('line', { x1: X0, x2: W - R, y1: y(c), y2: y(c), class: 'grid-line' }, svg); txt(svg, X0 - 6, y(c) + 4, c, 'tick', 'end'); });
  counts.forEach((c, k) => el('rect', { x: x(k * bin) + 1, y: y(c), width: Math.max(1, x(bin) - X0 - 2), height: H - B - y(c), class: 'len-bar' }, svg));
  el('line', { x1: X0, x2: W - R, y1: H - B, y2: H - B, class: 'axis' }, svg);
  for (let v = 0; v <= nb * bin; v += 100) txt(svg, x(v), H - B + 15, v, 'tick', 'middle');
  const avg = L.reduce((a, b) => a + b, 0) / L.length;
  el('line', { x1: x(avg), x2: x(avg), y1: T, y2: H - B, class: 'len-avg' }, svg); txt(svg, x(avg) + 4, T + 10, `avg ${avg.toFixed(1)}`, 'lbl');
  txt(svg, X0 + (W - X0 - R) / 2, H - 4, 'tokens in title + text', 'tick', 'middle');
  const imin = L.indexOf(minL), imax = L.indexOf(maxL);
  out.innerHTML = `<p class="big">Average <b>${avg.toFixed(1)}</b> tokens</p>` +
    `<p>Shortest: doc <b>${C.ids[imin]}</b>, ${minL} tokens <span class="note">${minL === 0 ? `(empty: no title and no text; ${L.filter(v => v === 0).length} such documents, ${L.map((v, i) => v === 0 ? C.ids[i] : null).filter(Boolean).join(' and ')})` : `(${esc(C.titles[imin])})`}</span></p>` +
    `<p>Longest: doc <b>${C.ids[imax]}</b>, ${maxL} tokens <span class="note">(${esc(C.titles[imax].slice(0, 80))}…)</span></p>` +
    `<p class="note" style="margin-top:0.7rem;">Five example queries:</p><ol class="rr-qs">${C.queries.slice(0, 5).map((q, i) => `<li><b>${i + 1}</b> ${esc(q)}</li>`).join('')}</ol>`;
}
function initSklearnStats() {
  const I = buildIndex(), S = tfidfSystem({}), stats = document.getElementById('sk-stats');
  const nnz = S.post.size ? [...S.post.values()].reduce((s, p) => s + p.length, 0) : 0, V = S.idf.size;
  stats.innerHTML = [[`(${I.N.toLocaleString('en')}, ${V.toLocaleString('en')})`, 'X.shape'], [nnz.toLocaleString('en'), 'X.nnz'], [(100 * nnz / (I.N * V)).toFixed(2) + '%', 'non-zero (density)'], [(nnz / I.N).toFixed(1), 'terms per document']]
    .map(([n, l]) => `<div class="stat"><span class="n">${n}</span><span class="l">${l}</span></div>`).join('');
  const byIdf = [...S.idf].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const byDf = [...S.df].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const row = ([w]) => `<tr><td><code>${esc(w)}</code></td><td>${S.df.get(w)}</td><td>${f4(S.idf.get(w))}</td></tr>`;
  const mid = byDf.find(([, d]) => d >= 90 && d <= 110) || byDf[Math.floor(byDf.length / 20)];
  document.getElementById('sk-out').innerHTML = `<p class="big">IDF examples</p><div class="rr-tw"><table class="summary sc-small rr-num"><thead><tr><th>term</th><th>df</th><th>idf</th></tr></thead><tbody>${[byDf[0], mid, byIdf[0]].map(row).join('')}</tbody></table></div>` +
    `<p class="big" style="margin-top:0.8rem;">Ten largest IDF values</p><p class="note">${S.df.size ? byIdf.filter(([, v]) => v === byIdf[0][1]).length.toLocaleString('en') : 0} terms share the maximum ${f4(byIdf[0][1])} (they occur in one document); in <code>get_feature_names_out()</code> order the first ten are:</p>` +
    `<div class="chip-row">${byIdf.slice(0, 10).map(([w]) => `<span class="chip sc-chip">${esc(w)}</span>`).join('')}</div>`;
  const q = document.getElementById('sk-q'), box = document.getElementById('sk-term');
  function look() {
    const w = q.value.trim().toLowerCase();
    if (!w) { box.innerHTML = `<p class="note">The most common terms: ${byDf.slice(0, 12).map(([t, d]) => `<code>${esc(t)}</code> ${d}`).join(', ')}.</p>`; return; }
    box.innerHTML = S.idf.has(w) ? `<p class="big"><code>${esc(w)}</code>: df = <b>${S.df.get(w)}</b>, idf = ln(1401 / ${S.df.get(w) + 1}) + 1 = <b>${f4(S.idf.get(w))}</b></p>` : `<p class="big"><code>${esc(w)}</code> is not in the vocabulary.</p>`;
  }
  q.addEventListener('input', look); look();
}
function resultRows(res, qid, withSnip) {
  return res.map(r => `<details class="rr-res"><summary><span class="rr-rank">${r.rank}</span>${gradeBadge(qid ? grade(qid, r.doc_id) : null)}<span class="rr-doc">doc ${r.doc_id}</span><span class="rr-title">${esc(C.titles[r.i])}</span><span class="rr-score">${r.score.toFixed(4)}</span></summary>${withSnip ? `<p class="rr-snip">${esc(C.snip[r.i])}…</p>` : ''}</details>`).join('');
}
function initSearch() {
  const sel = document.getElementById('se-sel'), ta = document.getElementById('se-q'), out = document.getElementById('se-out');
  fillQuerySelect(sel, 0);
  let qid = '1';
  sel.addEventListener('change', () => { ta.value = C.queries[+sel.value]; qid = String(+sel.value + 1); render(); });
  ta.addEventListener('input', () => { qid = C.queries.indexOf(ta.value.trim()) >= 0 ? String(C.queries.indexOf(ta.value.trim()) + 1) : null; render(); });
  ta.value = C.queries[0];
  function render() {
    const res = searchTfidf(ta.value, 10);
    const judged = qid ? Object.keys(C.qrels[qid] || {}).length : 0;
    out.innerHTML = `<p class="note">${qid ? `Query ${qid}: ${judged} judged documents.` : 'Your own query: no relevance judgments.'} Top 10 by TF-IDF cosine:</p><div class="rr-list">${resultRows(res, qid, true)}</div>`;
  }
  render();
}
function initCompareTable() {
  const t = document.getElementById('cmp-table');
  const rows = C.queries.slice(0, 5).map((q, i) => { const a = searchTfidf(q, 10), b = searchBm25(q, 10); const ov = a.filter(r => b.some(s => s.doc_id === r.doc_id)).length; return { i, a, b, ov }; });
  t.innerHTML = '<thead><tr><th>query</th><th>TF-IDF top-1</th><th>BM25 top-1</th><th>same?</th><th>top-10 overlap</th></tr></thead><tbody>' +
    rows.map(r => `<tr><td><b>${r.i + 1}</b> <span class="note">${esc(C.queries[r.i].slice(0, 60))}…</span></td><td>${r.a[0].doc_id} ${gradeBadge(grade(String(r.i + 1), r.a[0].doc_id))}</td><td>${r.b[0].doc_id} ${gradeBadge(grade(String(r.i + 1), r.b[0].doc_id))}</td><td>${r.a[0].doc_id === r.b[0].doc_id ? 'yes' : '<b>no</b>'}</td><td>${r.ov} / 10</td></tr>`).join('') + '</tbody>';
  // answer to exercise 9: over all 225 queries, how often the top result differs, and the smallest top-10 overlap
  let worst = null, diffTop = 0;
  C.queries.forEach((q, i) => {
    const a = searchTfidf(q, 10), b = searchBm25(q, 10), ov = a.filter(r => b.some(s => s.doc_id === r.doc_id)).length;
    if (a[0].doc_id !== b[0].doc_id) diffTop++;
    if (!worst || ov < worst.ov) worst = { i, ov, a, b };
  });
  const w = worst, len = (r) => buildIndex().bmLen[r.i];
  document.getElementById('cmp-sol').innerHTML = `<p>No. Over all 225 queries the top result differs for <b>${diffTop}</b> of them (${(100 * diffTop / 225).toFixed(0)}%). The largest difference is query <b>${w.i + 1}</b> (<i>${esc(C.queries[w.i])}</i>): only ${w.ov} of the 10 documents are shared. Select it in the widget below.</p>` +
    `<p>TF-IDF's top 3: ${w.a.slice(0, 3).map(r => `doc ${r.doc_id} (${len(r)} tokens)`).join(', ')}; BM25's top 3: ${w.b.slice(0, 3).map(r => `doc ${r.doc_id} (${len(r)} tokens)`).join(', ')}; the average is ${buildIndex().avgdl.toFixed(1)} tokens. Compare the lengths and how often each document repeats the query terms: that is where saturation and length normalization act.</p>` +
    (() => { const c = {}; queryTokens(C.queries[w.i]).forEach(t => { c[t] = (c[t] || 0) + 1; }); const rep = Object.keys(c).filter(t => c[t] > 1 && t.length > 1); return rep.length ? `<p>Also note that the query repeats ${rep.map(t => `<code>${esc(t)}</code>`).join(', ')}: the TF-IDF query vector counts ${rep.length > 1 ? 'each of them' : 'it'} twice, while <code>search_bm25</code> uses the set of query terms, so ${rep.length > 1 ? 'each counts' : 'it counts'} once.</p>` : ''; })();
  return w.i;
}
function initCompare() {
  const sel = document.getElementById('cm-sel'), out = document.getElementById('cm-out'), k1s = document.getElementById('cm-k1'), bs = document.getElementById('cm-b');
  fillQuerySelect(sel, 0);
  function render() {
    const i = +sel.value, q = C.queries[i], qid = String(i + 1), k1 = +k1s.value, b = +bs.value;
    document.getElementById('cm-k1-val').textContent = k1.toFixed(1); document.getElementById('cm-b-val').textContent = b.toFixed(2);
    const A = searchTfidf(q, 10), Bm = searchBm25(q, 10, k1, b);
    const ov = A.filter(r => Bm.some(s => s.doc_id === r.doc_id)).length;
    const W = 760, rowH = 34, H = 30 + 10 * rowH, colW = 300;
    let s = `<svg class="ml-plot cm-svg" viewBox="0 0 ${W} ${H}" aria-label="TF-IDF and BM25 rankings side by side">`;
    s += `<text x="10" y="18" class="lbl">TF-IDF</text><text x="${W - 10}" y="18" class="lbl" text-anchor="end">BM25 (k1 = ${k1.toFixed(1)}, b = ${b.toFixed(2)})</text>`;
    A.forEach((r, k) => { const m = Bm.findIndex(x => x.doc_id === r.doc_id); if (m >= 0) s += `<path d="M${colW} ${36 + k * rowH} C ${W / 2} ${36 + k * rowH}, ${W / 2} ${36 + m * rowH}, ${W - colW} ${36 + m * rowH}" class="cm-link${k === m ? ' same' : ''}"/>`; });
    const cell = (r, x, anchor) => { const g = grade(qid, r.doc_id), t = C.titles[r.i]; return `<g class="cm-row"><text x="${x}" y="${40 + (r.rank - 1) * rowH}" text-anchor="${anchor}" class="cm-t"><tspan class="cm-g g${g === null ? 'x' : g < 0 ? 'n' : g}">${g === null ? '–' : g}</tspan> <tspan class="cm-id">${r.rank}. doc ${r.doc_id}</tspan> ${esc(t.length > 26 ? t.slice(0, 25) + '…' : t)}</text></g>`; };
    A.forEach(r => { s += cell(r, 10, 'start'); }); Bm.forEach(r => { s += cell(r, W - 10, 'end'); });
    s += '</svg>';
    out.innerHTML = `<div class="fig-scroll">${s}</div><p class="note" style="margin-top:0.4rem;">Top-10 overlap: <b>${ov}</b> / 10 · top result ${A[0].doc_id === Bm[0].doc_id ? 'the same' : '<b>different</b>'} · grades: ${gradeBadge(4)} complete answer … ${gradeBadge(-1)} no interest, – not judged.</p>`;
  }
  [sel, k1s, bs].forEach(x => x.addEventListener('input', render));
  sel.addEventListener('change', render);
  render();
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

/* ---------- length normalization on a real term ---------- */
function initLengthNorm() {
  const inp = document.getElementById('ln-term'), out = document.getElementById('ln-out'), I = buildIndex(), B = bm25Index();
  const PRE = ['flutter', 'boundary', 'heat', 'shock'];
  pills(document.getElementById('ln-presets'), PRE.map(p => [p, p]), PRE[0], k => { inp.value = k; render(); });
  inp.value = PRE[0];
  function render() {
    const w = inp.value.trim().toLowerCase(), t = I.vocabId.get(w);
    if (t === undefined) { out.innerHTML = `<p class="note"><code>${esc(w)}</code> is not in the Cranfield vocabulary.</p>`; return; }
    const P = B.post.get(t), idf = bm25Idf(P.length, I.N);
    const tfCount = {}; P.forEach(([, f]) => { tfCount[f] = (tfCount[f] || 0) + 1; });
    const tf = +Object.keys(tfCount).sort((a, b) => tfCount[b] - tfCount[a] || a - b)[0];
    const docs = P.filter(([, f]) => f === tf).map(([i]) => i).sort((a, b) => I.bmLen[a] - I.bmLen[b]);
    const pick = [...new Set([docs[0], docs[Math.floor(docs.length / 4)], docs[Math.floor(docs.length / 2)], docs[Math.floor(3 * docs.length / 4)], docs[docs.length - 1]])];
    const bs = [0, 0.5, 0.75, 1], k1 = 1.2;
    const c = (i, b) => idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * I.bmLen[i] / I.avgdl));
    out.innerHTML = `<p class="note"><code>${esc(w)}</code>: df = ${P.length}, BM25 idf = ${idf.toFixed(4)}. ${docs.length} documents contain it exactly <b>${tf}</b> time${tf > 1 ? 's' : ''}; five of them, from shortest to longest (avgdl = ${I.avgdl.toFixed(1)}):</p>` +
      `<div class="table-wrap"><table class="summary sc-small rr-num"><thead><tr><th>doc</th><th>|d|</th><th>|d| / avgdl</th>${bs.map(b => `<th>b = ${b}</th>`).join('')}</tr></thead><tbody>` +
      pick.map(i => `<tr><td>doc ${C.ids[i]}</td><td>${I.bmLen[i]}</td><td>${(I.bmLen[i] / I.avgdl).toFixed(2)}</td>${bs.map(b => `<td class="${b === 0.75 ? 'hl' : ''}">${c(i, b).toFixed(4)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>' +
      `<p class="note" style="margin-top:0.5rem;">With b = 0 every column value is the same. As b grows, the shortest document's contribution rises and the longest one's falls.</p>`;
  }
  inp.addEventListener('input', render);
  render();
}

/* ---------- preprocessing comparison ---------- */
function initPreproc() {
  const t = document.getElementById('pp-table'), boxes = ['pp-stop', 'pp-stem', 'pp-num'].map(id => document.getElementById(id));
  function render() {
    const opts = { stop: boxes[0].checked, stem: boxes[1].checked, num: boxes[2].checked };
    const S = tfidfSystem(opts);
    t.innerHTML = `<thead><tr><th>query</th><th>original top-1</th><th>new top-1</th><th>top-10 overlap</th></tr></thead><tbody>` +
      C.queries.slice(0, 5).map((q, i) => { const a = searchTfidf(q, 10), b = searchTfidf(q, 10, opts); const ov = a.filter(r => b.some(s => s.doc_id === r.doc_id)).length; return `<tr><td><b>${i + 1}</b> <span class="note">${esc(q.slice(0, 55))}…</span></td><td>${a[0].doc_id} ${gradeBadge(grade(String(i + 1), a[0].doc_id))}</td><td>${b[0].doc_id} ${gradeBadge(grade(String(i + 1), b[0].doc_id))}</td><td>${ov} / 10</td></tr>`; }).join('') +
      `</tbody><tfoot><tr><td colspan="4" class="note">Vocabulary: ${tfidfSystem({}).idf.size.toLocaleString('en')} terms → ${S.idf.size.toLocaleString('en')}.</td></tr></tfoot>`;
  }
  boxes.forEach(b => b.addEventListener('change', render));
  render();
}

/* ---------- TREC run files ---------- */
function initRuns() {
  const out = document.getElementById('run-out'), dl = document.getElementById('run-dl');
  let sys = 'tfidf';
  const lines = (s) => { const L = []; C.queries.forEach((q, i) => (s === 'tfidf' ? searchTfidf(q, 100) : searchBm25(q, 100)).forEach(r => L.push(`${i + 1} Q0 ${r.doc_id} ${r.rank} ${r.score.toFixed(8)} ${s}`))); return L; };
  const cache = {};
  function render() { cache[sys] = cache[sys] || lines(sys); out.textContent = cache[sys].slice(0, 12).join('\n') + `\n… (${cache[sys].length.toLocaleString('en')} lines in lab04_${sys}.run)`; }
  pills(document.getElementById('run-sys'), [['tfidf', 'lab04_tfidf.run'], ['bm25', 'lab04_bm25.run']], sys, k => { sys = k; render(); });
  dl.addEventListener('click', () => {
    const blob = new Blob([cache[sys].join('\n') + '\n'], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lab04_${sys}.run`; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });
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
  initCranStats();
  initLengths();
  initSklearnStats();
  initSearch();
  initCompareTable();
  initCompare();
  initLengthNorm();
  initPreproc();
  initRuns();
});

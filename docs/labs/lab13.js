/* ===== Lab 13 interactivity ===== */

const SVG_NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
  if (parent) parent.appendChild(e);
  return e;
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


/* ====================== pure part (Node-testable) ====================== */
const E = typeof EV !== 'undefined' ? EV : (typeof global !== 'undefined' && global.EV) || null;
const SIZES = [['30', '30 tokens'], ['60', '60 tokens'], ['120', '120 tokens'], ['doc', 'whole documents']];
const SYSTEMS = [['dense', 'dense'], ['bm25', 'BM25'], ['hybrid', 'hybrid (RRF)'], ['dense_ce', 'dense + reranker'], ['hybrid_ce', 'hybrid + reranker']];

// SQuAD-style answer normalisation, exact match and token F1
const normAnswer = (s) => s.toLowerCase().replace(/[!-\/:-@\[-`{-~]/g, '').replace(/\b(a|an|the)\b/g, ' ').split(/\s+/).filter(Boolean);   // as the official SQuAD script: delete ASCII punctuation
function exactMatch(gold, pred) { return normAnswer(gold).join(' ') === normAnswer(pred).join(' ') ? 1 : 0; }
function tokenF1(gold, pred) {
  const g = normAnswer(gold), p = normAnswer(pred), cnt = new Map();
  g.forEach(t => cnt.set(t, (cnt.get(t) || 0) + 1));
  let same = 0; p.forEach(t => { if (cnt.get(t) > 0) { same++; cnt.set(t, cnt.get(t) - 1); } });
  if (!same) return { f1: 0, p: 0, r: 0, same, np: p.length, ng: g.length };
  const pr = same / p.length, rc = same / g.length;
  return { f1: 2 * pr * rc / (pr + rc), p: pr, r: rc, same, np: p.length, ng: g.length };
}

// evidence sentences of a question held whole by a chunk
const chunkText = (size) => Object.fromEntries(E.cfg[size].chunks.map(c => [c.id, c.text]));
function evalQuestion(size, sys, k, qi) {
  const q = E.qs[qi], T = chunkText(size), run = E.cfg[size].runs[sys][qi], top = run.slice(0, k);
  const supp = (id) => q.ev.some(e => T[id].includes(e));
  const found = q.ev.filter(e => top.some(id => T[id].includes(e)));
  const first = run.findIndex(supp);
  const tok = top.reduce((s, id) => s + E.cfg[size].chunks.find(c => c.id === id).tok - 2, 0);
  let label = 'EVIDENCE_IN_CONTEXT', why = 'all gold evidence is in the context';
  if (!q.ev.length) { label = 'CORPUS_MISSING'; why = 'no document contains the answer: the right outcome is to abstain'; }
  else if (found.length < q.ev.length) {
    const miss = q.ev.filter(e => !found.includes(e))[0];
    const holders = run.map((id, r) => [id, r + 1]).filter(([id]) => T[id].includes(miss));
    if (!holders.length) { label = 'BAD_CHUNKING'; why = 'no chunk holds the evidence sentence whole'; }
    else {
      const r = holders[0][1];
      const base = sys.endsWith('_ce') ? E.cfg[size].runs[sys.replace('_ce', '')][qi] : null;
      const rb = base ? base.findIndex(id => T[id].includes(miss)) + 1 : 0;
      if (base && rb <= k) { label = 'RERANKING_MISS'; why = `the evidence was at rank ${rb} before reranking, ${r} after`; }
      else { label = 'RETRIEVAL_MISS'; why = `the chunk with the evidence is at rank ${r}, below the cutoff`; }
    }
  }
  return { top, found: found.length, total: q.ev.length, cp: top.filter(supp).length / k, rr: first >= 0 ? 1 / (first + 1) : 0, tok, label, why, supp };
}
function evalSystem(size, sys, k) {
  const per = E.qs.map((_, qi) => evalQuestion(size, sys, k, qi)), ans = per.filter((_, qi) => E.qs[qi].ev.length);
  const mean = (f) => ans.reduce((s, x) => s + f(x), 0) / ans.length;
  return { per, er: mean(x => x.found / x.total), cp: mean(x => x.cp), mrr: mean(x => x.rr), all: ans.filter(x => x.found === x.total).length, n: ans.length, tok: mean(x => x.tok) };
}

if (typeof module !== 'undefined') module.exports = { exactMatch, tokenF1, evalSystem, evalQuestion };
if (typeof document !== 'undefined') {


/* ---------- math ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- hero: ranked lists with a few ticked items ---------- */
function initHero() {
  const svg = document.getElementById('ev-hero-bg'), r = rng(12);
  for (let col = 0; col < 14; col++) {
    const x = 20 + col * 88;
    for (let row = 0; row < 6; row++) {
      const y = 30 + row * 42 + (col % 2) * 14, hit = r() < 0.25;
      el('rect', { x, y, width: 60, height: 18, rx: 5, class: 'eh' + (hit ? ' hit' : '') }, svg);
    }
  }
}

/* ---------- Part II: evidence recall on the outline's example ---------- */
function initEvidenceExample() {
  const run = ['C2', 'C11', 'C7', 'C19', 'C4', 'C8', 'C1', 'C15'], gold = new Set(['C4', 'C11']);
  const K = document.getElementById('er-k'), list = document.getElementById('er-list'), out = document.getElementById('er-out');
  function render() {
    const k = +K.value; document.getElementById('er-k-val').textContent = k;
    list.innerHTML = run.map((c, i) => `<span class="er-chip${i < k ? ' in' : ''}${gold.has(c) ? ' gold' : ''}"><small>${i + 1}</small>${c}${gold.has(c) ? ' ★' : ''}</span>`).join('');
    const top = run.slice(0, k), hit = top.filter(c => gold.has(c)).length, first = run.findIndex(c => gold.has(c)) + 1;
    out.innerHTML = `<p>EvidenceRecall@${k} = ${hit} / ${gold.size} = <b>${f2(hit / gold.size)}</b> &nbsp;·&nbsp; ContextPrecision@${k} = ${hit} / ${k} = <b>${f2(hit / k)}</b> &nbsp;·&nbsp; reciprocal rank = 1 / ${first} = <b>${f2(1 / first)}</b></p>` +
      `<p class="note">★ gold evidence. ${hit === gold.size ? (k > 5 ? 'Recall cannot rise any further; every extra chunk only lowers precision.' : 'All the evidence is in the context.') : `❗ ${gold.size - hit} gold chunk${gold.size - hit === 1 ? ' is' : 's are'} outside the context: the generator cannot use ${gold.size - hit === 1 ? 'it' : 'them'}.`}</p>`;
  }
  K.addEventListener('input', render);
  render();
}

/* ---------- Part III: exact match and token F1 ---------- */
function initEM() {
  const G = document.getElementById('em-gold'), P = document.getElementById('em-pred'), out = document.getElementById('em-out');
  const PRE = ['30 ECTS', '30', "The master's thesis is worth 30 ECTS credits.", 'The thesis carries 30 European Credit Transfer System credits.', 'thirty ECTS', '20 ECTS'];
  pills(document.getElementById('em-pre'), PRE.map(p => [p, p]), PRE[2], (p) => { P.value = p; render(); });
  P.value = PRE[2];
  function render() {
    const em = exactMatch(G.value, P.value), t = tokenF1(G.value, P.value);
    out.innerHTML = `<p>normalised gold: <code>${esc(normAnswer(G.value).join(' '))}</code> · prediction: <code>${esc(normAnswer(P.value).join(' '))}</code></p>` +
      `<p class="big">Exact match <b>${em}</b> · token F1 <b>${f3(t.f1)}</b></p>` +
      `<p class="note">${t.same} shared token${t.same === 1 ? '' : 's'}: precision ${t.same}/${t.np || 0} = ${f2(t.p)}, recall ${t.same}/${t.ng || 0} = ${f2(t.r)}. ${P.value.toLowerCase().includes('20') && !P.value.includes('30') ? '❗ Half the tokens match, yet the answer is simply wrong: overlap is not correctness.' : em === 0 && t.f1 < 1 && /30|thirty/i.test(P.value) ? 'A correct answer that exact match rejects and F1 only partly credits: why open-ended answers need semantic judgment.' : ''}</p>`;
  }
  [G, P].forEach(x => x.addEventListener('input', () => { document.querySelectorAll('#em-pre .strat-btn').forEach(b => b.classList.toggle('active', b.dataset.k === P.value)); render(); }));
  render();
}

/* ---------- Part III: claim-level faithfulness ---------- */
function initFaith() {
  const ANS = [
    ['supported', [['The programme requires 120 ECTS', 1], ['the thesis is worth 30 ECTS', 1]]],
    ['with an internship', [['The programme requires 120 ECTS', 1], ['the thesis is worth 30 ECTS', 1], ['students must complete a six-month internship', 0]]],
    ['correct but ungrounded', [['The thesis is worth 30 ECTS', 1], ['it is written in English', 0]]],
  ];
  const box = document.getElementById('fa-claims'), out = document.getElementById('fa-out');
  let a = 1, marks = [];
  pills(document.getElementById('fa-ans'), ANS.map((x, i) => [i, x[0]]), a, (i) => { a = +i; marks = ANS[a][1].map(() => null); render(); });
  marks = ANS[a][1].map(() => null);
  function render() {
    const C = ANS[a][1];
    box.innerHTML = C.map(([t], i) => `<button type="button" class="fa-claim ${marks[i] === null ? '' : marks[i] ? 'y' : 'n'}" data-i="${i}"><span class="fa-m">${marks[i] === null ? '?' : marks[i] ? '✔' : '✘'}</span>claim ${i + 1}: ${esc(t)}</button>`).join('');
    box.querySelectorAll('.fa-claim').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.i; marks[i] = marks[i] === null ? 1 : marks[i] ? 0 : null; render(); }));
    const done = marks.every(m => m !== null), gold = C.filter(c => c[1]).length;
    const yours = done ? marks.filter(Boolean).length : null, agree = done && marks.every((m, i) => m === C[i][1]);
    out.innerHTML = done
      ? `<p class="big">Your faithfulness: ${yours} / ${C.length} = <b>${f2(yours / C.length)}</b> ${agree ? '✅ matches' : '❌ differs from'} the reference labels (${gold} / ${C.length} = ${f2(gold / C.length)})</p>` +
        `<p class="note">${a === 2 ? 'The thesis <i>is</i> written in English (the handbook says so), but not in <b>this</b> context: correct but ungrounded, so it does not count as supported.' : a === 1 ? 'Two correct statements and one invented requirement: partially unfaithful.' : 'Every claim appears in the context.'}</p>`
      : `<p class="note">Click every claim (? → ✔ supported → ✘ not supported).</p>`;
  }
  render();
}

/* ---------- Part IV: citation precision and recall ---------- */
function initCite() {
  const CTX = ['The programme requires 120 ECTS credits.', 'The master\'s thesis is worth 30 ECTS credits.', 'An internship is optional and is not required for graduation.'];
  const CL = [['The programme requires 120 ECTS', 1], ['the thesis is worth 30 ECTS', 2], ['students must complete a six-month internship', 0]];
  let cite = [1, 1, 3];
  document.getElementById('ci-ctx').innerHTML = CTX.map((t, i) => `<p><b>[${i + 1}]</b> ${esc(t)}</p>`).join('');
  const box = document.getElementById('ci-claims'), out = document.getElementById('ci-out');
  function render() {
    box.innerHTML = CL.map(([t, g], i) => `<div class="ci-row"><span>claim ${i + 1}: ${esc(t)}</span><select class="ii-select" data-i="${i}" aria-label="citation for claim ${i + 1}">${[0, 1, 2, 3].map(c => `<option value="${c}"${c === cite[i] ? ' selected' : ''}>${c ? '[' + c + ']' : 'no citation'}</option>`).join('')}</select><span class="ci-ok">${cite[i] ? (cite[i] === g ? '✅ supports' : '❌ does not support') : ''}</span></div>`).join('');
    box.querySelectorAll('select').forEach(s => s.addEventListener('change', () => { cite[+s.dataset.i] = +s.value; render(); }));
    const produced = cite.filter(Boolean).length, correct = cite.filter((c, i) => c && c === CL[i][1]).length;
    out.innerHTML = `<p>Citation precision = ${correct} / ${produced || 0} = <b>${produced ? f2(correct / produced) : '–'}</b> &nbsp;·&nbsp; citation recall = ${correct} / ${CL.length} = <b>${f2(correct / CL.length)}</b></p>` +
      `<p class="note">Claim 3 has no supporting passage at all ([3] says the opposite), so citation recall can reach at most 2/3: the claim itself is unfaithful and should be removed, not cited better.</p>`;
  }
  render();
}

/* ---------- Part V: the evaluation set ---------- */
function initEvalSet() {
  const T = E.docs, where = (e) => Object.keys(T).find(k => T[k].text.includes(e));
  document.getElementById('ev-set').innerHTML = `<thead><tr><th>id</th><th>question</th><th>category</th><th>reference answer</th><th>gold evidence</th></tr></thead><tbody>` +
    E.qs.map(q => `<tr><td><b>${q.id}</b></td><td>${esc(q.q)}</td><td>${q.cat}</td><td>${q.ref ? esc(q.ref) : '<i>none: abstain</i>'}</td><td>${q.ev.length ? q.ev.map(e => `<span title="${esc(e)}">${where(e)} · ${esc(T[where(e)].title)}</span>`).join('<br>') : '–'}</td></tr>`).join('') + '</tbody>';
}

/* ---------- Part VI: System A vs System B, inspection; Part VII: failure distribution ---------- */
function initCompare() {
  const cfg = { A: { size: '60', sys: 'dense', k: 3 }, B: { size: 'doc', sys: 'hybrid_ce', k: 5 } };
  const box = document.getElementById('cmp-cfg'), table = document.getElementById('cmp-table'), note = document.getElementById('cmp-note');
  const qsel = document.getElementById('cmp-q'), insp = document.getElementById('cmp-insp'), fd = document.getElementById('fd-out');
  const opt = (items, cur) => items.map(([v, l]) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${l}</option>`).join('');
  box.innerHTML = ['A', 'B'].map(s => `<div class="vs-card cmp-sys"><p class="al-h">System ${s}</p>` +
    `<label>chunks <select class="ii-select" data-s="${s}" data-f="size">${opt(SIZES, cfg[s].size)}</select></label>` +
    `<label>retriever <select class="ii-select" data-s="${s}" data-f="sys">${opt(SYSTEMS, cfg[s].sys)}</select></label>` +
    `<label>top-k <select class="ii-select" data-s="${s}" data-f="k">${opt([1, 2, 3, 4, 5, 6, 7, 8].map(k => [k, k]), cfg[s].k)}</select></label></div>`).join('');
  box.querySelectorAll('select').forEach(x => x.addEventListener('change', () => { const c = cfg[x.dataset.s]; c[x.dataset.f] = x.dataset.f === 'k' ? +x.value : x.value; render(); }));
  qsel.innerHTML = E.qs.map((q, i) => `<option value="${i}">${q.id} · ${esc(q.q)} (${q.cat})</option>`).join('');
  qsel.addEventListener('change', render);
  const LBL = { EVIDENCE_IN_CONTEXT: 'ok', CORPUS_MISSING: 'corpus', BAD_CHUNKING: 'bad', RETRIEVAL_MISS: 'bad', RERANKING_MISS: 'bad' };
  const markEv = (text, ev) => { let h = esc(text); ev.forEach(e => { h = h.replace(esc(e), `<mark class="rg-ans">${esc(e)}</mark>`); }); return h; };
  function render() {
    const R = { A: evalSystem(cfg.A.size, cfg.A.sys, cfg.A.k), B: evalSystem(cfg.B.size, cfg.B.sys, cfg.B.k) };
    const rows = [['Evidence recall (in the context)', 'er', 3], ['Context precision', 'cp', 3], ['MRR (first supporting chunk)', 'mrr', 3], ['Questions with all evidence in the context', 'all', 0], ['Mean context size (tokens)', 'tok', 0]];
    table.innerHTML = `<thead><tr><th>Metric (10 answerable questions)</th><th>System A</th><th>System B</th></tr></thead><tbody>` +
      rows.map(([n, key, d]) => { const a = R.A[key], b = R.B[key], better = key === 'tok' ? (a < b ? 'A' : b < a ? 'B' : '') : (a > b ? 'A' : b > a ? 'B' : '');
        const fmt = (v) => key === 'all' ? `${v} / ${R.A.n}` : key === 'tok' ? Math.round(v) : v.toFixed(d);
        return `<tr><td><b>${n}</b></td><td class="${better === 'A' ? 'hit' : ''}">${fmt(a)}</td><td class="${better === 'B' ? 'hit' : ''}">${fmt(b)}</td></tr>`; }).join('') + '</tbody>';
    note.textContent = `Shaded: the better value (for context size, the smaller). ${R.A.er !== R.B.er && (R.A.er > R.B.er) !== (R.A.tok > R.B.tok) ? 'The system with more evidence also sends more tokens: a trade-off, not a winner.' : ''}`;
    const qi = +qsel.value, q = E.qs[qi];
    insp.innerHTML = ['A', 'B'].map(s => { const x = R[s].per[qi], T = chunkText(cfg[s].size);
      return `<div class="vs-card"><p class="al-h">System ${s} <span class="fd-l ${LBL[x.label]}">${x.label}</span></p><p class="rr-note" style="margin-top:0;">${x.why}${q.ev.length ? ` · evidence ${x.found}/${x.total}` : ''}</p>` +
        x.top.map((id, r) => `<div class="insp-c${x.supp(id) ? ' sup' : ''}"><b>${r + 1}. ${id}</b> ${markEv(T[id], q.ev)}</div>`).join('') + '</div>'; }).join('');
    const order = ['EVIDENCE_IN_CONTEXT', 'BAD_CHUNKING', 'RETRIEVAL_MISS', 'RERANKING_MISS', 'CORPUS_MISSING'];
    fd.innerHTML = ['A', 'B'].map(s => { const cnt = {}; R[s].per.forEach(x => { cnt[x.label] = (cnt[x.label] || 0) + 1; });
      return `<div class="vs-card"><p class="al-h">System ${s} <span class="rr-note">${SIZES.find(z => z[0] === cfg[s].size)[1]}, ${SYSTEMS.find(z => z[0] === cfg[s].sys)[1]}, top ${cfg[s].k}</span></p>` +
        order.map(l => `<div class="cm-bar fd-bar"><span class="fd-l ${LBL[l]}">${l}</span><div><i class="${LBL[l]}" style="width:${(100 * (cnt[l] || 0) / 12).toFixed(1)}%"></i></div><b>${cnt[l] || 0}</b></div>`).join('') +
        `<p class="rr-note">${R[s].per.map((x, i) => x.label === 'EVIDENCE_IN_CONTEXT' || x.label === 'CORPUS_MISSING' ? '' : `${E.qs[i].id}: ${x.label}`).filter(Boolean).join(' · ') || 'No retrieval-side failure on the answerable questions.'}</p></div>`; }).join('');
  }
  render();
}

/* ---------- Part VIII: ablation ---------- */
function initAblation() {
  const A = E.ablation, sys = Object.keys(A), ms = Object.keys(A[sys[0]]);
  document.getElementById('ab-table').innerHTML = `<thead><tr><th>System</th>${ms.map(m => `<th>${m}</th>`).join('')}</tr></thead><tbody>` +
    sys.map(s => `<tr><td><b>${s}</b></td>${ms.map(m => `<td class="${Math.max(...sys.map(x => A[x][m])) === A[s][m] ? 'hit' : ''}">${A[s][m].toFixed(4)}</td>`).join('')}</tr>`).join('') + '</tbody>';
  document.getElementById('ab-chunk').innerHTML = SIZES.map(([s, l]) => { const r = evalSystem(s, 'dense', 3); return `${l}: evidence recall <b>${f2(r.er)}</b>, ${Math.round(r.tok)} tokens`; }).join('; ') + '.';
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initEvidenceExample();
  initEM();
  initFaith();
  initCite();
  if (!E) return;
  initEvalSet();
  initCompare();
  initAblation();
});

}

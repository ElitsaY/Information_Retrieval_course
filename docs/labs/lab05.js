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


/* ---------- DCG (used by the Part IV playground) ---------- */
// gain(g): linear = g, exp = 2^g - 1; grades below 0 count as 0
const gainOf = (g, exp) => (g <= 0 ? 0 : exp ? Math.pow(2, g) - 1 : g);
function dcg(grades, k, exp) { let s = 0; grades.slice(0, k).forEach((g, i) => { s += gainOf(g, exp) / Math.log2(i + 2); }); return s; }

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

/* ---------- Part II: accuracy vs precision and recall ---------- */
function initAccuracy() {
  const $ = (id) => document.getElementById(id), cm = $('ac-cm'), out = $('ac-out');
  // [label, collection size N, relevant R, retrieved k, relevant among the retrieved]
  const PRE = { none: ['Return nothing', 1400, 7, 0, 0], all: ['Return everything', 1400, 7, 1400, 7], web: ['Web scale', 1e9, 7, 10, 4] };
  pills($('ac-pre'), Object.entries(PRE).map(([k, v]) => [k, v[0]]), 'none', render);
  const pct = (v) => (100 * v).toFixed(v > 0.9999 && v < 1 ? 7 : 1) + '%';
  function render(key) {
    const [, N, R, k, TP] = PRE[key];
    const FP = k - TP, FN = R - TP, TN = N - k - FN;
    cm.innerHTML = `<div class="table-wrap"><table class="summary sc-small rr-num cm-live"><thead><tr><th></th><th>relevant</th><th>not relevant</th></tr></thead><tbody>` +
      `<tr><td><b>retrieved</b></td><td class="tp">TP = ${TP}</td><td class="fp">FP = ${FP.toLocaleString('en')}</td></tr><tr><td><b>not retrieved</b></td><td class="fn">FN = ${FN}</td><td class="tn">TN = ${TN.toLocaleString('en')}</td></tr></tbody></table></div>`;
    const acc = (TP + TN) / N;
    out.innerHTML = `<p class="big">Accuracy \\(= \\frac{${TP} + ${TN.toLocaleString('en').replace(/,/g, '{,}')}}{${N.toLocaleString('en').replace(/,/g, '{,}')}}\\) = <b>${pct(acc)}</b></p>`;
    mathIn(out);
  }
  render('none');
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

/* ---------- Part IV: DCG and nDCG ---------- */
function initDcg() {
  const inp = document.getElementById('dg-in'), out = document.getElementById('dg-out');
  let exp = true;
  inp.value = '3, 0, 2, 1';
  pills(document.getElementById('dg-gain'), [['exp', 'gain = 2^rel − 1'], ['lin', 'gain = rel']], 'exp', k => { exp = k === 'exp'; render(); });
  document.getElementById('dg-ideal').addEventListener('click', () => { inp.value = inp.value.split(/[\s,]+/).filter(Boolean).map(Number).sort((a, b) => b - a).join(', '); render(); });
  function table(grades, label) {
    let cum = 0;
    return `<p class="al-h">${label}</p><div class="rr-tw"><table class="summary sc-small rr-num"><thead><tr><th>rank i</th><th>rel</th><th>gain</th><th>log₂(i+1)</th><th>gain / log₂(i+1)</th><th>running DCG</th></tr></thead><tbody>` +
      grades.map((g, i) => { const gn = gainOf(g, exp), d = Math.log2(i + 2); cum += gn / d; return `<tr><td>${i + 1}</td><td>${g}</td><td>${gn}</td><td>${d.toFixed(3)}</td><td>${(gn / d).toFixed(3)}</td><td>${cum.toFixed(3)}</td></tr>`; }).join('') + '</tbody></table></div>';
  }
  function render() {
    const g = inp.value.split(/[\s,]+/).filter(Boolean).map(Number).filter(v => Number.isFinite(v) && v >= 0 && v <= 3).slice(0, 10);
    if (!g.length) { out.innerHTML = '<p class="note">Type grades from 0 to 3, e.g. 3, 0, 2, 1.</p>'; return; }
    const ideal = g.slice().sort((a, b) => b - a), k = g.length, D = dcg(g, k, exp), I = dcg(ideal, k, exp);
    out.innerHTML = table(g, 'System ranking') + table(ideal, 'Ideal ranking (highest grade first)') +
      `<p class="big" style="margin-top:0.6rem;">DCG@${k} = <b>${D.toFixed(4)}</b>, IDCG@${k} = <b>${I.toFixed(4)}</b>, nDCG@${k} = ${D.toFixed(4)} / ${I.toFixed(4)} = <b>${I ? (D / I).toFixed(4) : '—'}</b></p>`;
  }
  inp.addEventListener('input', render);
  render();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initAccuracy();
  initRecall();
  initDcg();
});

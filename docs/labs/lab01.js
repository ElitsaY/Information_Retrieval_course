/* ===== Lab 01 interactivity ===== */

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
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);   // code-point order, like Python's sorted()

/* pill toggle group: pills(box, [[key, label], …], current, onPick) */
function pills(box, items, cur, onPick) {
  box.innerHTML = '';
  items.forEach(([k, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'strat-btn' + (k === cur ? ' active' : ''); b.textContent = label; b.dataset.k = k;
    b.addEventListener('click', () => { box.querySelectorAll('.strat-btn').forEach(x => x.classList.toggle('active', x === b)); onPick(k); });
    box.appendChild(b);
  });
}
function fillSelect(sel, values, cur) {
  sel.innerHTML = values.map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join('');
}

/* ---------- data: the notebook's 14 BBC headlines ---------- */
const HEADLINES = [
  'China confirms Interpol chief detained',
  'Turkish officials believe the Washington Post writer was killed in the Saudi consulate in Istanbul.',
  'US wedding limousine crash kills 20',
  'Bulgarian journalist killed in park',
  'Kanye West deletes social media profiles',
  'Brazilians vote in polarised election',
  'Bull kills woman at French festival',
  'Indonesia to wrap up tsunami search',
  'Tina Turner reveals wedding night ordeal',
  'Victory for Trump in Supreme Court battle',
  'Clashes at German far-right rock concert',
  'The Walking Dead, actor dies aged 76',
  'Jogger in Netherlands finds lion cub',
  'Monkey takes the wheel of Indian bus',
];
// NLTK TweetTokenizer output for each headline (computed with nltk 3.9)
const HEAD_TOK = [
  ['China', 'confirms', 'Interpol', 'chief', 'detained'],
  ['Turkish', 'officials', 'believe', 'the', 'Washington', 'Post', 'writer', 'was', 'killed', 'in', 'the', 'Saudi', 'consulate', 'in', 'Istanbul', '.'],
  ['US', 'wedding', 'limousine', 'crash', 'kills', '20'],
  ['Bulgarian', 'journalist', 'killed', 'in', 'park'],
  ['Kanye', 'West', 'deletes', 'social', 'media', 'profiles'],
  ['Brazilians', 'vote', 'in', 'polarised', 'election'],
  ['Bull', 'kills', 'woman', 'at', 'French', 'festival'],
  ['Indonesia', 'to', 'wrap', 'up', 'tsunami', 'search'],
  ['Tina', 'Turner', 'reveals', 'wedding', 'night', 'ordeal'],
  ['Victory', 'for', 'Trump', 'in', 'Supreme', 'Court', 'battle'],
  ['Clashes', 'at', 'German', 'far-right', 'rock', 'concert'],
  ['The', 'Walking', 'Dead', ',', 'actor', 'dies', 'aged', '76'],
  ['Jogger', 'in', 'Netherlands', 'finds', 'lion', 'cub'],
  ['Monkey', 'takes', 'the', 'wheel', 'of', 'Indian', 'bus'],
];
const HEAD_LOW = HEAD_TOK.map(d => d.map(t => t.toLowerCase()));
const TERMS = [...new Set(HEAD_LOW.flat())].sort(cmp);                    // 83 terms
const MATRIX = TERMS.map(t => HEAD_LOW.map(d => d.filter(x => x === t).length));   // 83 x 14 counts

/* ---------- a small JavaScript version of NLTK's TweetTokenizer + preprocess_document ---------- */
const PUNCTUATION = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';   // Python's string.punctuation
const TW_RE = new RegExp([
  String.raw`(?:https?:\/\/\S+|[a-z0-9]+(?:[.\-][a-z0-9]+)*\.[a-z]{2,13}\b\/?(?!@))`,   // URLs and bare domains
  String.raw`<[^>\s]+>`,                                   // HTML tags (and <message-ids>)
  String.raw`[\-]+>|<[\-]+`,                               // arrows
  String.raw`@[\w_]+`,                                     // @user
  String.raw`#+[\w_]+[\w'_\-]*[\w_]+`,                     // #hashtag
  String.raw`[\w.+\-]+@[\w\-]+\.(?:[\w\-]\.?)+[\w\-]`,     // e-mail
  String.raw`\p{L}(?:\p{L}|['\-_])+\p{L}`,                 // words with apostrophes or dashes
  String.raw`[+\-]?\d+[,/.:\-]\d+[+\-]?`,                  // numbers, fractions, decimals, times
  String.raw`[\p{L}\p{N}_]+`,                              // other words
  String.raw`\.(?:\s*\.)+`,                                // ellipsis
  String.raw`\S`,                                          // anything else
].join('|'), 'giu');
function tweetTokenize(s) { return s.match(TW_RE) || []; }
function sentTokenize(s) { return s.trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/).filter(Boolean); }
const isPunct = (tok) => PUNCTUATION.includes(tok);     // Python: tok in punctuation (a substring test)
function preprocess(content) {
  return sentTokenize(content).flatMap(s => tweetTokenize(s).filter(t => !isPunct(t)).map(t => t.toLowerCase()));
}

/* ---------- maths rendering ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- hero: postings lists hanging off dictionary entries ---------- */
function initHero() {
  const svg = document.getElementById('ii-hero-bg');
  const r = rng(11);
  for (let y = 22; y < 300; y += 38) {
    let x = -60 + r() * 120;
    while (x < 1240) {
      const n = 3 + Math.floor(r() * 6), c = Math.floor(r() * 4);
      el('rect', { x, y, width: 46, height: 20, rx: 6, class: 'term c' + c }, svg);
      let px = x + 46;
      for (let i = 0; i < n; i++) {
        el('line', { x1: px, y1: y + 10, x2: px + 14, y2: y + 10, class: 'ln' }, svg);
        el('rect', { x: px + 14, y: y + 2, width: 16, height: 16, rx: 4, class: 'post' }, svg);
        px += 30;
      }
      x = px + 40 + r() * 90;
    }
  }
}

/* ---------- tokenize a headline ---------- */
function chipsHtml(tokens, markPunct = true, cls = '') {
  return tokens.map(t => `<span class="chip tk-chip${cls}${markPunct && isPunct(t) ? ' punct' : ''}">${esc(t)}</span>`).join('');
}
function initTokenize() {
  const sel = document.getElementById('tk-pick'), out = document.getElementById('tk-out');
  sel.innerHTML = HEADLINES.map((h, i) => `<option value="${i}">${i} · ${esc(h)}</option>`).join('');
  sel.value = 1;
  function render() {
    const i = +sel.value;
    const vocab = new Set(HEAD_LOW.slice(0, i + 1).flat());
    out.innerHTML = `
      <div class="ii-step"><span class="ii-step-l">Raw</span><p class="tk-raw">${esc(HEADLINES[i])}</p></div>
      <div class="ii-step"><span class="ii-step-l">tokenizer.tokenize</span><div class="chip-row">${chipsHtml(HEAD_TOK[i])}</div></div>
      <div class="ii-step"><span class="ii-step-l">.lower()</span><div class="chip-row">${chipsHtml(HEAD_LOW[i])}</div></div>
      <p class="note">${HEAD_TOK[i].length} tokens, ${new Set(HEAD_LOW[i]).size} distinct. Unique terms in documents 0–${i}: <b>${vocab.size}</b> (all 14 documents: <b>${TERMS.length}</b>).</p>`;
  }
  sel.addEventListener('change', render);
  render();
}

/* ---------- incidence matrix + Boolean query on bit vectors ---------- */
const OPS = { AND: (a, b) => a & b, OR: (a, b) => a | b, 'AND NOT': (a, b) => a & (1 - b) };
function initIncidence() {
  const selA = document.getElementById('im-a'), selB = document.getElementById('im-b');
  const opBox = document.getElementById('im-op'), qBox = document.getElementById('im-query');
  const table = document.getElementById('im-table'), out = document.getElementById('im-out');
  let op = 'AND';
  fillSelect(selA, TERMS, 'wedding'); fillSelect(selB, TERMS, 'kills');
  pills(opBox, Object.keys(OPS).map(k => [k, k]), op, k => { op = k; render(); });

  const nnz = MATRIX.flat().filter(v => v > 0).length;
  const bits = (t) => MATRIX[TERMS.indexOf(t)].map(v => (v > 0 ? 1 : 0));

  // the full 83 x 14 table, built once
  table.innerHTML = `<thead><tr><th>term</th>${HEADLINES.map((_, j) => `<th>${j}</th>`).join('')}</tr></thead><tbody>` +
    TERMS.map((t, i) => `<tr data-t="${esc(t)}"><th title="Use as first term">${esc(t)}</th>${MATRIX[i].map(v => `<td class="${v ? 'on' : ''}">${v}</td>`).join('')}</tr>`).join('') + '</tbody>';
  table.querySelectorAll('tbody th').forEach(th => th.addEventListener('click', () => { selA.value = th.parentNode.dataset.t; render(); }));

  function render() {
    const a = selA.value, b = selB.value, va = bits(a), vb = bits(b);
    const res = va.map((x, j) => OPS[op](x, vb[j]));
    const row = (label, v, cls) => `<div class="bits-row ${cls}"><span class="bits-l">${esc(label)}</span>${v.map((x, j) => `<span class="bit${x ? ' one' : ''}${res[j] ? ' hit' : ''}">${x}</span>`).join('')}</div>`;
    qBox.innerHTML = `<div class="bits-row head"><span class="bits-l">doc</span>${HEADLINES.map((_, j) => `<span class="bit">${j}</span>`).join('')}</div>` +
      row(a, va, '') + row((op === 'AND NOT' ? 'NOT ' : '') + b, op === 'AND NOT' ? vb.map(x => 1 - x) : vb, '') + row(`${a} ${op} ${b}`, res, 'res');
    table.querySelectorAll('tbody tr').forEach(tr => tr.classList.toggle('sel', tr.dataset.t === a || tr.dataset.t === b));
    table.querySelectorAll('tr').forEach(tr => [...tr.children].forEach((c, j) => c.classList.toggle('col', j > 0 && res[j - 1] === 1)));
    const hits = res.map((x, j) => (x ? j : -1)).filter(j => j >= 0);
    out.innerHTML = `<p class="big"><b>${esc(a)} ${op} ${esc(b)}</b> → ${hits.length ? hits.length + ' document' + (hits.length > 1 ? 's' : '') : 'no documents'}</p>` +
      (hits.length ? '<ul class="im-hits">' + hits.map(j => `<li><b>${j}</b> ${esc(HEADLINES[j])}</li>`).join('') + '</ul>' : '') +
      `<p class="note">Matrix: ${TERMS.length} × ${HEADLINES.length} = ${(TERMS.length * HEADLINES.length).toLocaleString('en')} cells, only <b>${nnz}</b> non-zero (${(100 * nnz / (TERMS.length * HEADLINES.length)).toFixed(1)}%). Click a term in the table to use it as the first term.</p>`;
  }
  selA.addEventListener('change', render); selB.addEventListener('change', render);
  render();
}

/* ---------- from an incidence row to a postings list ---------- */
function initPostingsFig() {
  const svg = document.getElementById('pl-svg'), out = document.getElementById('pl-out');
  const box = document.getElementById('pl-pick'), sel = document.getElementById('pl-sel');
  let term = 'in';
  const quick = ['in', 'the', 'killed', 'kills', 'wedding', 'at', 'dead'];
  pills(box, quick.map(t => [t, t]), term, t => { term = t; sel.value = t; render(); });
  fillSelect(sel, TERMS, term);
  sel.addEventListener('change', () => { term = sel.value; box.querySelectorAll('.strat-btn').forEach(b => b.classList.toggle('active', b.dataset.k === term)); render(); });
  const nnz = MATRIX.flat().filter(v => v > 0).length;

  function render() {
    svg.innerHTML = '';
    const row = MATRIX[TERMS.indexOf(term)];
    const post = row.map((v, j) => [j, v]).filter(([, v]) => v > 0);
    const x0 = 116, cw = 44;
    txt(svg, 10, 52, 'matrix row', 'lbl');
    row.forEach((v, j) => {
      txt(svg, x0 + j * cw + cw / 2, 22, j, 'tick', 'middle');
      el('rect', { x: x0 + j * cw + 2, y: 30, width: cw - 4, height: 34, rx: 6, class: 'pl-cell' + (v ? ' on' : '') }, svg);
      txt(svg, x0 + j * cw + cw / 2, 53, v, 'pl-v' + (v ? ' on' : ''), 'middle');
    });
    // dictionary entry + postings list
    const y = 168;
    txt(svg, 10, y - 18, 'dictionary', 'lbl');
    el('rect', { x: 10, y, width: 150, height: 46, rx: 8, class: 'pl-dict' }, svg);
    el('line', { x1: 112, y1: y, x2: 112, y2: y + 46, class: 'pl-sep' }, svg);
    txt(svg, 61, y + 29, term.length > 11 ? term.slice(0, 10) + '…' : term, 'pl-term', 'middle');
    txt(svg, 136, y + 29, post.length, 'pl-df', 'middle');
    txt(svg, 136, y + 62, 'df', 'tick', 'middle');
    txt(svg, 210, y - 18, 'postings (doc_id, tf)', 'lbl');
    let px = 160;
    post.forEach(([j, v], k) => {
      const nx = 210 + k * 96;
      el('line', { x1: px, y1: y + 23, x2: nx - 6, y2: y + 23, class: 'pl-arrow' }, svg);
      el('path', { d: `M${nx - 6} ${y + 18} L${nx} ${y + 23} L${nx - 6} ${y + 28} Z`, class: 'pl-head' }, svg);
      el('line', { x1: x0 + j * cw + cw / 2, y1: 64, x2: nx + 30, y2: y, class: 'pl-link' }, svg);
      el('rect', { x: nx, y, width: 60, height: 46, rx: 8, class: 'pl-node' }, svg);
      txt(svg, nx + 30, y + 22, j, 'pl-id', 'middle');
      txt(svg, nx + 30, y + 38, 'tf ' + v, 'tick', 'middle');
      px = nx + 60;
    });
    txt(svg, px + 10, y + 28, '∅', 'lbl');
    const hl = (h) => esc(h).replace(new RegExp(`(^|[^\\p{L}])(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}])`, 'giu'), '$1<mark>$2</mark>');
    out.innerHTML = `<p class="big">The row stores <b>14</b> numbers; the postings list stores <b>${post.length}</b>. Over the whole collection: ${(TERMS.length * HEADLINES.length).toLocaleString('en')} matrix cells vs <b>${nnz}</b> postings.</p>` +
      '<ul class="im-hits">' + post.map(([j]) => `<li><b>${j}</b> ${hl(HEADLINES[j])}</li>`).join('') + '</ul>';
  }
  render();
}

/* ---------- preprocess_document ---------- */
const PP_PRESETS = {
  nb: 'US wedding limousine crash kills 20. Kanye West, deletes social media profiles!',
  post: 'Newsgroups: sci.electronics\nPath: cantaloupe.srv.cs.cmu.edu!crabapple.srv.cs.cmu.edu!fs7.ece.cmu.edu\nFrom: et@teal.csn.org (Eric H. Taylor)\nSubject: Re: electronic tesla coils',
  quirk: 'Wait... what?! (really) Tesla coils -- 23:12 (EST) ()',
};
function initPreprocess() {
  const inp = document.getElementById('pp-in'), out = document.getElementById('pp-out');
  pills(document.getElementById('pp-presets'), [['nb', 'Notebook example'], ['post', 'Newsgroup header'], ['quirk', 'Punctuation quirks']], 'nb', k => { inp.value = PP_PRESETS[k]; render(); });
  inp.value = PP_PRESETS.nb;
  function render() {
    const sents = sentTokenize(inp.value);
    const raw = sents.flatMap(s => tweetTokenize(s));
    const toks = preprocess(inp.value);
    out.innerHTML = `
      <div class="ii-step"><span class="ii-step-l">sent_tokenize</span><div>${sents.map((s, i) => `<p class="tk-raw"><b>${i}</b> ${esc(s)}</p>`).join('') || '<p class="tk-raw">—</p>'}</div></div>
      <div class="ii-step"><span class="ii-step-l">tokenize</span><div class="chip-row">${chipsHtml(raw)}</div></div>
      <div class="ii-step"><span class="ii-step-l">drop punctuation, lower</span><div class="chip-row">${chipsHtml(toks, false)}</div></div>
      <p class="note"><b>${toks.length}</b> tokens (${raw.length - toks.length} punctuation tokens dropped).</p>`;
  }
  inp.addEventListener('input', render);
  render();
}

/* ---------- document frequencies of sci.crypt ---------- */
function initDf() {
  const DF = window.DF_SCICRYPT || (typeof DF_SCICRYPT !== 'undefined' ? DF_SCICRYPT : {});
  const entries = Object.entries(DF);
  const svg = document.getElementById('df-hist'), out = document.getElementById('df-out'), q = document.getElementById('df-q');
  const once = entries.filter(([, v]) => v === 1).length;
  document.getElementById('df-stats').innerHTML = [
    ['100', 'documents'], [entries.length.toLocaleString('en'), 'terms in the dictionary'],
    [once.toLocaleString('en'), `terms in 1 doc (${Math.round(100 * once / entries.length)}%)`],
    [entries.filter(([, v]) => v === 100).length, 'terms in all 100'],
  ].map(([n, l]) => `<div class="stat"><span class="n">${n}</span><span class="l">${l}</span></div>`).join('');

  const BINS = [[1, 1], [2, 2], [3, 3], [4, 5], [6, 10], [11, 25], [26, 50], [51, 99], [100, 100]];
  const counts = BINS.map(([lo, hi]) => entries.filter(([, v]) => v >= lo && v <= hi).length);
  let bin = null;
  const W = 460, H = 280, L = 48, R = 12, T = 16, B = 44;
  const ymax = Math.log10(4000), y = (c) => H - B - (c > 0 ? Math.log10(c) / ymax : 0) * (H - B - T);

  function drawHist() {
    svg.innerHTML = '';
    [1, 10, 100, 1000].forEach(v => { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, L - 6, y(v) + 4, v, 'tick', 'end'); });
    el('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, class: 'axis' }, svg);
    const bw = (W - L - R) / BINS.length;
    BINS.forEach(([lo, hi], i) => {
      const g = el('g', { class: 'df-bar' + (bin === i ? ' cur' : ''), tabindex: 0, role: 'button' }, svg);
      el('rect', { x: L + i * bw + 5, y: y(counts[i]), width: bw - 10, height: H - B - y(counts[i]), rx: 3 }, g);
      el('rect', { x: L + i * bw, y: T, width: bw, height: H - B - T, class: 'hit' }, g);
      txt(g, L + i * bw + bw / 2, y(counts[i]) - 5, counts[i].toLocaleString('en'), 'df-n', 'middle');
      txt(svg, L + i * bw + bw / 2, H - B + 16, lo === hi ? lo : `${lo}–${hi}`, 'tick', 'middle');
      const pick = () => { bin = i; q.value = ''; drawHist(); showBin(); };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    txt(svg, L + (W - L - R) / 2, H - 6, 'document frequency (df)', 'tick', 'middle');
    txt(svg, 12, T + (H - B - T) / 2, '# terms (log)', 'tick', 'middle', { transform: `rotate(-90 12 ${T + (H - B - T) / 2})` });
  }
  const list = (arr) => '<div class="chip-row df-list">' + arr.map(([t, v]) => `<span class="chip">${esc(t)} <b>${v}</b></span>`).join('') + '</div>';
  function showBin() {
    const [lo, hi] = BINS[bin];
    const inBin = entries.filter(([, v]) => v >= lo && v <= hi).sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]));
    out.innerHTML = `<p class="big"><b>${inBin.length.toLocaleString('en')}</b> terms with df ${lo === hi ? '= ' + lo : lo + '–' + hi}${inBin.length > 40 ? ' (first 40)' : ''}</p>` + list(inBin.slice(0, 40));
  }
  function showSearch() {
    const s = q.value.trim().toLowerCase();
    if (!s) { showDefault(); return; }
    bin = null; drawHist();
    const exact = DF[s];
    const near = entries.filter(([t]) => t !== s && t.includes(s)).sort((a, b) => b[1] - a[1]).slice(0, 18);
    out.innerHTML = (exact ? `<p class="big"><b>${esc(s)}</b>: df = <b>${exact}</b> of 100 documents</p>` : `<p class="big"><b>${esc(s)}</b> is not in the dictionary (df = 0)</p>`) +
      (near.length ? `<p class="note">Other terms containing "${esc(s)}":</p>` + list(near) : '');
  }
  function showDefault() {
    const sorted = [...entries].sort((a, b) => b[1] - a[1] || 0);
    out.innerHTML = `<p class="note"><code>Counter(df).most_common(10)</code></p>${list(sorted.slice(0, 10))}` +
      `<p class="note" style="margin-top:0.7rem;">Some topic words:</p>${list(['clipper', 'chip', 'encryption', 'key', 'escrow', 'government', 'nsa', 'des', 'pgp', 'rsa'].map(t => [t, DF[t]]))}`;
  }
  q.addEventListener('input', showSearch);
  drawHist(); showDefault();
}

/* ---------- index builder: pairs → sort → merge → split ---------- */
const MINI = [
  'The Walking Dead, actor dies aged 76',
  'Bull kills woman at French festival',
  'US wedding limousine crash kills 20',
  'Living dead: the dead return',          // invented, so that a term repeats inside a document
];
const miniListeners = [];
function buildIndex(docs) {
  const tokens = docs.map(preprocess);
  const pairs = tokens.flatMap((ts, i) => ts.map(t => [t, i]));
  const sorted = pairs.map((p, k) => [p, k]).sort((a, b) => cmp(a[0][0], b[0][0]) || a[1] - b[1]).map(x => x[0]);  // stable sort by token
  const merged = [];
  sorted.forEach(([t, d]) => {
    const last = merged[merged.length - 1];
    if (last && last[0] === t && last[1] === d) last[2] += 1; else merged.push([t, d, 1]);
  });
  const dictionary = new Map(), postings = new Map();
  merged.forEach(([t, d, f]) => {
    const [df, tot] = dictionary.get(t) || [0, 0];
    dictionary.set(t, [df + 1, tot + f]);
    if (!postings.has(t)) postings.set(t, []);
    postings.get(t).push([d, f]);
  });
  return { tokens, pairs, sorted, merged, dictionary, postings };
}
function initBuilder() {
  const docsBox = document.getElementById('ib-docs'), out = document.getElementById('ib-out'), cap = document.getElementById('ib-cap');
  const stepBox = document.getElementById('ib-steps');
  const STEPS = [
    ['Tokens', 'preprocess_document on every document.'],
    ['Pairs', 'One (token, doc_id) pair per token, in document order.'],
    ['Sorted', 'sorted(token_docid, key=itemgetter(0)): pairs with the same token are now neighbours, doc ids still ascending.'],
    ['Merged', 'Equal neighbours collapse into (token, doc_id, term_freq).'],
    ['Dictionary + postings', 'dictionary[term] = (doc_freq, total_freq); postings[term] = [(doc_id, term_freq), …].'],
  ];
  let step = 0, sel = 'dead', idx;
  docsBox.innerHTML = MINI.map((d, i) => `<label><span>doc ${i}${i === 3 ? ' <i>(invented)</i>' : ''}</span><input class="ii-input" data-i="${i}" value="${esc(d)}" spellcheck="false"></label>`).join('');
  docsBox.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
    MINI[+inp.dataset.i] = inp.value; rebuild(); miniListeners.forEach(f => f());
  }));
  const setStep = (s) => { step = Math.max(0, Math.min(STEPS.length - 1, s)); pills(stepBox, STEPS.map((x, i) => [i, `${i + 1} · ${x[0]}`]), step, k => setStep(k)); render(); };
  document.getElementById('ib-prev').addEventListener('click', () => setStep(step - 1));
  document.getElementById('ib-next').addEventListener('click', () => setStep(step + 1));
  out.addEventListener('click', e => { const c = e.target.closest('[data-t]'); if (c) { sel = c.dataset.t === sel ? null : c.dataset.t; render(); } });

  const chip = (t, body, extra = '') => `<span class="chip ib-chip${t === sel ? ' cur' : ''}${extra}" data-t="${esc(t)}">${body}</span>`;
  function rebuild() { idx = buildIndex(MINI); render(); }
  function render() {
    cap.innerHTML = `<b>Step ${step + 1}.</b> ${esc(STEPS[step][1])}` + (sel ? ` Following <b>${esc(sel)}</b> (click it again to clear).` : ' Click a term to follow it.');
    document.getElementById('ib-prev').disabled = step === 0;
    document.getElementById('ib-next').disabled = step === STEPS.length - 1;
    if (step === 0) {
      out.innerHTML = idx.tokens.map((ts, i) => `<div class="ii-step"><span class="ii-step-l">doc ${i}</span><div class="chip-row">${ts.map(t => chip(t, esc(t))).join('')}</div></div>`).join('');
    } else if (step <= 3) {
      const arr = step === 1 ? idx.pairs : step === 2 ? idx.sorted : idx.merged;
      out.innerHTML = `<p class="note">${arr.length} ${step === 3 ? 'triples' : 'pairs'}</p><div class="chip-row ib-flow">` +
        arr.map(p => chip(p[0], `(${esc(p[0])}, ${p[1]}${step === 3 ? ', <b>' + p[2] + '</b>' : ''})`, step === 3 && p[2] > 1 ? ' tf2' : '')).join('') + '</div>';
    } else {
      const rows = [...idx.dictionary.entries()].map(([t, [df, tot]]) =>
        `<tr class="${t === sel ? 'sel' : ''}" data-t="${esc(t)}"><td><code>${esc(t)}</code></td><td>(${df}, ${tot})</td><td>${idx.postings.get(t).map(([d, f]) => `<span class="ib-post">${d}<small>tf ${f}</small></span>`).join('<span class="ib-arr">→</span>')}</td></tr>`).join('');
      out.innerHTML = `<p class="note">${idx.dictionary.size} terms, ${idx.merged.length} postings</p><div class="table-wrap ib-tw"><table class="summary ib-table"><thead><tr><th>term</th><th>(df, total)</th><th>postings</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
  }
  rebuild(); setStep(0);
}

/* ---------- merging two postings lists (AND / OR / AND NOT, skip pointers) ---------- */
const MG_PRESETS = {
  slide: { label: 'Slide example', na: 'living', nb: 'dead', a: [1, 2, 5, 17, 30, 31, 44, 45, 47], b: [5, 17, 44] },
  autos: { label: 'rec.autos output', na: 'living', nb: 'dead', a: [30, 36, 78], b: [29, 36, 65] },
  long: { label: 'Long list', na: 'term A', nb: 'term B', a: [2, 3, 5, 8, 9, 12, 14, 17, 19, 21, 24, 26, 29, 31, 33, 36, 39, 41, 43, 46], b: [30, 36, 44] },
};
function skipTable(L) {
  const s = Math.round(Math.sqrt(L.length)), sk = {};
  if (s < 2) return sk;
  for (let k = 0; k + s < L.length; k += s) sk[k] = k + s;
  return sk;
}
function mergeFrames(A, B, op, useSkips, na, nb) {
  const F = [], res = [];
  let i = 0, j = 0;
  const skA = useSkips ? skipTable(A) : {}, skB = useSkips ? skipTable(B) : {};
  const push = (msg, ci, cj, extra = {}) => F.push({ i, j, res: res.slice(), msg, ci, cj, ...extra });
  push('Start: one pointer at the head of each list.', -1, -1);
  if (op === 'AND') {
    while (i < A.length && j < B.length) {
      const a = A[i], b = B[j], ci = i, cj = j;
      if (a === b) { res.push(a); i++; j++; push(`${a} = ${b} → add ${a} to the result, advance both`, ci, cj, { hit: true }); }
      else if (a < b) {
        if (skA[i] !== undefined && A[skA[i]] <= b) { const t = skA[i]; i = t; push(`${a} < ${b} and skip target ${A[t]} ≤ ${b} → skip ${na} to ${A[t]}`, ci, cj, { skip: ['a', ci, t] }); }
        else { i++; push(`${a} < ${b} → advance ${na}` + (skA[ci] !== undefined ? ` (skip target ${A[skA[ci]]} > ${b}, cannot skip)` : ''), ci, cj); }
      } else {
        if (skB[j] !== undefined && B[skB[j]] <= a) { const t = skB[j]; j = t; push(`${a} > ${b} and skip target ${B[t]} ≤ ${a} → skip ${nb} to ${B[t]}`, ci, cj, { skip: ['b', cj, t] }); }
        else { j++; push(`${a} > ${b} → advance ${nb}` + (skB[cj] !== undefined ? ` (skip target ${B[skB[cj]]} > ${a}, cannot skip)` : ''), ci, cj); }
      }
    }
    push(`${i >= A.length ? na : nb} is exhausted → stop.`, -1, -1, { end: true });
  } else if (op === 'OR') {
    while (i < A.length || j < B.length) {
      const ci = i, cj = j;
      if (j >= B.length || (i < A.length && A[i] < B[j])) { res.push(A[i]); i++; push(j >= B.length ? `${nb} exhausted → add ${A[ci]}` : `${A[ci]} < ${B[cj]} → add ${A[ci]}, advance ${na}`, ci, j >= B.length ? -1 : cj); }
      else if (i >= A.length || B[j] < A[i]) { res.push(B[j]); j++; push(i >= A.length ? `${na} exhausted → add ${B[cj]}` : `${A[ci]} > ${B[cj]} → add ${B[cj]}, advance ${nb}`, i >= A.length ? -1 : ci, cj); }
      else { res.push(A[i]); i++; j++; push(`${A[ci]} = ${B[cj]} → add ${A[ci]} once, advance both`, ci, cj, { hit: true }); }
    }
    push('Both lists are exhausted → stop.', -1, -1, { end: true });
  } else {
    while (i < A.length) {
      const ci = i, cj = j;
      if (j < B.length && B[j] < A[i]) { j++; push(`${A[ci]} > ${B[cj]} → advance ${nb}`, ci, cj); }
      else if (j < B.length && B[j] === A[i]) { i++; j++; push(`${A[ci]} = ${B[cj]} → ${A[ci]} contains ${nb}, drop it, advance both`, ci, cj, { drop: true }); }
      else { res.push(A[i]); i++; push(j < B.length ? `${A[ci]} < ${B[cj]} → ${A[ci]} is not in ${nb}, add it` : `${nb} exhausted → add ${A[ci]}`, ci, j < B.length ? cj : -1); }
    }
    push(`${na} is exhausted → stop.`, -1, -1, { end: true });
  }
  return F;
}
function initMerge() {
  const svg = document.getElementById('mg-svg'), log = document.getElementById('mg-log'), out = document.getElementById('mg-out');
  const inA = document.getElementById('mg-a'), inB = document.getElementById('mg-b'), skipCb = document.getElementById('mg-skip');
  const playBtn = document.getElementById('mg-play');
  let preset = 'slide', op = 'AND', na = 'living', nb = 'dead', A = [], B = [], F = [], k = 0, timer = null;

  pills(document.getElementById('mg-preset'), Object.entries(MG_PRESETS).map(([key, p]) => [key, p.label]), preset, key => loadPreset(key));
  pills(document.getElementById('mg-op'), [['AND', 'AND'], ['OR', 'OR'], ['AND NOT', 'AND NOT']], op, o => { op = o; recompute(); });
  const parse = (s) => [...new Set(s.split(/[^0-9]+/).filter(Boolean).map(Number))].sort((x, y) => x - y).slice(0, 30);

  function loadPreset(key) {
    const p = MG_PRESETS[key]; preset = key; na = p.na; nb = p.nb;
    inA.value = p.a.join(', '); inB.value = p.b.join(', ');
    document.getElementById('mg-na').textContent = na; document.getElementById('mg-nb').textContent = nb;
    recompute();
  }
  function recompute() {
    stop();
    A = parse(inA.value); B = parse(inB.value);
    skipCb.disabled = op !== 'AND';
    F = mergeFrames(A, B, op, skipCb.checked && op === 'AND', na, nb);
    k = 0; render();
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } playBtn.textContent = '▶'; }
  function go(n) { k = Math.max(0, Math.min(F.length - 1, n)); render(); }
  document.getElementById('mg-prev').addEventListener('click', () => { stop(); go(k - 1); });
  document.getElementById('mg-next').addEventListener('click', () => { stop(); go(k + 1); });
  document.getElementById('mg-reset').addEventListener('click', () => { stop(); go(0); });
  playBtn.addEventListener('click', () => {
    if (timer) { stop(); return; }
    if (k >= F.length - 1) k = 0;
    playBtn.textContent = '⏸';
    timer = setInterval(() => { if (k >= F.length - 1) stop(); else go(k + 1); }, 750);
  });
  [inA, inB].forEach(x => x.addEventListener('change', recompute));
  skipCb.addEventListener('change', recompute);

  function drawList(L, yRow, name, ptr, cmpIdx, sk, fr, side) {
    const x0 = 104, pw = 46;
    txt(svg, 10, yRow + 24, name, 'lbl');
    Object.entries(sk).forEach(([from, to]) => {
      const x1 = x0 + from * pw + 20, x2 = x0 + to * pw + 20, used = fr.skip && fr.skip[0] === side && fr.skip[1] === +from;
      el('path', { d: `M${x1} ${yRow} C ${x1} ${yRow - 26}, ${x2} ${yRow - 26}, ${x2} ${yRow}`, class: 'mg-skip' + (used ? ' used' : '') }, svg);
    });
    L.forEach((v, n) => {
      const inRes = fr.res.includes(v) && (op !== 'AND NOT' || side === 'a');
      const cls = 'mg-cell' + (n < ptr ? ' done' : '') + (n === cmpIdx ? ' cmp' : '') + (inRes ? ' hit' : '');
      el('rect', { x: x0 + n * pw, y: yRow + 4, width: 40, height: 32, rx: 7, class: cls }, svg);
      txt(svg, x0 + n * pw + 20, yRow + 25, v, 'mg-v' + (n < ptr && !inRes ? ' done' : ''), 'middle');
    });
    if (ptr < L.length) {
      const px = x0 + ptr * pw + 20;
      el('path', { d: `M${px - 7} ${yRow + 50} L${px + 7} ${yRow + 50} L${px} ${yRow + 40} Z`, class: 'mg-ptr' }, svg);
    }
  }
  function render() {
    const fr = F[k];
    const n = Math.max(A.length, B.length, fr.res.length, 9);
    const W = Math.max(620, 124 + n * 46);
    svg.setAttribute('viewBox', `0 0 ${W} 250`);
    svg.innerHTML = '';
    const useSk = skipCb.checked && op === 'AND';
    drawList(A, 34, na, fr.i, fr.ci, useSk ? skipTable(A) : {}, fr, 'a');
    drawList(B, 118, nb, fr.j, fr.cj, useSk ? skipTable(B) : {}, fr, 'b');
    txt(svg, 10, 222, 'result', 'lbl');
    fr.res.forEach((v, m) => {
      el('rect', { x: 104 + m * 46, y: 198, width: 40, height: 32, rx: 7, class: 'mg-cell res' }, svg);
      txt(svg, 104 + m * 46 + 20, 219, v, 'mg-v', 'middle');
    });
    log.innerHTML = F.slice(1, k + 1).map((f, m) => `<p class="${m === k - 1 ? 'current' : ''}${f.end ? ' win' : ''}">${m + 1}. ${esc(f.msg)}</p>`).join('') || '<p>Press ⏭ or ▶ to start.</p>';
    log.scrollTop = log.scrollHeight;
    const steps = F.length - 2, done = Math.min(k, steps);
    const skips = F.filter(f => f.skip).length;
    out.innerHTML = `<p class="big"><b>${esc(na)} ${op} ${esc(nb)}</b> = [${fr.res.join(', ')}]${fr.end ? '' : ' …'}</p>` +
      `<p>Comparison steps: <b>${done}</b> of ${steps}` + (useSk ? ` (${skips} skip${skips === 1 ? '' : 's'})` : '') + `</p>` +
      `<p class="note">Lengths x = ${A.length}, y = ${B.length}, so at most x + y = ${A.length + B.length} steps.` +
      (useSk ? ` Skip span \\(\\sqrt{L}\\): ${Math.round(Math.sqrt(A.length))} on ${esc(na)}, ${Math.round(Math.sqrt(B.length)) >= 2 ? Math.round(Math.sqrt(B.length)) : 'none'} on ${esc(nb)}.` : '') + '</p>';
    if (window.renderMathInElement) renderMathInElement(out, { delimiters: [{ left: '\\(', right: '\\)', display: false }], throwOnError: false });
    document.getElementById('mg-prev').disabled = k === 0;
    document.getElementById('mg-next').disabled = k === F.length - 1;
  }
  loadPreset('slide');
}

/* ---------- query planner: order by increasing df ---------- */
function initPlanner() {
  const DF = typeof DF_SCICRYPT !== 'undefined' ? DF_SCICRYPT : {};
  const inp = document.getElementById('qp-in'), svg = document.getElementById('qp-svg'), out = document.getElementById('qp-out');
  inp.value = 'the AND key AND nsa AND clipper';
  function caps(order) { let c = Infinity; return order.map(([, d]) => (c = Math.min(c, d))); }
  function work(order) { let cap = order.length ? order[0][1] : 0, w = 0; order.slice(1).forEach(([, d]) => { w += cap + d; cap = Math.min(cap, d); }); return w; }
  function render() {
    const terms = inp.value.split(/\s+/).filter(t => t && t !== 'AND').map(t => t.toLowerCase());
    const typed = terms.map(t => [t, DF[t] || 0]);
    const best = [...typed].sort((a, b) => a[1] - b[1]);
    const cT = caps(typed), cB = caps(best);
    svg.innerHTML = '';
    const W = 460, H = 250, L = 40, R = 10, T = 14, B = 40, ymax = 100;
    const y = (v) => H - B - (v / ymax) * (H - B - T);
    [0, 25, 50, 75, 100].forEach(v => { el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid-line' }, svg); txt(svg, L - 6, y(v) + 4, v, 'tick', 'end'); });
    el('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, class: 'axis' }, svg);
    const n = Math.max(terms.length, 1), gw = (W - L - R) / n;
    cT.forEach((c, i) => {
      const x = L + i * gw, bw = Math.min(40, gw / 2 - 8);
      el('rect', { x: x + gw / 2 - bw - 2, y: y(c), width: bw, height: H - B - y(c), rx: 3, class: 'qp-typed' }, svg);
      el('rect', { x: x + gw / 2 + 2, y: y(cB[i]), width: bw, height: H - B - y(cB[i]), rx: 3, class: 'qp-best' }, svg);
      txt(svg, x + gw / 2 - bw / 2 - 2, y(c) - 4, c, 'df-n', 'middle');
      txt(svg, x + gw / 2 + bw / 2 + 2, y(cB[i]) - 4, cB[i], 'df-n', 'middle');
      txt(svg, x + gw / 2, H - B + 16, i === 0 ? 'first list' : `after ${i + 1} terms`, 'tick', 'middle');
    });
    txt(svg, L + (W - L - R) / 2, H - 6, 'max. size of the intermediate result', 'tick', 'middle');
    const fmt = (o) => o.map(([t, d]) => `${esc(t)} <span class="qp-df">${d}</span>`).join(' → ');
    const zero = typed.find(([, d]) => d === 0);
    out.innerHTML = terms.length < 2 ? '<p class="note">Type at least two terms.</p>' :
      `<p><b>As typed</b>: ${fmt(typed)}</p><p><b>Increasing df</b>: ${fmt(best)}</p>` +
      (zero ? `<p class="big"><b>${esc(zero[0])}</b> has df 0 → the answer is empty; with df order we stop before reading any postings.</p>` :
        `<p class="big">The answer has at most <b>${cB[0]}</b> documents (the smallest df).</p>`) +
      `<p class="note">Postings read, upper bound: ${work(typed)} as typed vs ${work(best)} in df order (each merge reads the current result plus the next list).</p>`;
  }
  inp.addEventListener('input', render);
  render();
}

/* ---------- phrase and proximity queries on the mini corpus ---------- */
function initPhrase() {
  const q = document.getElementById('ph-q'), docsBox = document.getElementById('ph-docs'), out = document.getElementById('ph-out');
  const kS = document.getElementById('ph-k'), kRow = document.getElementById('ph-k-row');
  let mode = 'pos';
  q.value = 'the dead';
  pills(document.getElementById('ph-mode'), [['and', 'Boolean AND'], ['biword', 'Bi-word index'], ['pos', 'Positional (phrase)'], ['prox', 'Proximity /k']], mode, m => { mode = m; render(); });
  function render() {
    kRow.classList.toggle('show', mode === 'prox');
    const k = +kS.value; document.getElementById('ph-k-val').textContent = k;
    const docs = MINI.map(preprocess);
    const terms = preprocess(q.value);
    const pos = (t, d) => docs[d].map((x, p) => (x === t ? p : -1)).filter(p => p >= 0);
    const spans = docs.map(() => new Set());
    let hits = [], explain = '';
    if (!terms.length) { out.innerHTML = '<p class="note">Type a query.</p>'; docsBox.innerHTML = ''; return; }
    const index = terms.filter((t, i) => terms.indexOf(t) === i).map(t => `<p><code>${esc(t)}</code>: ${docs.map((_, d) => pos(t, d)).map((ps, d) => (ps.length ? `doc ${d} → [${ps.join(', ')}]` : '')).filter(Boolean).join('; ') || '—'}</p>`).join('');
    if (mode === 'and') {
      hits = docs.map((_, d) => d).filter(d => terms.every(t => pos(t, d).length));
      hits.forEach(d => terms.forEach(t => pos(t, d).forEach(p => spans[d].add(p))));
      explain = `<p class="note">Intersect the postings of ${terms.map(t => `<code>${esc(t)}</code>`).join(', ')}; word order and distance are ignored.</p>`;
    } else if (mode === 'biword') {
      const bi = terms.length === 1 ? [terms[0]] : terms.slice(0, -1).map((t, i) => t + ' ' + terms[i + 1]);
      const biPost = (b) => docs.map((ts, d) => (b.includes(' ') ? ts.slice(0, -1).some((t, p) => t + ' ' + ts[p + 1] === b) : ts.includes(b)) ? d : -1).filter(d => d >= 0);
      hits = docs.map((_, d) => d).filter(d => bi.every(b => biPost(b).includes(d)));
      hits.forEach(d => docs[d].forEach((t, p) => { if (bi.some(b => b === t + ' ' + docs[d][p + 1])) { spans[d].add(p); spans[d].add(p + 1); } }));
      explain = `<p class="note">Bi-word terms looked up: ${bi.map(b => `<code>${esc(b)}</code> → [${biPost(b).join(', ')}]`).join('; ')}.` + (bi.length > 1 ? ' For longer phrases the bi-words are ANDed, which can give false positives: the bi-words may occur in different places.' : '') + '</p>';
    } else if (mode === 'pos') {
      docs.forEach((ts, d) => ts.forEach((_, p) => { if (terms.every((t, i) => ts[p + i] === t)) { hits.push(d); terms.forEach((_, i) => spans[d].add(p + i)); } }));
      hits = [...new Set(hits)];
      explain = `<p class="note">A document matches if <code>${esc(terms[0])}</code> is at some position \\(p\\) and each next query word at \\(p+1, p+2, \\dots\\)</p>`;
    } else {
      if (terms.length !== 2) { explain = '<p class="note">Proximity here takes a query of two words.</p>'; }
      else {
        const [a, b] = terms;
        docs.forEach((_, d) => pos(a, d).forEach(pa => pos(b, d).forEach(pb => { if (pa !== pb && Math.abs(pa - pb) <= k) { hits.push(d); spans[d].add(pa); spans[d].add(pb); } })));
        hits = [...new Set(hits)];
        explain = `<p class="note"><code>${esc(a)} /${k} ${esc(b)}</code>: positions at most ${k} apart, in either order.</p>`;
      }
    }
    docsBox.innerHTML = docs.map((ts, d) => `<div class="ph-doc${hits.includes(d) ? ' hit' : ''}"><span class="ph-id">doc ${d}</span>${ts.map((t, p) => `<span class="ph-tok${terms.includes(t) ? ' q' : ''}${spans[d].has(p) && hits.includes(d) ? ' m' : ''}">${esc(t)}<sub>${p}</sub></span>`).join('')}</div>`).join('');
    out.innerHTML = `<p class="big">Result: <b>${hits.length ? '[' + hits.sort((x, y) => x - y).join(', ') + ']' : 'no documents'}</b></p>${explain}<p class="note" style="margin-top:0.6rem;">Positional index for the query terms:</p>${index}`;
    if (window.renderMathInElement) renderMathInElement(out, { delimiters: [{ left: '\\(', right: '\\)', display: false }], throwOnError: false });
  }
  q.addEventListener('input', render); kS.addEventListener('input', render);
  miniListeners.push(render);
  render();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initTokenize();
  initIncidence();
  initPostingsFig();
  initPreprocess();
  initDf();
  initBuilder();
  initMerge();
  initPlanner();
  initPhrase();
});

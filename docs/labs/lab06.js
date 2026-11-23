/* ===== Lab 06 interactivity ===== */

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


/* ====================== URLs (pure: used by the simulator and the normalizer) ====================== */
const URL_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/;
function splitUrl(u) {
  const m = URL_RE.exec(u);
  return m ? { scheme: m[1], host: m[2], path: m[3], query: m[4] || '', frag: m[5] || '' } : null;
}
const joinUrl = (p) => `${p.scheme}://${p.host}${p.path}${p.query}${p.frag}`;
// resolve a link against the page it was found on, keeping "./" and "../" as written (like string concatenation)
function resolveRaw(base, href) {
  href = href.trim();
  const b = splitUrl(base);
  if (!b || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) return href;
  if (href.startsWith('//')) return b.scheme + ':' + href;
  if (href.startsWith('/')) return `${b.scheme}://${b.host}${href}`;
  if (href.startsWith('?')) return `${b.scheme}://${b.host}${b.path || '/'}${href}`;
  if (href.startsWith('#')) return `${b.scheme}://${b.host}${b.path}${b.query}${href}`;
  const dir = (b.path || '/').replace(/[^/]*$/, '');
  return `${b.scheme}://${b.host}${dir}${href}`;
}
// RFC 3986, 5.2.4
function removeDotSegments(path) {
  const out = []; const segs = path.split('/');
  segs.forEach((s, i) => {
    if (s === '..') { if (out.length > 1) out.pop(); if (i === segs.length - 1) out.push(''); }
    else if (s === '.') { if (i === segs.length - 1) out.push(''); }
    else out.push(s);
  });
  let r = out.join('/');
  if (path.startsWith('/') && !r.startsWith('/')) r = '/' + r;
  return r;
}
// conservative normalization, step by step; opts: slash, utm, sort (the unsafe ones)
function normalizeSteps(base, href, opts = {}) {
  const steps = [];
  let u = resolveRaw(base, href);
  steps.push(['resolve the relative URL against the page', u]);
  let p = splitUrl(u);
  if (!p) return { steps, url: u, bad: true };
  p.scheme = p.scheme.toLowerCase(); p.host = p.host.toLowerCase();
  steps.push(['lowercase the scheme and hostname', joinUrl(p)]);
  if ((p.scheme === 'https' && /:443$/.test(p.host)) || (p.scheme === 'http' && /:80$/.test(p.host))) p.host = p.host.replace(/:\d+$/, '');
  steps.push(['remove the default port', joinUrl(p)]);
  p.frag = '';
  steps.push(['remove the #fragment', joinUrl(p)]);
  p.path = removeDotSegments(p.path) || '/';
  steps.push(['normalize path components (. and ..)', joinUrl(p)]);
  if (opts.slash) { if (p.path.length > 1) p.path = p.path.replace(/\/+$/, '') || '/'; steps.push(['drop the trailing slash', joinUrl(p), 1]); }
  const params = () => p.query ? p.query.slice(1).split('&').filter(Boolean) : [];
  if (opts.utm) { const q = params().filter(kv => !/^utm_/i.test(kv)); p.query = q.length ? '?' + q.join('&') : ''; steps.push(['drop utm_* tracking parameters', joinUrl(p), 1]); }
  if (opts.sort) { const q = params().sort(); p.query = q.length ? '?' + q.join('&') : ''; steps.push(['sort the query parameters', joinUrl(p), 1]); }
  return { steps, url: joinUrl(p) };
}
const canon = (u) => normalizeSteps(u, u).url;


/* ====================== crawl simulator model (pure) ====================== */
const EX_HOST = 'https://example.org';
const EX_PAGES = {
  '/': { name: 'Home', links: ['/about', '/calendar?year=2026', '/courses', '/people', '/private/admin'] },
  '/about': { name: 'About', links: ['/', 'https://EXAMPLE.org/', '/people/../about'] },
  '/courses': { name: 'Courses', links: ['/courses/ir', '/courses/ai', '/courses?print=1', '/courses#fall'] },
  '/courses?print=1': { name: 'Print copy', content: '/courses', links: ['/courses/ir', '/courses/ai'] },
  '/courses/ir': { name: 'IR course', links: ['/courses', '/courses/ir#labs', '/people/ana'] },
  '/courses/ai': { name: 'AI course', links: ['/courses', '/people/boris'] },
  '/people': { name: 'People', links: ['/people/ana', '/people/boris', '/'] },
  '/people/ana': { name: 'Ana', links: ['/courses/ir', '/people'] },
  '/people/boris': { name: 'Boris', links: ['/courses/ai', '/people'] },
  '/private/admin': { name: 'Private', links: [] },
};
const EX_REAL = ['/', '/about', '/courses', '/courses/ir', '/courses/ai', '/people', '/people/ana', '/people/boris'];
const TOY = { A: ['B', 'E'], B: ['C'], C: ['D'], D: [], E: [] };

function exKey(url) { const p = splitUrl(canon(url)); return p ? p.path + p.query : url; }
function exPage(key) {
  const m = /^\/calendar\?year=(\d+)$/.exec(key);
  if (m) return { name: 'Calendar ' + m[1], node: 'cal', links: [`/calendar?year=${+m[1] + 1}`, '/'] };
  return EX_PAGES[key] ? { ...EX_PAGES[key], node: key } : null;
}
const robotsBlocks = (url) => /^\/private\//.test((splitUrl(url) || {}).path || '');

// returns one snapshot per loop iteration (a popped URL), starting with the initial state
function simulateCrawl(o) {
  const toy = o.site === 'toy';
  const seed = toy ? 'A' : EX_HOST + '/';
  let frontier = [seed];
  const visited = new Set(), contents = new Map(), qvar = new Map();
  const fetches = {}, status = {}, order = [];
  const st = { fetch: 0, stored: 0, waste: 0, bad: 0, real: new Set() };
  const snaps = [];
  const snap = (log, cls, cur) => snaps.push({ frontier: frontier.slice(), fetches: { ...fetches }, status: { ...status }, order: order.slice(), cur, log, cls, stats: { fetch: st.fetch, stored: st.stored, waste: st.waste, bad: st.bad, real: st.real.size } });
  snap(`start: the frontier holds the seed ${short(seed)}`, 'iter', null);
  const budget = toy ? 99 : o.max;
  while (frontier.length && st.fetch < budget) {
    const url = o.pol === 'bfs' ? frontier.shift() : frontier.pop();
    const key = toy ? url : (o.norm ? canon(url) : url);
    if (visited.has(key)) { snap(`skip ${short(url)}: already visited`, 'skip', null); continue; }
    if (toy) {
      visited.add(key); st.fetch++; st.stored++; order.push(url); fetches[url] = 1; status[url] = 'stored'; st.real.add(url);
      const links = TOY[url];
      (o.pol === 'bfs' ? links : links.slice().reverse()).forEach(l => frontier.push(l));
      snap(`fetch ${url}: ${links.length ? 'push ' + links.join(', ') : 'no links'}`, 'fetch', url);
      continue;
    }
    const pk = exKey(url), page = exPage(pk);
    if (o.rob && robotsBlocks(url)) { snap(`skip ${short(url)}: robots.txt disallows /private/`, 'skip', null); continue; }
    const qm = /^([^?]*)\?/.exec(pk);
    if (o.trap && qm) {
      const n = qvar.get(qm[1]) || new Set();
      if (!n.has(pk) && n.size >= 3) { snap(`skip ${short(url)}: already 3 query variants of ${qm[1]}`, 'skip', null); continue; }
      n.add(pk); qvar.set(qm[1], n);
    }
    visited.add(key); st.fetch++;
    const node = page ? page.node : pk;
    fetches[node] = (fetches[node] || 0) + 1;
    if (!page) { snap(`fetch ${short(url)}: 404 not found`, 'waste', node); st.waste++; continue; }
    const content = page.content || pk;
    let verdict, cls;
    if (robotsBlocks(url)) { st.bad++; status[node] = 'bad'; verdict = 'fetched a page robots.txt disallows'; cls = 'bad'; }
    else if (contents.has(content)) {
      st.waste++; if (!status[node]) status[node] = 'waste';
      if (o.dup) { snap(`fetch ${short(url)}: same fingerprint as ${short(contents.get(content))}, not stored, links not followed`, 'waste', node); continue; }
      verdict = `stored again: duplicate of ${short(contents.get(content))}`; cls = 'waste';
    } else if (node === 'cal' && (fetches.cal || 0) > 3) { st.waste++; st.stored++; status[node] = 'trap'; verdict = 'stored, but it is the crawl trap'; cls = 'waste'; }
    else { st.stored++; if (status[node] !== 'bad') status[node] = 'stored'; if (EX_REAL.includes(content)) st.real.add(content); verdict = 'stored'; cls = 'fetch'; }
    if (!contents.has(content)) contents.set(content, url);
    const links = page.links.map(h => { const r = resolveRaw(url, h); return o.norm ? canon(r) : r; });
    (o.pol === 'bfs' ? links : links.slice().reverse()).forEach(l => frontier.push(l));
    snap(`fetch ${short(url)}: ${verdict}, +${links.length} links`, cls, node);
  }
  const why = !frontier.length ? 'frontier empty' : `fetch budget of ${budget} used up, ${frontier.length} URLs left`;
  snaps[snaps.length - 1].end = why;
  return snaps;
}
function short(u) {
  if (!u.includes('://')) return u;
  return u.startsWith(EX_HOST) ? (u.slice(EX_HOST.length) || '/') : u.replace(/^https?:\/\//, '');
}


/* ====================== robots.txt (pure) ====================== */
function parseRobots(text) {
  const groups = []; let g = null, lastUA = false;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) return;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') { if (!lastUA || !g) { g = { agents: [], rules: [] }; groups.push(g); } g.agents.push(v); lastUA = true; }
    else if (k === 'allow' || k === 'disallow') { lastUA = false; if (g) g.rules.push({ allow: k === 'allow', path: v, line: i + 1, text: line }); }
    else lastUA = false;
  });
  return groups;
}
const robotsPattern = (p) => new RegExp('^' + p.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\?\$$/, '$').replace(/\$(?!$)/g, '\\$'));
// RFC 9309: matching groups by product token, longest match, Allow wins ties
function rfcAllowed(groups, ua, path) {
  if (path === '/robots.txt') return { ok: true, why: '/robots.txt is always allowed' };
  const token = (ua.split(/[\/\s]/)[0] || '').toLowerCase();
  let gs = groups.filter(g => g.agents.some(a => a.toLowerCase() === token));
  let who = token;
  if (!gs.length) { gs = groups.filter(g => g.agents.includes('*')); who = '*'; }
  if (!gs.length) return { ok: true, why: 'no group applies' };
  let best = null;
  gs.forEach(g => g.rules.forEach(r => {
    if (!r.path) return;
    if (!robotsPattern(r.path).test(path)) return;
    const len = r.path.length;
    if (!best || len > best.path.length || (len === best.path.length && r.allow && !best.allow)) best = r;
  }));
  if (!best) return { ok: true, why: `group ${who}: no rule matches` };
  return { ok: best.allow, why: `line ${best.line}: ${best.text}` };
}
// CPython urllib.robotparser: first matching group, then first matching rule in file order, plain prefixes
function pyAllowed(text, ua, path) {
  const entries = []; let def = null, e = { agents: [], rules: [] }, state = 0;
  const add = (x) => { if (x.agents.includes('*')) { if (!def) def = x; } else entries.push(x); };
  text.split(/\r?\n/).forEach((raw, i) => {
    let line = raw;
    if (!line.trim()) { if (state === 1) { e = { agents: [], rules: [] }; state = 0; } else if (state === 2) { add(e); e = { agents: [], rules: [] }; state = 0; } return; }
    line = line.replace(/#.*$/, '').trim();
    const c = line.indexOf(':'); if (c < 0) return;
    const k = line.slice(0, c).trim().toLowerCase(), v = line.slice(c + 1).trim();
    if (k === 'user-agent') { if (state === 2) { add(e); e = { agents: [], rules: [] }; } e.agents.push(v); state = 1; }
    else if ((k === 'allow' || k === 'disallow') && state !== 0) { e.rules.push({ allow: k === 'allow' || v === '', path: v, line: i + 1, text: line }); state = 2; }
  });
  if (state === 2) add(e);
  const u = ua.split('/')[0].toLowerCase();
  const applies = (x) => x.agents.some(a => a === '*' || u.includes(a.toLowerCase()));
  const allowance = (x) => { const r = x.rules.find(r => r.path === '*' || path.startsWith(r.path)); return r ? { ok: r.allow, why: `line ${r.line}: ${r.text}` } : { ok: true, why: 'no rule matches' }; };
  for (const x of entries) if (applies(x)) return allowance(x);
  if (def) return allowance(def);
  return { ok: true, why: 'no group applies' };
}


/* ====================== PageRank (pure): the power iteration of networkx.pagerank ====================== */
function pagerankHistory(nodes, edges, d, tol = 1e-6, maxIter = 100) {
  const N = nodes.length, idx = new Map(nodes.map((n, i) => [n, i]));
  const out = nodes.map(() => []);
  edges.forEach(([u, v]) => out[idx.get(u)].push(idx.get(v)));
  let x = new Array(N).fill(1 / N);
  const hist = [{ x: x.slice(), err: null }];
  for (let it = 0; it < maxIter; it++) {
    const xl = x; x = new Array(N).fill(0);
    let dang = 0;
    xl.forEach((v, i) => { if (!out[i].length) dang += v; else out[i].forEach(j => { x[j] += v / out[i].length; }); });
    x = x.map(v => d * (v + dang / N) + (1 - d) / N);
    const err = x.reduce((s, v, i) => s + Math.abs(v - xl[i]), 0);
    hist.push({ x: x.slice(), err, dang });
    if (err < N * tol) return { hist, converged: true, out };
  }
  return { hist, converged: false, out };
}

/* ====================== politeness scheduler (pure) ====================== */
function politeSchedule(mode, k, delay) {
  const Q = ['a1', 'a2', 'a3', 'a4', 'b1', 'a5', 'a6', 'c1', 'a7', 'b2', 'a8', 'c2'], F = 0.5;
  const free = new Array(k).fill(0), R = [];
  if (mode === 'naive') {
    Q.forEach(u => { let w = 0; free.forEach((t, j) => { if (t < free[w]) w = j; }); R.push({ u, h: u[0], s: free[w], e: free[w] + F }); free[w] += F; });
  } else {
    const hostQ = {}, hostFree = {}; Q.forEach((u, i) => { (hostQ[u[0]] = hostQ[u[0]] || []).push([u, i]); hostFree[u[0]] = 0; });
    for (let n = 0; n < Q.length; n++) {
      let w = 0; free.forEach((t, j) => { if (t < free[w]) w = j; });
      let best = null;
      Object.keys(hostQ).forEach(h => { if (!hostQ[h].length) return; const ready = Math.max(free[w], hostFree[h]); const i = hostQ[h][0][1]; if (!best || ready < best.ready - 1e-9 || (Math.abs(ready - best.ready) < 1e-9 && i < best.i)) best = { h, ready, i }; });
      const [u] = hostQ[best.h].shift();
      R.push({ u, h: best.h, s: best.ready, e: best.ready + F });
      free[w] = best.ready + F; hostFree[best.h] = best.ready + F + delay;
    }
  }
  const total = Math.max(...R.map(r => r.e));
  const peak = (h) => { const xs = R.filter(r => r.h === h); return Math.max(...xs.map(r => xs.filter(q => q.s < r.e - 1e-9 && q.e > r.s + 1e-9).length)); };
  const gap = (h) => { const xs = R.filter(r => r.h === h).sort((p, q) => p.s - q.s); let g = Infinity; for (let i = 1; i < xs.length; i++) g = Math.min(g, xs[i].s - xs[i - 1].e); return g; };
  return { R, total, peakA: peak('a'), gapA: gap('a') };
}
// expose the pure part for Node checks
if (typeof module !== 'undefined') module.exports = { normalizeSteps, canon, simulateCrawl, parseRobots, rfcAllowed, pyAllowed, pagerankHistory, removeDotSegments, politeSchedule };
if (typeof document === 'undefined') { /* Node: stop here */ } else {


/* ---------- math ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- hero: a faint web graph ---------- */
function initHero() {
  const svg = document.getElementById('wc-hero-bg');
  const r = rng(6), pts = [];
  for (let i = 0; i < 46; i++) pts.push([r() * 1200, 15 + r() * 270, r()]);
  pts.forEach((p, i) => {
    const near = pts.map((q, j) => [Math.hypot(p[0] - q[0], p[1] - q[1]), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]).slice(0, 2);
    near.forEach(([dd, j]) => { if (dd < 230) el('line', { x1: p[0], y1: p[1], x2: pts[j][0], y2: pts[j][1], class: 'he' }, svg); });
  });
  pts.forEach(p => el('circle', { cx: p[0], cy: p[1], r: 4 + p[2] * 9, class: 'hn' + (p[2] > 0.8 ? ' big' : '') }, svg));
}

/* ---------- Part I: types of crawlers ---------- */
function initTaxonomy() {
  const T = {
    broad: ['Universal / broad crawler', 'Crawls as much of the Web as it can, following every link, with no restriction on topic. It favours <b>coverage</b>, and needs huge bandwidth and storage.', 'the crawler of a general web search engine (Googlebot, Bingbot)'],
    pref: ['Preferential crawler', 'Does not fetch everything: it orders the frontier by a <b>preference</b> (a topic, a predicted relevance or importance) and fetches the most promising URLs first, so a limited budget goes to useful pages. Its three kinds are below.', 'a crawler that must build a collection on one subject within a fixed budget'],
    focused: ['Focused crawler', 'Collects pages on a <b>predefined topic</b>. Before fetching a link it predicts whether the target is relevant, from the anchor text, the text around the link and the linking page, and skips links that lead away from the topic.', 'a crawler collecting medical articles'],
    topical: ['Topical crawler', 'Driven by a topic description or a set of example pages: it scores fetched pages by their similarity to the topic and expands the best ones first. "Focused" and "topical" crawler are often used interchangeably.', 'starting from a few pages about information retrieval, collect more of them'],
    forum: ['Forum crawler', 'Specialised for discussion <b>forums</b>: it recognises board, thread and post pages and their pagination, and skips the many URLs that show the same posts in another order or view.', 'collecting the threads of a support forum'],
    hidden: ['Hidden web crawler', 'Reaches the <b>hidden (deep) Web</b>: content behind search forms and query interfaces, which no static link points to. It fills in the forms with generated queries and crawls the result pages.', 'library catalogues, product databases, flight search'],
    mobile: ['Mobile crawler', 'A <b>migrating</b> crawler: instead of downloading every page over the network, the crawler (a mobile agent) moves to the web server, selects, filters and compresses pages there, and sends back only what is needed, reducing network load. It is <b>not</b> a crawler for mobile websites.', 'research designs for reducing the network traffic of crawling'],
    incr: ['Continuous / incremental crawler', 'Keeps an existing collection <b>fresh</b>: it revisits pages, estimates how often each one changes, and refetches the changed ones instead of recrawling everything from scratch.', 'news search, where yesterday\'s crawl is already stale'],
  };
  const tree = document.getElementById('tx-tree'), out = document.getElementById('tx-out');
  const btn = (k) => `<button type="button" class="tx-node" data-k="${k}">${T[k][0]}</button>`;
  tree.innerHTML = `<div class="tx-root">Web crawler</div><div class="tx-row">${['broad', 'pref', 'hidden', 'mobile', 'incr'].map(btn).join('')}</div>` +
    `<div class="tx-sub"><span class="tx-sub-l">Preferential ↳</span>${['focused', 'topical', 'forum'].map(btn).join('')}</div>`;
  function show(k) {
    tree.querySelectorAll('.tx-node').forEach(b => b.classList.toggle('active', b.dataset.k === k || (k && ['focused', 'topical', 'forum'].includes(k) && b.dataset.k === 'pref')));
    out.innerHTML = `<p class="al-h">${T[k][0]}</p><p>${T[k][1]}</p><p class="note">Example: ${T[k][2]}.</p>`;
  }
  tree.querySelectorAll('.tx-node').forEach(b => b.addEventListener('click', () => show(b.dataset.k)));
  show('broad');
}

/* ---------- Part II: crawler architecture ---------- */
function initFlow() {
  const S = [
    ['Seed URLs', 'Where the crawl starts: a homepage, a known domain list, a sitemap, a previous crawl. The seed set strongly affects what the crawler discovers.'],
    ['URL frontier', 'The URLs waiting to be crawled. A queue gives BFS, a stack DFS; real frontiers are priority queues, one queue per host.'],
    ['Scheduler', 'Picks the next URL: which host was contacted recently? which pages are likely to be important? which should be revisited?'],
    ['robots / politeness check', 'Is this URL allowed by the host\'s robots.txt? Has enough time passed since the last request to this host?'],
    ['HTTP fetcher', 'Downloads the page with an honest User-agent; handles redirects, errors, timeouts and retry signals (429, Retry-After).'],
    ['Parser', 'Extracts the <b>text</b> (for the index), the <b>metadata</b> (title, language, canonical link, dates) and the <b>outgoing links</b>.'],
    ['URL normalization', 'Resolves relative links and brings every URL to one canonical form (lowercase host, no fragment, no default port, no ./ and ../).'],
    ['Duplicate check', 'Drops URLs already seen (a set of URLs) and pages whose content was already stored (fingerprints). Survivors go back into the frontier.'],
  ];
  const box = document.getElementById('cw-flow'), out = document.getElementById('cw-flow-out');
  box.innerHTML = S.map(([n], i) => `<button type="button" class="cw-st" data-i="${i}">${n}</button>` + (i < S.length - 1 ? '<span class="cw-ar" aria-hidden="true">→</span>' : '<span class="cw-ar cw-back" aria-hidden="true">↺ back to the frontier</span>')).join('');
  const show = (i) => { box.querySelectorAll('.cw-st').forEach(b => b.classList.toggle('active', +b.dataset.i === i)); out.innerHTML = `<p><b>${S[i][0]}</b>: ${S[i][1]}</p>`; };
  box.querySelectorAll('.cw-st').forEach(b => b.addEventListener('click', () => show(+b.dataset.i)));
  show(1);
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initTaxonomy();
  initFlow();
});

}

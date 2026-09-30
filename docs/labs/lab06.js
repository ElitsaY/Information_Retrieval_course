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

/* ---------- Part II: crawl simulator ---------- */
function initCrawlSim() {
  const $ = (id) => document.getElementById(id);
  const svg = $('cs-svg'), fr = $('cs-frontier'), log = $('cs-log'), stats = $('cs-stats');
  const cfg = { site: 'toy', pol: 'bfs' };
  let snaps = [], i = 0;
  const LAYOUT = {
    toy: { A: [230, 40, 'A'], B: [150, 125, 'B'], E: [310, 125, 'E'], C: [150, 200, 'C'], D: [150, 272, 'D'] },
    ex: { cal: [75, 38, 'Calendar'], '/': [230, 38, 'Home'], '/private/admin': [385, 38, 'Private'],
      '/about': [75, 122, 'About'], '/courses': [230, 122, 'Courses'], '/people': [385, 122, 'People'],
      '/courses?print=1': [75, 205, 'Print copy'], '/courses/ir': [190, 205, 'IR course'], '/courses/ai': [300, 205, 'AI course'],
      '/people/ana': [245, 275, 'Ana'], '/people/boris': [385, 275, 'Boris'] },
  };
  const EDGES = {
    toy: [['A', 'B'], ['A', 'E'], ['B', 'C'], ['C', 'D']],
    ex: [['/', 'cal'], ['/', '/private/admin'], ['/', '/about'], ['/', '/courses'], ['/', '/people'], ['/courses', '/courses?print=1'], ['/courses', '/courses/ir'], ['/courses', '/courses/ai'],
      ['/people', '/people/ana'], ['/people', '/people/boris'], ['/courses/ir', '/people/ana'], ['/courses/ai', '/people/boris']],
  };
  pills($('cs-site'), [['toy', 'Toy graph'], ['ex', 'example.org']], cfg.site, (k) => { cfg.site = k; rebuild(); });
  pills($('cs-pol'), [['bfs', 'BFS (queue)'], ['dfs', 'DFS (stack)']], cfg.pol, (k) => { cfg.pol = k; rebuild(); });
  ['cs-norm', 'cs-dup', 'cs-rob', 'cs-trap'].forEach(id => $(id).addEventListener('change', rebuild));
  $('cs-max').addEventListener('input', () => { $('cs-max-val').textContent = $('cs-max').value; rebuild(); });
  $('cs-reset').addEventListener('click', () => { i = 0; render(); });
  $('cs-prev').addEventListener('click', () => { if (i > 0) { i--; render(); } });
  $('cs-next').addEventListener('click', () => { if (i < snaps.length - 1) { i++; render(); } });
  $('cs-end').addEventListener('click', () => { i = snaps.length - 1; render(); });

  function rebuild() {
    const ex = cfg.site === 'ex';
    $('cs-opts').classList.toggle('dim', !ex);
    $('cs-opts').querySelectorAll('input').forEach(x => { x.disabled = !ex; });
    snaps = simulateCrawl({ site: ex ? 'ex' : 'toy', pol: cfg.pol, norm: $('cs-norm').checked, dup: $('cs-dup').checked, rob: $('cs-rob').checked, trap: $('cs-trap').checked, max: +$('cs-max').value });
    i = 0; render();
  }
  function nodeOfUrl(u) {
    if (cfg.site === 'toy') return u;
    const p = splitUrl(canon(u)); if (!p) return null;
    const k = p.path + p.query;
    return /^\/calendar\?/.test(k) ? 'cal' : k;
  }
  function render() {
    const s = snaps[i], ex = cfg.site === 'ex', L = LAYOUT[ex ? 'ex' : 'toy'];
    $('cs-step').textContent = `step ${i} / ${snaps.length - 1}`;
    $('cs-prev').disabled = i === 0; $('cs-next').disabled = i === snaps.length - 1;
    svg.innerHTML = '';
    const defs = el('defs', {}, svg);
    const mk = el('marker', { id: 'cs-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'cs-arrowhead' }, mk);
    const W = ex ? 39 : 21, H = ex ? 15 : 21;
    EDGES[ex ? 'ex' : 'toy'].forEach(([a, b]) => {
      const [x1, y1] = L[a], [x2, y2] = L[b], dx = x2 - x1, dy = y2 - y1;
      const t = Math.min(W / Math.abs(dx || 1e-9), H / Math.abs(dy || 1e-9), 1);
      el('line', { x1: x1 + dx * t, y1: y1 + dy * t, x2: x2 - dx * t, y2: y2 - dy * t, class: 'cs-edge', 'marker-end': 'url(#cs-arrow)' }, svg);
    });
    const inFr = new Set(s.frontier.map(nodeOfUrl));
    Object.entries(L).forEach(([k, [x, y, name]]) => {
      const n = s.fetches[k] || 0, stt = s.status[k];
      const g = el('g', { class: 'cs-node' + (stt ? ' ' + stt : '') + (inFr.has(k) && !n ? ' fr' : '') + (s.cur === k ? ' cur' : '') }, svg);
      if (ex) el('rect', { x: x - W, y: y - H, width: 2 * W, height: 2 * H, rx: 8 }, g);
      else el('circle', { cx: x, cy: y, r: H }, g);
      txt(g, x, y + (ex ? 4 : 5.5), name, 'cs-lbl' + (ex ? '' : ' big'), 'middle');
      if (n) {
        const ord = !ex ? s.order.indexOf(k) + 1 : 0;
        const tag = ex ? '×' + n : '#' + ord;
        const bx = x + W - 4, by = y - H - 2;
        el('rect', { x: bx - 13, y: by - 9, width: 26, height: 16, rx: 8, class: 'cs-badge' + (ex && (n > 1 || stt === 'bad' || stt === 'trap') ? ' warn' : '') }, g);
        txt(g, bx, by + 3, tag, 'cs-badge-t', 'middle');
      }
    });
    const FMAX = 14, shown = cfg.pol === 'bfs' ? s.frontier.slice(0, FMAX) : s.frontier.slice(-FMAX).reverse();
    $('cs-fr-h').textContent = `Frontier (${s.frontier.length}) · next out: ${cfg.pol === 'bfs' ? 'front of the queue' : 'top of the stack'}`;
    fr.innerHTML = shown.map((u, j) => `<span class="chip${j === 0 ? ' cur' : ''}">${esc(short(u))}</span>`).join('') + (s.frontier.length > FMAX ? `<span class="chip cs-more">+${s.frontier.length - FMAX} more</span>` : '') + (!s.frontier.length ? '<span class="note">empty</span>' : '');
    const st = s.stats;
    stats.innerHTML = ex
      ? `<div class="stat"><span class="n">${st.fetch}</span><span class="l">fetches</span></div><div class="stat"><span class="n">${st.real} / 8</span><span class="l">real pages found</span></div><div class="stat"><span class="n">${st.waste}</span><span class="l">wasted fetches</span></div><div class="stat"><span class="n">${st.bad}</span><span class="l">robots violations</span></div>`
      : `<div class="stat"><span class="n">${s.order.join(', ') || '–'}</span><span class="l">fetch order</span></div>`;
    log.innerHTML = snaps.slice(0, i + 1).map((x, j) => `<p class="${x.cls}${j === i ? ' current' : ''}">${j ? j + '. ' : ''}${esc(x.log)}</p>`).join('') + (i === snaps.length - 1 && s.end ? `<p class="iter">done: ${esc(s.end)}</p>` : '');
    log.scrollTop = log.scrollHeight;
  }
  rebuild();
}

/* ---------- Part III: URL normalizer ---------- */
function initNormalizer() {
  const base = document.getElementById('un-base'), href = document.getElementById('un-href'), out = document.getElementById('un-out');
  const P = {
    frag: ['Fragment', 'https://example.org/page', '#section'],
    host: ['Upper-case host', 'https://example.org/', 'https://EXAMPLE.org/page'],
    dots: ['Dot segments', 'https://example.org/a/b.html', '../page'],
    port: ['Default port', 'https://example.org/', 'HTTPS://Example.org:443/a/./page#top'],
    slash: ['Trailing slash', 'https://example.org/', '/page/'],
    utm: ['Tracking parameters', 'https://example.org/news', '/page?utm_source=mail&id=7&lang=en'],
  };
  pills(document.getElementById('un-presets'), Object.entries(P).map(([k, v]) => [k, v[0]]), 'dots', (k) => { base.value = P[k][1]; href.value = P[k][2]; render(); });
  base.value = P.dots[1]; href.value = P.dots[2];
  function render() {
    const opts = { slash: document.getElementById('un-slash').checked, utm: document.getElementById('un-utm').checked, sort: document.getElementById('un-sort').checked };
    const r = normalizeSteps(base.value, href.value, opts);
    let prev = null;
    const rows = r.steps.map(([name, u, risky]) => { const ch = prev !== null && u !== prev; const row = `<tr class="${ch ? 'chg' : ''}${risky ? ' risky' : ''}"><td>${name}${risky ? ' <span class="un-risk">not safe</span>' : ''}</td><td><code>${esc(u)}</code></td><td>${prev === null ? '' : ch ? 'changed' : '–'}</td></tr>`; prev = u; return row; }).join('');
    out.innerHTML = r.bad ? `<p class="note">Not an absolute http(s) URL: <code>${esc(r.url)}</code></p>` :
      `<div class="table-wrap"><table class="summary sc-small un-table"><thead><tr><th>Step</th><th>URL</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><p class="un-final">canonical form: <code>${esc(r.url)}</code></p>`;
  }
  [base, href].forEach(x => x.addEventListener('input', render));
  ['un-slash', 'un-utm', 'un-sort'].forEach(id => document.getElementById(id).addEventListener('change', render));
  render();
}

/* ---------- Part III: fingerprints ---------- */
function initFingerprint() {
  const A = document.getElementById('fp-a'), B = document.getElementById('fp-b'), out = document.getElementById('fp-out');
  const art = 'Sofia University opens a new information retrieval lab. Students will build a small web crawler, index the pages it collects and rank them with BM25 and PageRank.';
  const P = {
    same: ['Identical', `Home | News | Sport\n${art}\nUpdated 10:32`, `Home | News | Sport\n${art}\nUpdated 10:32`],
    space: ['One extra space', `Home | News | Sport\n${art}\nUpdated 10:32`, `Home | News | Sport\n${art.replace('web crawler', 'web  crawler')}\nUpdated 10:32`],
    time: ['Timestamp changed', `Home | News | Sport\n${art}\nUpdated 10:32`, `Home | News | Sport\n${art}\nUpdated 11:05`],
    nav: ['Different navigation', `Home | News | Sport\n${art}\nUpdated 10:32`, `Menu | Latest | Weather | Login\n${art}\nUpdated 10:32 · Advertisement`],
    diff: ['Different article', `Home | News | Sport\n${art}\nUpdated 10:32`, 'Home | News | Sport\nThe national football team won its qualifier on Tuesday evening, with two goals in the second half.\nUpdated 10:32'],
  };
  pills(document.getElementById('fp-presets'), Object.entries(P).map(([k, v]) => [k, v[0]]), 'time', (k) => { A.value = P[k][1]; B.value = P[k][2]; render(); });
  A.value = P.time[1]; B.value = P.time[2];
  const shingles = (s, k = 3) => { const w = s.toLowerCase().split(/\s+/).filter(Boolean), S = new Set(); for (let i = 0; i + k <= w.length; i++) S.add(w.slice(i, i + k).join(' ')); return S; };
  async function sha(s) {
    if (!(window.crypto && crypto.subtle)) return null;
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  let tok = 0;
  async function render() {
    const my = ++tok, a = A.value, b = B.value;
    const [ha, hb] = await Promise.all([sha(a), sha(b)]);
    if (my !== tok) return;
    const sa = shingles(a), sb = shingles(b); let inter = 0; sa.forEach(x => { if (sb.has(x)) inter++; });
    const uni = sa.size + sb.size - inter, J = uni ? inter / uni : 1;
    const same = ha !== null ? ha === hb : a === b;
    const verdict = same ? 'exact duplicate: same fingerprint' : J >= 0.8 ? 'near duplicate: the hashes differ completely, the shingles barely' : J >= 0.4 ? 'partly overlapping pages' : 'different pages';
    const hx = (h) => h === null ? '(SHA-256 needs https or localhost)' : `<code class="fp-hash">${h}</code>`;
    out.innerHTML = `<p class="big"><b>${verdict}</b></p><p>SHA-256 of page 1: ${hx(ha)}</p><p>SHA-256 of page 2: ${hx(hb)}</p>` +
      `<p>Word 3-shingles: ${sa.size} and ${sb.size}, ${inter} shared. Jaccard \\(= ${inter} / ${uni} = ${J.toFixed(3)}\\).</p>` +
      (a !== b && a.replace(/\s+/g, ' ') === b.replace(/\s+/g, ' ') ? '<p class="note">💡 The texts differ only in whitespace: normalizing the text (collapse whitespace, strip the page template) before hashing would make them exact duplicates.</p>' : '');
    mathIn(out);
  }
  [A, B].forEach(x => x.addEventListener('input', render));
  render();
}

/* ---------- Part IV: robots.txt tester ---------- */
function initRobots() {
  const T = document.getElementById('rb-txt'), UA = document.getElementById('rb-ua'), PI = document.getElementById('rb-path'), out = document.getElementById('rb-out'), chips = document.getElementById('rb-paths');
  T.value = 'User-agent: *\nDisallow: /private/\nAllow: /private/press/\nDisallow: /*.pdf$\nDisallow: /search\n\nUser-agent: BadBot\nDisallow: /';
  UA.value = 'MyCourseCrawler';
  const PATHS = ['/page', '/private/notes', '/private/press/news', '/files/report.pdf', '/files/report.pdf?v=2', '/search?q=crawler', '/robots.txt'];
  PI.placeholder = 'type another path, e.g. /private/press/';
  chips.innerHTML = ['MyCourseCrawler', 'BadBot', 'badbot/2.1'].map(u => `<button type="button" class="strat-btn rb-ua" data-u="${u}">${u}</button>`).join('');
  chips.querySelectorAll('.rb-ua').forEach(b => b.addEventListener('click', () => { UA.value = b.dataset.u; render(); }));
  const mark = (r) => `<span class="rb-v ${r.ok ? 'ok' : 'no'}">${r.ok ? '✓ allowed' : '✕ disallowed'}</span><small>${esc(r.why)}</small>`;
  function render() {
    const groups = parseRobots(T.value), ua = UA.value.trim() || '*';
    const list = (PI.value.trim() ? [PI.value.trim().startsWith('/') ? PI.value.trim() : '/' + PI.value.trim()] : []).concat(PATHS);
    out.innerHTML = `<div class="table-wrap"><table class="summary sc-small rb-table"><thead><tr><th>Path</th><th>RFC 9309</th><th>Python robotparser</th></tr></thead><tbody>` +
      list.map((p, i) => { const a = rfcAllowed(groups, ua, p), b = pyAllowed(T.value, ua, p); return `<tr class="${a.ok !== b.ok ? 'diff' : ''}${i === 0 && PI.value.trim() ? ' mine' : ''}"><td><code>${esc(p)}</code></td><td>${mark(a)}</td><td>${mark(b)}</td></tr>`; }).join('') +
      `</tbody></table></div><p class="rr-note">Highlighted rows: the two parsers disagree.</p>`;
  }
  [T, UA, PI].forEach(x => x.addEventListener('input', render));
  render();
}

/* ---------- Part IV: politeness timeline ---------- */
function initPolite() {
  const svg = document.getElementById('po-svg'), out = document.getElementById('po-out'), K = document.getElementById('po-k'), D = document.getElementById('po-d');
  let mode = 'naive';
  pills(document.getElementById('po-mode'), [['naive', 'Naive: one frontier'], ['polite', 'Polite: per-host queues']], mode, (m) => { mode = m; render(); });
  function render() {
    const k = +K.value, d = +D.value;
    document.getElementById('po-k-val').textContent = k; document.getElementById('po-d-val').textContent = d + ' s';
    const r = politeSchedule(mode, k, d), other = politeSchedule(mode === 'naive' ? 'polite' : 'naive', k, d);
    svg.innerHTML = '';
    const Lx = 58, Rx = 548, tmax = Math.max(r.total, other.total, 3), x = (t) => Lx + t / tmax * (Rx - Lx);
    const hosts = ['a', 'b', 'c'], lane = {}, rowY = {}; let y = 12;
    hosts.forEach(h => {
      const xs = r.R.filter(q => q.h === h).sort((p, q) => p.s - q.s), ends = [];
      xs.forEach(q => { let l = ends.findIndex(e => e <= q.s + 1e-9); if (l < 0) { l = ends.length; ends.push(0); } ends[l] = q.e; lane[q.u] = l; });
      rowY[h] = y; const hgt = Math.max(1, ends.length) * 15 + 8;
      el('rect', { x: Lx, y, width: Rx - Lx, height: hgt, class: 'po-row' }, svg);
      txt(svg, Lx - 8, y + hgt / 2 + 4, h + '.org', 'lbl', 'end');
      y += hgt + 6;
    });
    for (let t = 0; t <= tmax + 1e-9; t += tmax > 8 ? 2 : 1) { el('line', { x1: x(t), x2: x(t), y1: 8, y2: y, class: 'grid-line' }, svg); txt(svg, x(t), y + 13, t + ' s', 'tick', 'middle'); }
    svg.setAttribute('viewBox', `0 0 560 ${y + 20}`);
    r.R.forEach(q => {
      const yy = rowY[q.h] + 4 + lane[q.u] * 15;
      el('rect', { x: x(q.s) + 0.5, y: yy, width: Math.max(2, x(q.e) - x(q.s) - 1), height: 12, rx: 3, class: 'po-req ' + q.h }, svg);
      txt(svg, (x(q.s) + x(q.e)) / 2, yy + 9.5, q.u, 'po-t', 'middle');
    });
    const gp = r.gapA === Infinity ? '–' : r.gapA < 0 ? 'overlapping' : r.gapA.toFixed(1) + ' s';
    out.innerHTML = `<p class="big">All 12 pages in <b>${r.total.toFixed(1)} s</b>; a.org gets up to <b>${r.peakA}</b> simultaneous request${r.peakA > 1 ? 's' : ''}, shortest pause between its requests: <b>${gp}</b>.</p>` +
      `<p class="note">The ${mode === 'naive' ? 'polite' : 'naive'} scheduler with the same settings: ${other.total.toFixed(1)} s, up to ${other.peakA} at once on a.org. ${mode === 'polite' ? 'The price of politeness is paid by the busiest host only; b.org and c.org are fetched in the gaps.' : 'Fast, but a.org sees a burst of parallel requests: exactly what gets a crawler blocked.'}</p>`;
  }
  [K, D].forEach(s => s.addEventListener('input', render));
  render();
}

/* ---------- Part VII: PageRank playground ---------- */
function initPageRank() {
  const $ = (id) => document.getElementById(id);
  const svg = $('pr-svg'), table = $('pr-table'), out = $('pr-out'), dS = $('pr-d');
  const outline = [['A', 'B'], ['A', 'C'], ['B', 'C'], ['C', 'A'], ['D', 'C'], ['D', 'A']];
  const sq = { A: [110, 75], B: [330, 75], C: [330, 245], D: [110, 245] };
  const farmPos = { A: [55, 70], B: [185, 70], C: [185, 250], D: [55, 250], S: [335, 160] };
  for (let i = 1; i <= 5; i++) { const a = -Math.PI / 2 + (i - 1) * 2 * Math.PI / 5; farmPos['F' + i] = [335 + 88 * Math.cos(a), 160 + 88 * Math.sin(a) * 1.25]; }
  const wsPos = { X: [140, 150], H: [300, 110], Y: [300, 255] };
  for (let i = 1; i <= 4; i++) wsPos['O' + i] = [42, 45 + (i - 1) * 75];
  for (let i = 1; i <= 5; i++) wsPos['P' + i] = [400, 30 + (i - 1) * 50];
  const PRE = {
    outline: ['Outline graph', sq, outline],
    noca: ['Remove C → A', sq, outline.filter(([u, v]) => !(u === 'C' && v === 'A'))],
    ad: ['A links to D', sq, outline.concat([['A', 'D']])],
    dang: ['Dangling node', { A: [80, 160], B: [220, 160], C: [360, 160] }, [['A', 'B'], ['B', 'C']]],
    ws: ['Many weak vs one strong', wsPos, [['O1', 'X'], ['O2', 'X'], ['O3', 'X'], ['O4', 'X'], ['P1', 'H'], ['P2', 'H'], ['P3', 'H'], ['P4', 'H'], ['P5', 'H'], ['H', 'Y'], ['Y', 'H'], ['X', 'H']]],
    farm: ['Link farm', farmPos, outline.concat([1, 2, 3, 4, 5].flatMap(i => [['F' + i, 'S'], ['S', 'F' + i]]))],
  };
  let pos, nodes, edges, res, it = 0, sel = null, surfer = null;
  pills($('pr-presets'), Object.entries(PRE).map(([k, v]) => [k, v[0]]), 'outline', load);
  function load(k) { pos = PRE[k][1]; nodes = Object.keys(pos); edges = PRE[k][2].map(e => e.slice()); sel = null; recompute(true); }
  function recompute(toEnd) {
    res = pagerankHistory(nodes, edges, +dS.value);
    it = toEnd ? res.hist.length - 1 : Math.min(it, res.hist.length - 1);
    surfer = { at: null, steps: 0, visits: new Array(nodes.length).fill(0), r: rng(2026) };
    render();
  }
  dS.addEventListener('input', () => { $('pr-d-val').textContent = (+dS.value).toFixed(2); recompute(true); });
  $('pr-reset').addEventListener('click', () => { it = 0; render(); });
  $('pr-prev').addEventListener('click', () => { if (it > 0) { it--; render(); } });
  $('pr-next').addEventListener('click', () => { if (it < res.hist.length - 1) { it++; render(); } });
  $('pr-end').addEventListener('click', () => { it = res.hist.length - 1; render(); });
  function walk(n) {
    const d = +dS.value, N = nodes.length;
    for (let s = 0; s < n; s++) {
      const r = surfer.r;
      if (surfer.at === null) surfer.at = Math.floor(r() * N);
      else { const o = res.out[surfer.at]; surfer.at = (o.length && r() < d) ? o[Math.floor(r() * o.length)] : Math.floor(r() * N); }
      surfer.visits[surfer.at]++; surfer.steps++;
    }
    render();
  }
  $('pr-s1').addEventListener('click', () => walk(1));
  $('pr-s1k').addEventListener('click', () => walk(1000));
  $('pr-s0').addEventListener('click', () => { surfer = { at: null, steps: 0, visits: new Array(nodes.length).fill(0), r: rng(2026) }; render(); });
  svg.addEventListener('click', (e) => { if (e.target === svg) { sel = null; render(); } });

  function clickNode(n) {
    if (sel === null || sel === n) { sel = sel === n ? null : n; render(); return; }
    const j = edges.findIndex(([u, v]) => u === sel && v === n);
    if (j >= 0) edges.splice(j, 1); else edges.push([sel, n]);
    recompute(true);
  }
  const f4 = (v) => v.toFixed(4);
  function render() {
    const x = res.hist[it].x, fin = res.hist[res.hist.length - 1].x, d = +dS.value, N = nodes.length, idx = new Map(nodes.map((n, i) => [n, i]));
    $('pr-it').textContent = `iteration ${it} / ${res.hist.length - 1}`;
    $('pr-prev').disabled = it === 0; $('pr-next').disabled = it === res.hist.length - 1;
    svg.innerHTML = '';
    const defs = el('defs', {}, svg);
    const mk = el('marker', { id: 'pr-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'pr-arrowhead' }, mk);
    const rad = (i) => 10 + 40 * Math.sqrt(x[i]);
    const has = new Set(edges.map(([u, v]) => u + '>' + v));
    edges.forEach(([u, v]) => {
      const [x1, y1] = pos[u], [x2, y2] = pos[v], i = idx.get(u), j = idx.get(v);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const bend = has.has(v + '>' + u) ? 16 : 0, nx = -uy * bend, ny = ux * bend;
      const sx = x1 + ux * rad(i) + nx * 0.5, sy = y1 + uy * rad(i) + ny * 0.5, ex = x2 - ux * (rad(j) + 2) + nx * 0.5, ey = y2 - uy * (rad(j) + 2) + ny * 0.5;
      el('path', { d: `M${sx},${sy} Q${(x1 + x2) / 2 + nx},${(y1 + y2) / 2 + ny} ${ex},${ey}`, class: 'pr-edge' + (sel === u ? ' out' : sel === v ? ' in' : ''), 'marker-end': 'url(#pr-arrow)' }, svg);
    });
    nodes.forEach((n, i) => {
      const [cx, cy] = pos[n];
      const g = el('g', { class: 'pr-node' + (sel === n ? ' sel' : '') + (surfer.at === i ? ' surf' : '') + (!res.out[i].length ? ' dangle' : ''), tabindex: 0, role: 'button', 'aria-label': `page ${n}` }, svg);
      el('circle', { cx, cy, r: rad(i) }, g);
      txt(g, cx, cy + 5, n, 'pr-lbl', 'middle');
      g.addEventListener('click', (e) => { e.stopPropagation(); clickNode(n); });
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickNode(n); } });
    });
    const indeg = nodes.map(n => edges.filter(([, v]) => v === n).length);
    const top = fin.indexOf(Math.max(...fin));
    table.innerHTML = `<thead><tr><th>Page</th><th>In</th><th>Out</th><th>PR<sub>${it}</sub></th><th>Final</th><th>Surfer</th></tr></thead><tbody>` +
      nodes.map((n, i) => `<tr class="${sel === n ? 'sel' : ''}"><td><b>${n}</b></td><td>${indeg[i]}</td><td>${res.out[i].length}</td><td>${f4(x[i])}</td><td class="${i === top ? 'hit' : ''}">${f4(fin[i])}</td><td>${surfer.steps ? (surfer.visits[i] / surfer.steps).toFixed(3) : '–'}</td></tr>`).join('') + '</tbody>';
    const byIn = nodes.map((n, i) => [n, indeg[i], fin[i]]);
    const ordIn = byIn.slice().sort((a, b) => b[1] - a[1]).map(z => z[0]), ordPr = byIn.slice().sort((a, b) => b[2] - a[2]).map(z => z[0]);
    let h = '';
    if (sel !== null) {
      const u = idx.get(sel), prev = res.hist[Math.max(0, it - 1)].x, B = edges.filter(([, v]) => v === sel).map(([w]) => idx.get(w));
      const dang = nodes.map((_, i) => i).filter(i => !res.out[i].length);
      if (it === 0) h += `<p class="big">Iteration 0: every page starts at \\(1/N = 1/${N} = ${f4(1 / N)}\\). Step forward to apply the formula.</p>`;
      else {
        const terms = B.map(v => `${f4(prev[v])}/${res.out[v].length}`).join(' + ') || '0';
        const dterm = dang.length ? ` + ${dang.map(w => f4(prev[w])).join(' + ')}\\text{ (dangling)}/${N}` : '';
        h += `<p class="big">\\(PR_{${it}}(${sel}) = \\frac{1-${d}}{${N}} + ${d}\\,(${terms}${dterm}) = ${f4(x[u])}\\)</p>`;
      }
      h += `<p class="note">In-links from: ${B.map(v => nodes[v]).join(', ') || 'none'}. Click another node to add or remove the link ${sel} → it; click ${sel} again to deselect.</p>`;
    } else h += `<p class="note">Click a node to see its formula; click it and then another node to add or remove a link.</p>`;
    h += `<p>${res.converged ? `Converged after <b>${res.hist.length - 1}</b> iterations (NetworkX stops when \\(\\sum |\\Delta| < N \\cdot 10^{-6}\\)).` : `❗ Not converged after 100 iterations: NetworkX would raise <code>PowerIterationFailedConvergence</code>.`} Sum of the scores: ${x.reduce((a, b) => a + b, 0).toFixed(4)}.</p>`;
    h += `<p class="note">In-degree order: ${ordIn.join(' ≥ ')} · PageRank order: ${ordPr.join(' ≥ ')}</p>`;
    if (surfer.steps) h += `<p class="note">Surfer: ${surfer.steps.toLocaleString('en')} steps, now on ${nodes[surfer.at]}. With more steps its visit frequencies approach the final PageRank.</p>`;
    out.innerHTML = h; mathIn(out);
  }
  load('outline');
}

/* ---------- Part VIII: combining signals ---------- */
function initCombine() {
  const D = [
    ['Sorting HOW TO — Python documentation', 11.2, 0.0062],
    ['My bubble sort in Python (student blog)', 12.9, 0.0004, 'A'],
    ['Sorting algorithm — Wikipedia', 8.4, 0.0095, 'B'],
    ['World news — front page', 0.9, 0.0210],
    ['Ball python care guide', 3.1, 0.0018],
  ];
  const W = document.getElementById('cb-w'), out = document.getElementById('cb-out');
  const mb = Math.max(...D.map(d => d[1])), mp = Math.max(...D.map(d => d[2]));
  const sA = (w) => (1 - w) * D[1][1] / mb + w * D[1][2] / mp, sB = (w) => (1 - w) * D[2][1] / mb + w * D[2][2] / mp;
  const cross = (D[1][1] / mb - D[2][1] / mb) / ((D[1][1] / mb - D[2][1] / mb) - (D[1][2] / mp - D[2][2] / mp));
  function render() {
    const w = +W.value; document.getElementById('cb-w-val').textContent = w.toFixed(2);
    const rows = D.map(([t, b, p, tag]) => ({ t, b, p, tag, tx: (1 - w) * b / mb, lk: w * p / mp })).sort((a, b) => (b.tx + b.lk) - (a.tx + a.lk));
    out.innerHTML = `<div class="cb-list">` + rows.map((r, i) => `<div class="cb-row"><span class="cb-rank">${i + 1}</span><div class="cb-main"><div class="cb-title">${r.tag ? `<span class="cb-tag">${r.tag}</span>` : ''}${esc(r.t)} <small>BM25 ${r.b} · PageRank ${r.p}</small></div>` +
      `<div class="cb-bar"><span class="cb-tx" style="width:${(r.tx * 100).toFixed(1)}%"></span><span class="cb-lk" style="width:${(r.lk * 100).toFixed(1)}%"></span></div></div><span class="cb-score">${(r.tx + r.lk).toFixed(3)}</span></div>`).join('') + `</div>` +
      `<p class="bt-legend" style="margin:0.5rem 0 0;"><span class="k" style="background:var(--indigo);"></span> \\((1-w)\\cdot\\) BM25 / max &nbsp; <span class="k" style="background:var(--dfs);"></span> \\(w\\cdot\\) PageRank / max</p>` +
      `<p class="note">A (high BM25, low PageRank) ranks above B (medium BM25, high PageRank) while \\(w < ${cross.toFixed(2)}\\). ${rows[0].t.startsWith('World news') ? '❗ The world-news page is now first for a query it does not match.' : ''}</p>`;
    mathIn(out);
  }
  W.addEventListener('input', render);
  render();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initTaxonomy();
  initFlow();
  initCrawlSim();
  initNormalizer();
  initFingerprint();
  initRobots();
  initPolite();
  initPageRank();
  initCombine();
});

}

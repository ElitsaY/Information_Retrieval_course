/* ===== Lab 06.1 interactivity: working example (scraping a petel.bg article) ===== */

const SVG_NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
  if (parent) parent.appendChild(e);
  return e;
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

/* ---------- shared tooltip ---------- */
const tip = { node: null };
function showTip(html, target, ev) {
  const t = tip.node || (tip.node = document.getElementById('pw-tip'));
  t.innerHTML = html; t.hidden = false;
  const r = target.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
  let x = ev && ev.clientX ? ev.clientX : r.left + r.width / 2, y = (ev && ev.clientY ? ev.clientY : r.top) - h - 12;
  x = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2));
  if (y < 8) y = r.bottom + 10;
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
function hideTip() { if (tip.node) tip.node.hidden = true; }
function withTip(node, html) {
  node.tabIndex = 0;
  node.addEventListener('mousemove', (e) => showTip(html, node, e));
  node.addEventListener('mouseleave', hideTip);
  node.addEventListener('focus', () => showTip(html, node));
  node.addEventListener('blur', hideTip);
}

/* ---------- hero: faint page wireframes ---------- */
function initHero() {
  const svg = document.getElementById('pw-hero-bg');
  const r = rng(679431);
  for (let x = 20; x < 1200; x += 150 + r() * 60) {
    let y = 10 + r() * 30;
    const w = 90 + r() * 50;
    while (y < 290) {
      const h = 10 + r() * 34, keep = r() > 0.72;
      el('rect', { x, y, width: w * (0.6 + r() * 0.4), height: h, rx: 4, class: keep ? 'hk' : 'hb' }, svg);
      y += h + 8;
    }
  }
}

/* ---------- page anatomy ---------- */
const BLOCKS = {
  logo: ['Site logo', 'drop', '<code>soup.find("img")</code> → <code>img/logo.png</code>', 'The first image in the whole HTML, and a relative URL.'],
  menu: ['Navigation', 'drop', 'links in the header', 'The same on every page of the site.'],
  adtop: ['Ad', 'drop', '<code>img</code> from <code>ad.petel.bg/www/delivery/avw.php?zoneid=2</code>', 'Ads are images too, served by the site\'s ad server.'],
  title: ['Title', 'keep', '<code>article.find("h1")</code>', 'The headline of the article.'],
  date: ['Date', 'keep', '<code>div.item-date</code>, its own text only', 'Take only the first text of the div, not its children.'],
  comments: ['Comments', 'drop', '<code>&lt;span&gt;</code> inside <code>div.item-date</code>', '<code>get_text()</code> would add this "0" to the date.'],
  fb: ['Facebook button', 'drop', '<code>div.item-share-like img</code>', 'The first <code>&lt;img&gt;</code> inside the article. Picking "the first image" gives this.'],
  photo: ['Main photo', 'keep', '<code>img.img-responsive</code> in <code>div.etargetnet_ads</code>', 'The article\'s photo, in its big version (933 × 493). Its container\'s class name contains "ads".'],
  text1: ['Article text', 'keep', '<code>div.item-text p</code>', '14 paragraphs, 330 words in all. Empty paragraphs are skipped.'],
  promo: ['Promo banner', 'drop', '<code>div.item-text a &gt; img</code>, hosted on <code>vihrogon.bg</code>', 'Inside the article text, but an advert for the site: "Добави Petel.bg в Google".'],
  text2: ['Article text', 'keep', '<code>div.item-text p</code>', 'More paragraphs of the same article.'],
  editor: ['"Редактор …"', 'drop', 'a <code>&lt;p&gt;</code> starting with "Редактор"', 'Where the script stops reading paragraphs.'],
  boiler: ['Boilerplate', 'drop', 'the <code>&lt;p&gt;</code>s after the editor\'s line', '73 words that are the same on every article: the advertising price, a link to the latest news, and two e-mails.'],
  ad1: ['Ad', 'drop', '<code>img</code> from <code>ad.petel.bg</code>', 'One of 9 ad images on the page.'],
  ad2: ['Ad', 'drop', '<code>img</code> from <code>ad.petel.bg</code>', 'One of 9 ad images on the page.'],
  ad3: ['Ad', 'drop', '<code>img</code> from <code>ad.petel.bg</code>', 'One of 9 ad images on the page.'],
  admore: ['+ 5 more ads', 'drop', '<code>img</code> from <code>ad.petel.bg</code>', 'The other ad zones, around and between the blocks.'],
};
const LAYOUT = [
  ['row', ['logo', 'menu']],
  ['one', 'adtop'],
  ['cols', ['title', ['date', 'comments'], 'fb', 'photo', 'text1', 'promo', 'text2', 'editor', 'boiler'], ['ad1', 'ad2', 'ad3', 'admore']],
];
function initAnatomy() {
  const page = document.getElementById('pw-page'), info = document.getElementById('pw-info'), legend = document.getElementById('pw-legend');
  let mode = 'see', sel = null;
  const block = (id) => {
    const [label, kind] = BLOCKS[id];
    const b = document.createElement('button');
    b.type = 'button'; b.className = `pw-b pw-${id} ${kind}`; b.dataset.id = id;
    b.innerHTML = `<span class="pw-b-l">${esc(label)}</span><span class="pw-b-k">${kind === 'keep' ? 'kept' : 'left out'}</span>`;
    b.addEventListener('click', () => { sel = id; render(); });
    return b;
  };
  const div = (cls, kids) => { const d = document.createElement('div'); d.className = cls; kids.forEach(k => d.appendChild(k)); return d; };
  LAYOUT.forEach(([type, a, b]) => {
    if (type === 'row') page.appendChild(div('pw-row', a.map(block)));
    else if (type === 'one') page.appendChild(block(a));
    else {
      const art = div('pw-art', a.map(x => Array.isArray(x) ? div('pw-row', x.map(block)) : block(x)));
      art.insertAdjacentHTML('afterbegin', '<span class="pw-art-l">article.preview</span>');
      page.appendChild(div('pw-cols', [art, div('pw-side', b.map(block))]));
    }
  });
  pills(document.getElementById('pw-mode'), [['see', 'What the browser shows'], ['keep', 'What the script keeps']], mode, (m) => { mode = m; render(); });
  function render() {
    page.classList.toggle('show-keep', mode === 'keep');
    page.querySelectorAll('.pw-b').forEach(b => b.classList.toggle('sel', b.dataset.id === sel));
    legend.innerHTML = mode === 'keep'
      ? '<span class="pw-key keep"></span> kept by the script &nbsp; <span class="pw-key drop"></span> left out &nbsp;·&nbsp; the dashed frame is <code>article.preview</code>'
      : 'Everything here is in the HTML that <code>requests</code> downloads. The dashed frame is <code>article.preview</code>.';
    if (!sel) { info.innerHTML = '<p class="note">Click a block to see what it is and how the script finds it.</p>'; return; }
    const [label, kind, how, why] = BLOCKS[sel];
    info.innerHTML = `<p class="big"><b>${esc(label)}</b> · ${kind === 'keep' ? '<span class="pw-yes">kept</span>' : '<span class="pw-no">left out</span>'}</p>` +
      `<p>Found with: ${how}</p><p class="note">${why}</p>`;
  }
  render();
}

/* ---------- images: 1 of 14 ---------- */
const IMG_ROWS = [
  ['Article photo', 'keep', ['static.petel.bg/resources/2026/11/23/big_Screenshot_…png (in div.etargetnet_ads)']],
  ['Ads', 'drop', [2, 6, 23, 32, 3, 4, 30, 7, 26].map(z => `ad.petel.bg/www/delivery/avw.php?zoneid=${z}`)],
  ['Site images', 'drop', ['img/logo.png (the logo)', 'static.petel.bg/img/fb_butt.jpg (Facebook button)', 'static.petel.bg/img/loader.gif (loading animation)']],
  ['Promo banner in the text', 'drop', ['vihrogon.bg/wp-content/uploads/…/gemini_generated_image_….webp']],
];
function initImages() {
  const box = document.getElementById('pw-imgs');
  IMG_ROWS.forEach(([label, kind, srcs]) => {
    const row = document.createElement('div'); row.className = 'pw-irow';
    row.innerHTML = `<span class="pw-ilab">${esc(label)}</span><span class="pw-tiles"></span><span class="pw-icount">${srcs.length}</span>`;
    const tiles = row.querySelector('.pw-tiles');
    srcs.forEach(s => {
      const t = document.createElement('span'); t.className = 'pw-tile ' + kind;
      t.setAttribute('aria-label', s);
      withTip(t, `<b>${esc(label)}</b> · ${kind === 'keep' ? 'kept' : 'left out'}<br><code>${esc(s)}</code>`);
      tiles.appendChild(t);
    });
    box.appendChild(row);
  });
}

/* ---------- og:image vs the photo ---------- */
function initSizes() {
  const box = document.getElementById('pw-sizes');
  const S = [['The photo in the article', 'img.img-responsive → big_…png', 933, 493, 'keep'], ['og:image', '&lt;meta property="og:image"&gt; → medium_…png', 702, 371, 'drop']];
  const share = Math.round(100 * (702 * 371) / (933 * 493));
  S.forEach(([name, how, w, h, kind]) => {
    const c = document.createElement('div'); c.className = 'pw-size';
    c.innerHTML = `<div class="pw-size-frame"><div class="pw-size-img ${kind}" style="width:${(100 * w / 933).toFixed(1)}%; aspect-ratio:${w} / ${h};"></div></div>` +
      `<p><b>${name}</b><br><span class="note">${how}</span><br><span class="pw-num">${w} × ${h}</span></p>`;
    box.appendChild(c);
  });
  box.insertAdjacentHTML('beforeend', `<p class="pw-size-note">The og:image copy has ${share}% of the pixels of the photo shown in the article.</p>`);
}

/* ---------- words: 330 of 535 ---------- */
function initWords() {
  const box = document.getElementById('pw-words');
  const SEG = [[330, 'keep', 'Article text', 'kept by the script'], [73, 'drop', 'Boilerplate in div.item-text', 'ad price, links, e-mails'], [132, 'rest', 'Rest of the page', 'menus, title, date, links, ad captions']];
  const total = SEG.reduce((a, s) => a + s[0], 0);
  const brace = `<div class="pw-brace" style="width:${(100 * 403 / total).toFixed(2)}%"><span>div.item-text: 403 words</span></div>`;
  const bar = SEG.map(([n, k, l, d]) => `<span class="pw-seg ${k}" style="flex:${n} 1 0" data-n="${n}" data-l="${esc(l)}" data-d="${esc(d)}"></span>`).join('');
  const nums = SEG.map(([n, k]) => `<span class="pw-segn" style="flex:${n} 1 0">${n}</span>`).join('');
  const leg = SEG.map(([n, k, l, d]) => `<li><span class="pw-key ${k}"></span><b>${n}</b> ${esc(l)} <span class="note">(${esc(d)})</span></li>`).join('');
  box.innerHTML = `${brace}<div class="pw-nums">${nums}</div><div class="pw-bar">${bar}</div><ul class="pw-wleg">${leg}</ul><p class="note">${total} words of visible text on the page (scripts excluded).</p>`;
  box.querySelectorAll('.pw-seg').forEach(s => withTip(s, `<b>${s.dataset.l}</b>: ${s.dataset.n} words (${Math.round(100 * s.dataset.n / total)}%)<br>${s.dataset.d}`));
}

document.addEventListener('DOMContentLoaded', () => {
  initHero();
  initAnatomy();
  initImages();
  initSizes();
  initWords();
  window.addEventListener('scroll', hideTip, { passive: true });
});

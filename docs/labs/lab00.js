/* ===== Lab 00 interactivity ===== */

const SVG_NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
  if (parent) parent.appendChild(e);
  return e;
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* ---------- hero: a faint web of linked documents ---------- */
function initHero() {
  const svg = document.getElementById('in-hero-bg'), r = rng(11), docs = [];
  for (let i = 0; i < 24; i++) docs.push([20 + (i % 12) * 100 + r() * 50, 30 + Math.floor(i / 12) * 140 + r() * 80, i % 4]);
  docs.forEach(([x, y], i) => docs.forEach(([u, v], j) => {
    if (j > i && Math.hypot(u - x, v - y) < 160) el('line', { x1: (x + 14).toFixed(0), y1: (y + 18).toFixed(0), x2: (u + 14).toFixed(0), y2: (v + 18).toFixed(0), class: 'lk' }, svg);
  }));
  docs.forEach(([x, y, c]) => {
    const g = el('g', { class: 'dc c' + c, transform: `translate(${x.toFixed(0)} ${y.toFixed(0)})` }, svg);
    el('rect', { width: 28, height: 36, rx: 4 }, g);
    [9, 16, 23].forEach((ly, k) => el('line', { x1: 6, y1: ly, x2: k === 2 ? 16 : 22, y2: ly }, g));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initHero();
});

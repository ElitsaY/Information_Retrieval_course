/* ===== Lab 02 interactivity ===== */

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
const fmt = (n) => n.toLocaleString('en');

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
const setPill = (box, k) => box.querySelectorAll('.strat-btn').forEach(b => b.classList.toggle('active', b.dataset.k === String(k)));

/* ---------- JavaScript ports of the NLTK tokenizers and stemmers used in the notebook (nltk 3.9) ---------- */
const WCH = String.raw`[\p{L}\p{N}_]`;                  // Python's Unicode \w
const NOTW = String.raw`(?![\p{L}\p{N}_])`, NOTWB = String.raw`(?<![\p{L}\p{N}_])`;   // \b next to a word character
const PUNCTUATION = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';   // Python's string.punctuation
const isPunct = (tok) => PUNCTUATION.includes(tok);     // Python: tok in punctuation (a substring test)

// WhitespaceTokenizer and WordPunctTokenizer
const whitespaceTokenize = (s) => s.split(/[\s\x1c-\x1f]+/).filter(Boolean);   // Python also counts \x1c-\x1f as whitespace
const WP_RE = new RegExp(String.raw`[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s\x1c-\x1f]+`, 'gu');
const wordPunctTokenize = (s) => s.match(WP_RE) || [];

// TreebankWordTokenizer: the same sequence of regex substitutions
const TB_RULES = [
  [/^"/u, '``'], [/(``)/gu, ' $1 '], [/([ ([{<])("|'{2})/gu, '$1 `` '],
  [/([:,])([^\p{Nd}])/gu, ' $1 $2'], [/([:,])(?=\n?$)/gu, ' $1 '], [/\.\.\./gu, ' ... '], [/[;@#$%&]/gu, ' $& '],
  [/([^.])(\.)([\])}>"']*)\s*(?=\n?$)/gu, '$1 $2$3 '], [/[?!]/gu, ' $& '], [/([^'])' /gu, "$1 ' "],
  [/[\][(){}<>]/gu, ' $& '], [/--/gu, ' -- '],
];
const TB_END = [
  [/''/gu, " '' "], [/"/gu, " '' "], [/([^' ])('[sS]|'[mM]|'[dD]|') /gu, '$1 $2 '], [/([^' ])('ll|'LL|'re|'RE|'ve|'VE|n't|N'T) /gu, '$1 $2 '],
  ...[['can', 'not'], ['d', "'ye"], ['gim', 'me'], ['gon', 'na'], ['got', 'ta'], ['lem', 'me'], ['more', "'n"]]
    .map(([a, b]) => [new RegExp(`${NOTWB}(${a})(${b})${NOTW}`, 'giu'), ' $1 $2 ']),
  [new RegExp(`${NOTWB}(wan)(na)(?=\\s)`, 'giu'), ' $1 $2 '],
  [new RegExp(`\\s('t)(is)${NOTW}`, 'giu'), ' $1 $2 '], [new RegExp(`\\s('t)(was)${NOTW}`, 'giu'), ' $1 $2 '],
];
function treebankTokenize(s) {
  TB_RULES.forEach(([re, rep]) => { s = s.replace(re, rep); });
  s = ' ' + s + ' ';
  TB_END.forEach(([re, rep]) => { s = s.replace(re, rep); });
  return whitespaceTokenize(s);
}

// TweetTokenizer (default settings: case preserved, phone numbers matched)
const TW_RE = (() => {
  const L = String.raw`[\p{L}\p{Nl}\p{No}]`, D = String.raw`\p{Nd}`;
  const url = String.raw`(?:https?:(?:\/{1,3}|[a-z0-9%])|[a-z0-9.\-]+[.](?:[a-z]{2,13})\/)(?:[^\s()<>{}\[\]]+|\([^\s()]*?\([^\s()]+\)[^\s()]*?\)|\([^\s]+?\))+(?:\([^\s()]*?\([^\s()]+\)[^\s()]*?\)|\([^\s]+?\)|[^\s\x60!()\[\]{};:'".,<>?«»“”‘’])|(?:(?<!@)[a-z0-9]+(?:[.\-][a-z0-9]+)*[.](?:[a-z]{2,13})${NOTW}\/?(?!@))`;
  const phone = String.raw`(?:(?:\+?[01][ *\-.)]*)?(?:[(]?${D}{3}[ *\-.)]*)?${D}{3}[ *\-.)]*${D}{4})`;
  const emo = String.raw`(?:[<>]?[:;=8][\-o*']?[)\](\[dDpP\/:}{@|\\]|[)\](\[dDpP\/:}{@|\\][\-o*']?[:;=8][<>]?|<\/?3)`;
  const skin = String.raw`[\u{1F3FB}-\u{1F3FF}]`;
  const parts = [url, phone, emo, String.raw`<[^>\s]+>`, String.raw`[\-]+>|<[\-]+`, `(?:@${WCH}+)`,
    String.raw`(?:#+${WCH}+[\p{L}\p{N}_'\-]*${WCH}+)`, String.raw`[\p{L}\p{N}_.+\-]+@[\p{L}\p{N}_\-]+\.(?:[\p{L}\p{N}_\-]\.?)+[\p{L}\p{N}_\-]`,
    String.raw`[^\n](?:${skin}?(?:‍[^\n]${skin}?)+|${skin})`,
    String.raw`(?:[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}\u{E0067}\u{E0062}(?:\u{E0065}\u{E006E}\u{E0067}|\u{E0073}\u{E0063}\u{E0074}|\u{E0077}\u{E006C}\u{E0073})\u{E007F})`,
    String.raw`(?:${L}(?:${L}|['\-_])+${L})|(?:[+\-]?${D}+[,/.:\-]${D}+[+\-]?)|(?:${WCH}+)|(?:\.(?:\s*\.){1,})|(?:\S)`];
  return new RegExp(parts.join('|'), 'giu');
})();
const HTML_ENT = {"AElig":198,"Aacute":193,"Acirc":194,"Agrave":192,"Alpha":913,"Aring":197,"Atilde":195,"Auml":196,"Beta":914,"Ccedil":199,"Chi":935,"Dagger":8225,"Delta":916,"ETH":208,"Eacute":201,"Ecirc":202,"Egrave":200,"Epsilon":917,"Eta":919,"Euml":203,"Gamma":915,"Iacute":205,"Icirc":206,"Igrave":204,"Iota":921,"Iuml":207,"Kappa":922,"Lambda":923,"Mu":924,"Ntilde":209,"Nu":925,"OElig":338,"Oacute":211,"Ocirc":212,"Ograve":210,"Omega":937,"Omicron":927,"Oslash":216,"Otilde":213,"Ouml":214,"Phi":934,"Pi":928,"Prime":8243,"Psi":936,"Rho":929,"Scaron":352,"Sigma":931,"THORN":222,"Tau":932,"Theta":920,"Uacute":218,"Ucirc":219,"Ugrave":217,"Upsilon":933,"Uuml":220,"Xi":926,"Yacute":221,"Yuml":376,"Zeta":918,"aacute":225,"acirc":226,"acute":180,"aelig":230,"agrave":224,"alefsym":8501,"alpha":945,"amp":38,"and":8743,"ang":8736,"aring":229,"asymp":8776,"atilde":227,"auml":228,"bdquo":8222,"beta":946,"brvbar":166,"bull":8226,"cap":8745,"ccedil":231,"cedil":184,"cent":162,"chi":967,"circ":710,"clubs":9827,"cong":8773,"copy":169,"crarr":8629,"cup":8746,"curren":164,"dArr":8659,"dagger":8224,"darr":8595,"deg":176,"delta":948,"diams":9830,"divide":247,"eacute":233,"ecirc":234,"egrave":232,"empty":8709,"emsp":8195,"ensp":8194,"epsilon":949,"equiv":8801,"eta":951,"eth":240,"euml":235,"euro":8364,"exist":8707,"fnof":402,"forall":8704,"frac12":189,"frac14":188,"frac34":190,"frasl":8260,"gamma":947,"ge":8805,"gt":62,"hArr":8660,"harr":8596,"hearts":9829,"hellip":8230,"iacute":237,"icirc":238,"iexcl":161,"igrave":236,"image":8465,"infin":8734,"int":8747,"iota":953,"iquest":191,"isin":8712,"iuml":239,"kappa":954,"lArr":8656,"lambda":955,"lang":9001,"laquo":171,"larr":8592,"lceil":8968,"ldquo":8220,"le":8804,"lfloor":8970,"lowast":8727,"loz":9674,"lrm":8206,"lsaquo":8249,"lsquo":8216,"lt":60,"macr":175,"mdash":8212,"micro":181,"middot":183,"minus":8722,"mu":956,"nabla":8711,"nbsp":160,"ndash":8211,"ne":8800,"ni":8715,"not":172,"notin":8713,"nsub":8836,"ntilde":241,"nu":957,"oacute":243,"ocirc":244,"oelig":339,"ograve":242,"oline":8254,"omega":969,"omicron":959,"oplus":8853,"or":8744,"ordf":170,"ordm":186,"oslash":248,"otilde":245,"otimes":8855,"ouml":246,"para":182,"part":8706,"permil":8240,"perp":8869,"phi":966,"pi":960,"piv":982,"plusmn":177,"pound":163,"prime":8242,"prod":8719,"prop":8733,"psi":968,"quot":34,"rArr":8658,"radic":8730,"rang":9002,"raquo":187,"rarr":8594,"rceil":8969,"rdquo":8221,"real":8476,"reg":174,"rfloor":8971,"rho":961,"rlm":8207,"rsaquo":8250,"rsquo":8217,"sbquo":8218,"scaron":353,"sdot":8901,"sect":167,"shy":173,"sigma":963,"sigmaf":962,"sim":8764,"spades":9824,"sub":8834,"sube":8838,"sum":8721,"sup":8835,"sup1":185,"sup2":178,"sup3":179,"supe":8839,"szlig":223,"tau":964,"there4":8756,"theta":952,"thetasym":977,"thinsp":8201,"thorn":254,"tilde":732,"times":215,"trade":8482,"uArr":8657,"uacute":250,"uarr":8593,"ucirc":251,"ugrave":249,"uml":168,"upsih":978,"upsilon":965,"uuml":252,"weierp":8472,"xi":958,"yacute":253,"yen":165,"yuml":255,"zeta":950,"zwj":8205,"zwnj":8204};   // html.entities.name2codepoint
function tweetTokenize(s) {
  s = s.replace(/&(#?(x?))([^&;\s]+);/gu, (m, g1, g2, body) => {
    let n = null;
    if (g1) { n = parseInt(body, g2 ? 16 : 10); if (isNaN(n)) n = null; else if (n >= 0x80 && n <= 0x9f) return new TextDecoder('windows-1252').decode(new Uint8Array([n])); }
    else n = HTML_ENT[body] ?? null;
    try { return n === null ? '' : String.fromCodePoint(n); } catch (e) { return ''; }
  });
  s = s.replace(/([^a-zA-Z0-9])\1{3,}/gu, '$1$1$1');
  return s.match(TW_RE) || [];
}

// PorterStemmer (NLTK_EXTENSIONS mode, the default)
const PORTER_POOL = { sky: 'sky', skies: 'sky', dying: 'die', lying: 'lie', tying: 'tie', news: 'news', innings: 'inning', inning: 'inning', outings: 'outing', outing: 'outing', cannings: 'canning', canning: 'canning', howe: 'howe', proceed: 'proceed', exceed: 'exceed', succeed: 'succeed' };
const porterStem = (() => {
  const V = 'aeiou';
  const cons = (w, i) => (V.includes(w[i]) ? false : w[i] === 'y' ? (i === 0 ? true : !cons(w, i - 1)) : true);
  const m = (s) => { let cv = ''; for (let i = 0; i < s.length; i++) cv += cons(s, i) ? 'c' : 'v'; return cv.split('vc').length - 1; };
  const hasV = (s) => { for (let i = 0; i < s.length; i++) if (!cons(s, i)) return true; return false; };
  const dbl = (w) => w.length >= 2 && w[w.length - 1] === w[w.length - 2] && cons(w, w.length - 1);
  const cvc = (w) => (w.length >= 3 && cons(w, w.length - 3) && !cons(w, w.length - 2) && cons(w, w.length - 1) && !'wxy'.includes(w[w.length - 1])) ||
    (w.length === 2 && !cons(w, 0) && cons(w, 1));
  const cut = (w, suf) => (suf ? w.slice(0, -suf.length) : w);
  const pos = (s) => m(s) > 0, gt1 = (s) => m(s) > 1;
  function rules(w, list) {
    for (const [suf, rep, cond] of list) {
      if (suf === '*d' && dbl(w)) { const st = w.slice(0, -2); return !cond || cond(st) ? st + rep : w; }
      if (w.endsWith(suf)) { const st = cut(w, suf); return !cond || cond(st) ? st + rep : w; }
    }
    return w;
  }
  const s1a = (w) => (w.endsWith('ies') && w.length === 4 ? cut(w, 'ies') + 'ie' : rules(w, [['sses', 'ss'], ['ies', 'i'], ['ss', 'ss'], ['s', '']]));
  function s1b(w) {
    if (w.endsWith('ied')) return cut(w, 'ied') + (w.length === 4 ? 'ie' : 'i');
    if (w.endsWith('eed')) { const st = cut(w, 'eed'); return m(st) > 0 ? st + 'ee' : w; }
    let im = null;
    for (const suf of ['ed', 'ing']) if (w.endsWith(suf) && hasV(cut(w, suf))) { im = cut(w, suf); break; }
    if (im === null) return w;
    const last = im[im.length - 1];
    return rules(im, [['at', 'ate'], ['bl', 'ble'], ['iz', 'ize'], ['*d', last, () => !'lsz'.includes(last)], ['', 'e', (st) => m(st) === 1 && cvc(st)]]);
  }
  const s1c = (w) => rules(w, [['y', 'i', (st) => st.length > 1 && cons(st, st.length - 1)]]);
  function s2(w) {
    if (w.endsWith('alli') && pos(cut(w, 'alli'))) return s2(cut(w, 'alli') + 'al');
    return rules(w, [['ational', 'ate', pos], ['tional', 'tion', pos], ['enci', 'ence', pos], ['anci', 'ance', pos], ['izer', 'ize', pos], ['bli', 'ble', pos],
      ['alli', 'al', pos], ['entli', 'ent', pos], ['eli', 'e', pos], ['ousli', 'ous', pos], ['ization', 'ize', pos], ['ation', 'ate', pos], ['ator', 'ate', pos],
      ['alism', 'al', pos], ['iveness', 'ive', pos], ['fulness', 'ful', pos], ['ousness', 'ous', pos], ['aliti', 'al', pos], ['iviti', 'ive', pos], ['biliti', 'ble', pos],
      ['fulli', 'ful', pos], ['logi', 'log', () => pos(w.slice(0, -3))]]);
  }
  const s3 = (w) => rules(w, [['icate', 'ic', pos], ['ative', '', pos], ['alize', 'al', pos], ['iciti', 'ic', pos], ['ical', 'ic', pos], ['ful', '', pos], ['ness', '', pos]]);
  const s4 = (w) => rules(w, [['al', '', gt1], ['ance', '', gt1], ['ence', '', gt1], ['er', '', gt1], ['ic', '', gt1], ['able', '', gt1], ['ible', '', gt1], ['ant', '', gt1],
    ['ement', '', gt1], ['ment', '', gt1], ['ent', '', gt1], ['ion', '', (st) => m(st) > 1 && 'st'.includes(st[st.length - 1] || '#')], ['ou', '', gt1], ['ism', '', gt1],
    ['ate', '', gt1], ['iti', '', gt1], ['ous', '', gt1], ['ive', '', gt1], ['ize', '', gt1]]);
  function s5a(w) {
    if (w.endsWith('e')) { const st = w.slice(0, -1); if (m(st) > 1) return st; if (m(st) === 1 && !cvc(st)) return st; }
    return w;
  }
  const s5b = (w) => rules(w, [['ll', 'l', () => m(w.slice(0, -1)) > 1]]);
  return function (word) {
    const st = word.toLowerCase();
    if (Object.hasOwn(PORTER_POOL, word)) return PORTER_POOL[st];
    if ([...word].length <= 2) return st;
    return s5b(s5a(s4(s3(s2(s1c(s1b(s1a(st))))))));
  };
})();

// SnowballStemmer('english'), i.e. Porter2
const snowballStem = (() => {
  const V = 'aeiouy', has = (s, ch) => ch !== undefined && s.includes(ch);
  const DBL = ['bb', 'dd', 'ff', 'gg', 'mm', 'nn', 'pp', 'rr', 'tt'];
  const SPECIAL = { skis: 'ski', skies: 'sky', dying: 'die', lying: 'lie', tying: 'tie', idly: 'idl', gently: 'gentl', ugly: 'ugli', early: 'earli', only: 'onli', singly: 'singl', sky: 'sky', news: 'news', howe: 'howe', atlas: 'atlas', cosmos: 'cosmos', bias: 'bias', andes: 'andes', inning: 'inning', innings: 'inning', outing: 'outing', outings: 'outing', canning: 'canning', cannings: 'canning', herring: 'herring', herrings: 'herring', earring: 'earring', earrings: 'earring', proceed: 'proceed', proceeds: 'proceed', proceeded: 'proceed', proceeding: 'proceed', exceed: 'exceed', exceeds: 'exceed', exceeded: 'exceed', exceeding: 'exceed', succeed: 'succeed', succeeds: 'succeed', succeeded: 'succeed', succeeding: 'succeed' };
  const S2 = ['ization', 'ational', 'fulness', 'ousness', 'iveness', 'tional', 'biliti', 'lessli', 'entli', 'ation', 'alism', 'aliti', 'ousli', 'iviti', 'fulli', 'enci', 'anci', 'abli', 'izer', 'ator', 'alli', 'bli', 'ogi', 'li'];
  const S3 = ['ational', 'tional', 'alize', 'icate', 'iciti', 'ative', 'ical', 'ness', 'ful'];
  const S4 = ['ement', 'ance', 'ence', 'able', 'ible', 'ment', 'ant', 'ent', 'ism', 'ate', 'iti', 'ous', 'ive', 'ize', 'ion', 'al', 'er', 'ic'];
  const drop = (s, n) => s.slice(0, Math.max(0, s.length - n));
  const rep = (s, suf, r) => drop(s, suf.length) + r;
  function r1r2(w) {
    let r1 = '', r2 = '';
    for (let i = 1; i < w.length; i++) if (!has(V, w[i]) && has(V, w[i - 1])) { r1 = w.slice(i + 1); break; }
    for (let i = 1; i < r1.length; i++) if (!has(V, r1[i]) && has(V, r1[i - 1])) { r2 = r1.slice(i + 1); break; }
    return [r1, r2];
  }
  return function (word) {
    let w = word.toLowerCase();
    if (w.length <= 2) return w;
    if (Object.hasOwn(SPECIAL, w)) return SPECIAL[w];
    w = w.replace(/[’‘‛]/g, "'");
    if (w.startsWith("'")) w = w.slice(1);
    if (w.startsWith('y')) w = 'Y' + w.slice(1);
    for (let i = 1; i < w.length; i++) if (has(V, w[i - 1]) && w[i] === 'y') w = w.slice(0, i) + 'Y' + w.slice(i + 1);
    let r1 = '', r2 = '';
    if (/^(gener|commun|arsen)/.test(w)) {
      r1 = /^(gener|arsen)/.test(w) ? w.slice(5) : w.slice(6);
      for (let i = 1; i < r1.length; i++) if (!has(V, r1[i]) && has(V, r1[i - 1])) { r2 = r1.slice(i + 1); break; }
    } else [r1, r2] = r1r2(w);
    const cutAll = (n) => { w = drop(w, n); r1 = drop(r1, n); r2 = drop(r2, n); };
    const repAll = (suf, r, r2else = '') => {
      w = rep(w, suf, r);
      r1 = r1.length >= suf.length ? rep(r1, suf, r) : '';
      r2 = r2.length >= suf.length ? rep(r2, suf, r) : r2else;
    };
    // step 0
    for (const suf of ["'s'", "'s", "'"]) if (w.endsWith(suf)) { cutAll(suf.length); break; }
    // step 1a
    for (const suf of ['sses', 'ied', 'ies', 'us', 'ss', 's']) {
      if (!w.endsWith(suf)) continue;
      if (suf === 'sses') cutAll(2);
      else if (suf === 'ied' || suf === 'ies') cutAll(drop(w, suf.length).length > 1 ? 2 : 1);
      else if (suf === 's') { if ([...drop(w, 2)].some(c => has(V, c))) cutAll(1); }
      break;
    }
    // step 1b
    for (const suf of ['eedly', 'ingly', 'edly', 'eed', 'ing', 'ed']) {
      if (!w.endsWith(suf)) continue;
      if (suf === 'eed' || suf === 'eedly') { if (r1.endsWith(suf)) repAll(suf, 'ee'); }
      else if ([...drop(w, suf.length)].some(c => has(V, c))) {
        cutAll(suf.length);
        if (/(at|bl|iz)$/.test(w)) { w += 'e'; r1 += 'e'; if (w.length > 5 || r1.length >= 3) r2 += 'e'; }
        else if (DBL.some(d => w.endsWith(d))) cutAll(1);
        else if ((r1 === '' && w.length >= 3 && !has(V, w.at(-1)) && !'wxY'.includes(w.at(-1)) && has(V, w.at(-2)) && !has(V, w.at(-3))) ||
                 (r1 === '' && w.length === 2 && has(V, w[0]) && !has(V, w[1]))) {
          w += 'e'; if (r1.length > 0) r1 += 'e'; if (r2.length > 0) r2 += 'e';
        }
      }
      break;
    }
    // step 1c
    if (w.length > 2 && 'yY'.includes(w.at(-1)) && !has(V, w.at(-2))) {
      w = w.slice(0, -1) + 'i';
      r1 = r1.length >= 1 ? r1.slice(0, -1) + 'i' : '';
      r2 = r2.length >= 1 ? r2.slice(0, -1) + 'i' : '';
    }
    // step 2
    for (const suf of S2) {
      if (!w.endsWith(suf)) continue;
      if (r1.endsWith(suf)) {
        if (suf === 'tional' || suf === 'entli' || suf === 'fulli' || suf === 'lessli') cutAll(2);
        else if (suf === 'enci' || suf === 'anci' || suf === 'abli') {
          w = w.slice(0, -1) + 'e'; r1 = r1.length >= 1 ? r1.slice(0, -1) + 'e' : ''; r2 = r2.length >= 1 ? r2.slice(0, -1) + 'e' : '';
        }
        else if (suf === 'izer' || suf === 'ization') repAll(suf, 'ize');
        else if (suf === 'ational' || suf === 'ation' || suf === 'ator') repAll(suf, 'ate', 'e');
        else if (suf === 'alism' || suf === 'aliti' || suf === 'alli') repAll(suf, 'al');
        else if (suf === 'fulness') cutAll(4);
        else if (suf === 'ousli' || suf === 'ousness') repAll(suf, 'ous');
        else if (suf === 'iveness' || suf === 'iviti') repAll(suf, 'ive', 'e');
        else if (suf === 'biliti' || suf === 'bli') repAll(suf, 'ble');
        else if (suf === 'ogi' && w.at(-4) === 'l') cutAll(1);
        else if (suf === 'li' && has('cdeghkmnrt', w.at(-3))) cutAll(2);
      }
      break;
    }
    // step 3
    for (const suf of S3) {
      if (!w.endsWith(suf)) continue;
      if (r1.endsWith(suf)) {
        if (suf === 'tional') cutAll(2);
        else if (suf === 'ational') repAll(suf, 'ate');
        else if (suf === 'alize') cutAll(3);
        else if (suf === 'icate' || suf === 'iciti' || suf === 'ical') repAll(suf, 'ic');
        else if (suf === 'ful' || suf === 'ness') cutAll(suf.length);
        else if (suf === 'ative' && r2.endsWith(suf)) cutAll(5);
      }
      break;
    }
    // step 4
    for (const suf of S4) {
      if (!w.endsWith(suf)) continue;
      if (r2.endsWith(suf)) {
        if (suf === 'ion') { if (has('st', w.at(-4))) cutAll(3); }
        else cutAll(suf.length);
      }
      break;
    }
    // step 5
    if (r2.endsWith('l') && w.at(-2) === 'l') w = w.slice(0, -1);
    else if (r2.endsWith('e')) w = w.slice(0, -1);
    else if (r1.endsWith('e')) {
      if (w.length >= 4 && (has(V, w.at(-2)) || has('wxY', w.at(-2)) || !has(V, w.at(-3)) || has(V, w.at(-4)))) w = w.slice(0, -1);
    }
    return w.replace(/Y/g, 'y');
  };
})();

// LancasterStemmer (Paice/Husk rules)
const lancasterStem = (() => {
  const RULES = 'ai*2. a*1. bb1. city3s. ci2> cn1t> dd1. dei3y> deec2ss. dee1. de2> dooh4> e1> feil1v. fi2> gni3> gai3y. ga2> gg1. ht*2. hsiug5ct. hsi3> i*1. i1y> ji1d. juf1s. ju1d. jo1d. jeh1r. jrev1t. jsim2t. jn1d. j1s. lbaifi6. lbai4y. lba3> lbi3. lib2l> lc1. lufi4y. luf3> lu2. lai3> lau3> la2> ll1. mui3. mu*2. msi3> mm1. nois4j> noix4ct. noi3> nai3> na2> nee0. ne2> nn1. pihs4> pp1. re2> rae0. ra2. ro2> ru2> rr1. rt1> rei3y> sei3y> sis2. si2> ssen4> ss0. suo3> su*2. s*1> s0. tacilp4y. ta2> tnem4> tne3> tna3> tpir2b. tpro2b. tcud1. tpmus2. tpec2iv. tulo2v. tsis0. tsi3> tt1. uqi3. ugo1. vis3j> vie0. vi2> ylb1> yli3y> ylp0. yl2> ygo1. yhp1. ymo1. ypo1. yti3> yte3> ytl2. yrtsi5. yra3> yro3> yfi3. ycn2t> yca3> zi2> zy1s.'
    .split(' ').map(r => { const [, end, intact, n, app, cont] = r.match(/^([a-z]+)(\*?)(\d)([a-z]*)([>.]?)$/); return { first: r[0], end: [...end].reverse().join(''), intact: !!intact, n: +n, app, stop: cont === '.' }; });
  const BY = {};
  RULES.forEach(r => (BY[r.first] = BY[r.first] || []).push(r));
  const VW = 'aeiouy';
  const ok = (w, n) => (VW.includes(w[0]) ? w.length - n >= 2 : w.length - n >= 3 && (VW.includes(w[1]) || VW.includes(w[2])));
  return function (word) {
    let w = word.toLowerCase();
    const intact = w;
    for (;;) {
      let last = -1;
      for (let i = 0; i < w.length; i++) { if (/\p{L}/u.test(w[i])) last = i; else break; }
      if (last < 0 || !BY[w[last]]) break;
      let applied = false, stop = false;
      for (const r of BY[w[last]]) {
        if (!w.endsWith(r.end)) continue;
        if (r.intact) {
          if (w === intact && ok(w, r.n)) { w = w.slice(0, w.length - r.n) + r.app; applied = true; stop = r.stop; break; }
        } else if (ok(w, r.n)) { w = w.slice(0, w.length - r.n) + r.app; applied = true; stop = r.stop; break; }
      }
      if (!applied || stop) break;
    }
    return w;
  };
})();

/* ---------- stopwords, lemmas, and the preprocessing pipeline ---------- */
// nltk.corpus.stopwords.words('english') as printed in the notebook (179 words; newer NLTK data has 198)
const NLTK_STOP = "i me my myself we our ours ourselves you you're you've you'll you'd your yours yourself yourselves he him his himself she she's her hers herself it it's its itself they them their theirs themselves what which who whom this that that'll these those am is are was were be been being have has had having do does did doing a an the and but if or because as until while of at by for with about against between into through during before after above below to from up down in out on off over under again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very s t can will just don don't should should've now d ll m o re ve y ain aren aren't couldn couldn't didn didn't doesn doesn't hadn hadn't hasn hasn't haven haven't isn isn't ma mightn mightn't mustn mustn't needn needn't shan shan't shouldn shouldn't wasn wasn't weren weren't won won't wouldn wouldn't".split(' ');
const STOP_SET = new Set(NLTK_STOP);
const lemmaN = (w) => (typeof LEM_N !== 'undefined' && Object.hasOwn(LEM_N, w) ? LEM_N[w] : w);
const lemmaV = (w) => (typeof LEM_V !== 'undefined' && Object.hasOwn(LEM_V, w) ? LEM_V[w] : w);
const STEMMERS = { porter: porterStem, snowball: snowballStem, lancaster: lancasterStem, lemma: lemmaN };
const memo = {};
const normalize = (kind, t) => { const m = memo[kind] || (memo[kind] = new Map()); let v = m.get(t); if (v === undefined) { v = STEMMERS[kind](t); m.set(t, v); } return v; };

const NUM_RE = /^[+\-$]?[\p{Nd}.,:\/\-]*\p{Nd}[\p{Nd}.,:\/\-]*%?$/u;
const isNumber = (t) => NUM_RE.test(t);
const isHost = (t) => /\p{L}/u.test(t) && (/[\p{L}\p{N}][.@!\/][\p{L}\p{N}]/u.test(t) || /^<.+@.+>$/u.test(t));
const hostParts = (t) => t.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

const TOKENIZERS = { ws: whitespaceTokenize, wp: wordPunctTokenize, tb: treebankTokenize, tw: tweetTokenize };
const TOKENIZER_NAMES = { ws: 'Whitespace', wp: 'WordPunct', tb: 'Treebank', tw: 'Tweet' };

// the posts: [whole post, header, subject, body, quoted lines], split exactly like the Python that produced the sentence spans
const QUOTE_RE = /^\s*[>|]|writes:\s*$|wrote:\s*$/;
function postParts(c) {
  const k = c.indexOf('\n\n');
  const head = k >= 0 ? c.slice(0, k) : c, body = k >= 0 ? c.slice(k + 2) : '';
  const sl = head.split('\n').find(l => l.startsWith('Subject:'));
  const bl = body.split('\n');
  return [c, head, sl ? sl.slice(8).trim() : '', bl.filter(l => !QUOTE_RE.test(l)).join('\n'), bl.filter(l => QUOTE_RE.test(l)).join('\n')];
}
function spanSents(t, sp) {
  const out = []; let prev = 0;
  if (sp) sp.split(' ').forEach(x => { const [g, l] = x.split('.').map(v => parseInt(v, 36)); const a = prev + g; out.push(t.slice(a, a + l)); prev = a + l; });
  return out;
}
let SC = null;   // [{f, subject, parts: [5 texts], sents: [5 sentence lists]}]
function corpus() {
  if (!SC) SC = SC_DOCS.map(d => { const parts = postParts(d.t); return { f: d.f, t: d.t, subject: parts[2], parts, sents: parts.map((p, k) => spanSents(p, d.sp[k])) }; });
  return SC;
}
const tokCache = {};
function partTokens(tk, i, k) {
  const key = tk + i + '_' + k;
  if (!tokCache[key]) tokCache[key] = corpus()[i].sents[k].flatMap(TOKENIZERS[tk]);
  return tokCache[key];
}
const PART_SETS = { all: { keep: [0], drop: [1, 3] }, subject: { keep: [2, 3, 4], drop: [2, 3] }, none: { keep: [3, 4], drop: [3] } };

const NOTEBOOK_CFG = { tok: 'tw', headers: 'all', quotes: 'keep', lower: true, punct: true, numbers: false, hosts: 'keep', stop: 'nltk', custom: '', norm: 'porter' };
const LAB01_CFG = { tok: 'tw', headers: 'all', quotes: 'keep', lower: true, punct: true, numbers: false, hosts: 'keep', stop: 'none', custom: '', norm: 'none' };

// the steps after tokenization, in order; each maps a token list to a token list
function pipelineSteps(cfg) {
  const custom = new Set(cfg.custom.split(/[\s,]+/).filter(Boolean));
  const stop = cfg.stop === 'none' ? null : cfg.stop === 'nltk' ? STOP_SET : new Set([...STOP_SET, ...custom]);
  return [
    { key: 'lower', label: 'Lower-case', on: cfg.lower, f: ts => ts.map(t => t.toLowerCase()) },
    { key: 'punct', label: 'Drop punctuation', on: cfg.punct, f: ts => ts.filter(t => !isPunct(t)) },
    { key: 'numbers', label: 'Drop numbers', on: cfg.numbers, f: ts => ts.filter(t => !isNumber(t)) },
    { key: 'hosts', label: cfg.hosts === 'split' ? 'Split hosts, e-mails' : 'Drop hosts, e-mails', on: cfg.hosts !== 'keep',
      f: ts => (cfg.hosts === 'drop' ? ts.filter(t => !isHost(t)) : ts.flatMap(t => (isHost(t) ? hostParts(t) : [t]))) },
    { key: 'stop', label: cfg.stop === 'custom' ? 'Stopwords (NLTK + yours)' : 'NLTK stopwords', on: !!stop, f: ts => ts.filter(t => !stop.has(t)) },
    { key: 'norm', label: { porter: 'Porter stemmer', snowball: 'Snowball stemmer', lancaster: 'Lancaster stemmer', lemma: 'WordNet lemmatizer' }[cfg.norm], on: cfg.norm !== 'none',
      f: ts => ts.map(t => normalize(cfg.norm, t)) },
  ];
}
function rawDocTokens(cfg, i) { return PART_SETS[cfg.headers][cfg.quotes].flatMap(k => partTokens(cfg.tok, i, k)); }
function processTokens(cfg, ts) { pipelineSteps(cfg).forEach(s => { if (s.on) ts = s.f(ts); }); return ts; }
function docTokens(cfg, i) { return processTokens(cfg, rawDocTokens(cfg, i)); }
function queryTerms(cfg, q) { return [...new Set(processTokens(cfg, TOKENIZERS[cfg.tok](q)))]; }

function stats(docs) {
  const vocab = new Set(); let postings = 0, tokens = 0;
  docs.forEach(ts => { const s = new Set(ts); postings += s.size; tokens += ts.length; s.forEach(t => vocab.add(t)); });
  return { terms: vocab.size, postings, tokens };
}
// dictionary size etc. after tokenization and after each enabled step
function funnel(cfg) {
  let docs = corpus().map((_, i) => rawDocTokens(cfg, i));
  const rows = [{ key: 'tok', label: TOKENIZER_NAMES[cfg.tok] + ' tokens', ...stats(docs) }];
  pipelineSteps(cfg).forEach(s => { if (s.on) { docs = docs.map(s.f); rows.push({ key: s.key, label: s.label, ...stats(docs) }); } });
  return { rows, docs };
}
function buildIndex(docs) {
  const freq = new Map(), post = new Map();
  docs.forEach((ts, i) => ts.forEach(t => {
    freq.set(t, (freq.get(t) || 0) + 1);
    if (!post.has(t)) post.set(t, new Set());
    post.get(t).add(i);
  }));
  return { freq, post };
}
function andQuery(index, terms) {
  if (!terms.length) return [];
  let res = null;
  terms.forEach(t => { const p = index.post.get(t) || new Set(); res = res === null ? [...p] : res.filter(d => p.has(d)); });
  return res.sort((a, b) => a - b);
}

/* ---------- maths rendering ---------- */
function initMath() {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.body, {
    delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
}

/* ---------- hero: rows of tokens, some trimmed (stems), some dropped (stopwords) ---------- */
function initHero() {
  const svg = document.getElementById('tp-hero-bg');
  const r = rng(22);
  for (let y = 18; y < 300; y += 34) {
    let x = -40 + r() * 80;
    while (x < 1240) {
      const w = 30 + Math.floor(r() * 70), kind = r(), c = Math.floor(r() * 4);
      if (kind < 0.18) el('rect', { x, y, width: w * 0.6, height: 20, rx: 6, class: 'gone' }, svg);
      else {
        const stem = kind < 0.55 ? Math.round(w * (0.55 + r() * 0.25)) : w;
        el('rect', { x, y, width: stem, height: 20, rx: 6, class: 'tok c' + c }, svg);
        if (stem < w) el('rect', { x: x + stem + 2, y, width: w - stem, height: 20, rx: 6, class: 'suf' }, svg);
      }
      x += w + 14 + r() * 26;
    }
  }
}

/* ---------- chips ---------- */
const PUNCT_ONLY = /^[\p{P}\p{S}]+$/u;
const chip = (t, cls = '') => `<span class="chip tk-chip${PUNCT_ONLY.test(t) ? ' punct' : ''}${cls}">${esc(t)}</span>`;

/* ---------- the indexing pipeline on the notebook's example document ---------- */
const HURRICANE = [
  'Hurricane-force winds have struck central and northern Portugal, leaving 300,000 homes without power.',
  'The remnants of Hurricane Leslie swept in overnight on Saturday, with winds gusting up to 176km/h (109mph).',
  'Civil defence officials said 27 people suffered minor injuries, with localised flooding, hundreds of trees uprooted and a number of flights cancelled.',
  'The storm, one of the most powerful to ever hit the country, is now passing over northern Spain.',
];
// one token through lower-case → punctuation → stopwords → Porter: [term or null, reason]
function lingSteps(t) {
  const l = t.toLowerCase();
  if (isPunct(l)) return [null, 'punct'];
  if (STOP_SET.has(l)) return [null, 'stop'];
  return [porterStem(l), l === t ? '' : 'lower'];
}
function initFlow() {
  const svg = document.getElementById('fl-svg'), out = document.getElementById('fl-out'), cap = document.getElementById('fl-cap');
  const stepBox = document.getElementById('fl-steps');
  const STEPS = [
    ['Documents', 'The collection: the notebook\'s example document, one sentence per document (doc 0–3).'],
    ['Tokenizer', 'TweetTokenizer splits each document into tokens. Punctuation marks (red) are tokens too.'],
    ['Linguistic modules', 'Lower-case, drop punctuation, drop NLTK stopwords, Porter stemmer. Struck-out tokens are dropped; the rest become the index terms.'],
    ['Indexer', 'Sort the (term, doc id) pairs, merge duplicates, split into dictionary and postings (Lab 01). Terms found in more than one document are highlighted.'],
  ];
  let step = 0;
  const NODES = [
    { x: 8, w: 86, label: 'Documents', data: true, s: 0 }, { x: 118, w: 96, label: 'Tokenizer', s: 1 }, { x: 238, w: 62, label: 'tokens', data: true, s: 1 },
    { x: 324, w: 150, label: 'Linguistic modules', s: 2 }, { x: 498, w: 58, label: 'terms', data: true, s: 2 }, { x: 580, w: 76, label: 'Indexer', s: 3 },
    { x: 676, w: 80, label: 'Inverted index', data: true, s: 3 },
  ];
  function drawSvg() {
    svg.innerHTML = '';
    NODES.forEach((n, i) => {
      const g = el('g', { class: 'fl-node' + (n.data ? ' data' : ' proc') + (n.s === step ? ' cur' : ''), tabindex: 0, role: 'button' }, svg);
      el('rect', { x: n.x, y: 34, width: n.w, height: 52, rx: n.data ? 6 : 12 }, g);
      const words = n.label === 'Inverted index' ? ['Inverted', 'index'] : n.label === 'Linguistic modules' ? ['Linguistic', 'modules'] : [n.label];
      words.forEach((w, k) => txt(g, n.x + n.w / 2, 64 + (k - (words.length - 1) / 2) * 16, w, 'fl-t', 'middle'));
      const pick = () => setStep(n.s);
      g.addEventListener('click', pick);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      if (i < NODES.length - 1) {
        const x1 = n.x + n.w + 3, x2 = NODES[i + 1].x - 3;
        el('line', { x1, y1: 60, x2: x2 - 6, y2: 60, class: 'fl-arrow' }, svg);
        el('path', { d: `M${x2 - 7} 55 L${x2} 60 L${x2 - 7} 65 Z`, class: 'fl-head' }, svg);
      }
    });
    txt(svg, 8, 112, 'Click a stage. Processes are the solid boxes; their outputs are the outlined ones.', 'tick');
  }
  function setStep(s) {
    step = Math.max(0, Math.min(3, s));
    setPill(stepBox, step); drawSvg(); render();
  }
  pills(stepBox, STEPS.map((x, i) => [String(i), `${i + 1} · ${x[0]}`]), '0', k => setStep(+k));
  document.getElementById('fl-prev').addEventListener('click', () => setStep(step - 1));
  document.getElementById('fl-next').addEventListener('click', () => setStep(step + 1));

  function render() {
    cap.innerHTML = `<b>Step ${step + 1}.</b> ${esc(STEPS[step][1])}`;
    document.getElementById('fl-prev').disabled = step === 0;
    document.getElementById('fl-next').disabled = step === 3;
    const toks = HURRICANE.map(tweetTokenize);
    if (step === 0) out.innerHTML = HURRICANE.map((h, i) => `<div class="ii-step"><span class="ii-step-l">doc ${i}</span><p class="tk-raw">${esc(h)}</p></div>`).join('');
    else if (step === 1) out.innerHTML = toks.map((ts, i) => `<div class="ii-step"><span class="ii-step-l">doc ${i} · ${ts.length} tokens</span><div class="chip-row">${ts.map(t => chip(t)).join('')}</div></div>`).join('');
    else if (step === 2) {
      out.innerHTML = `<p class="bt-legend" style="margin:0 0 0.6rem;"><span class="k" style="background:#d9546e;"></span> punctuation &nbsp; <span class="k" style="background:var(--ink-soft);"></span> stopword &nbsp; <span class="k" style="background:var(--ucs);"></span> changed by lower-casing or stemming</p>` +
        toks.map((ts, i) => {
          const cs = ts.map(t => { const [term, why] = lingSteps(t); return term === null ? `<span class="chip tk-chip gone ${why}">${esc(t)}</span>` : term !== t ? `<span class="chip tk-chip changed" title="${esc(t)}"><s>${esc(t)}</s> ${esc(term)}</span>` : chip(t); });
          const kept = ts.filter(t => lingSteps(t)[0] !== null).length;
          return `<div class="ii-step"><span class="ii-step-l">doc ${i} · ${kept} of ${ts.length} kept</span><div class="chip-row">${cs.join('')}</div></div>`;
        }).join('');
    } else {
      const post = new Map();
      toks.forEach((ts, i) => ts.forEach(t => { const term = lingSteps(t)[0]; if (term === null) return; if (!post.has(term)) post.set(term, new Set()); post.get(term).add(i); }));
      const terms = [...post.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      out.innerHTML = `<p class="note">${terms.length} terms in the dictionary, ${[...post.values()].reduce((s, p) => s + p.size, 0)} postings.</p><div class="fl-dict">` +
        terms.map(t => { const p = [...post.get(t)]; return `<span class="fl-entry${p.length > 1 ? ' multi' : ''}"><code>${esc(t)}</code><span class="fl-df">${p.length}</span>${p.map(d => `<span class="ib-post">${d}</span>`).join('')}</span>`; }).join('') + '</div>' +
        `<p class="caption-note" style="margin-top:0.8rem;">💡 Stemming merged <b>winds</b> (docs 0, 1) and <b>northern</b> (docs 0, 3) into shared terms. But the tokenizer kept <b>Hurricane-force</b> as one token, so its term <code>hurricane-forc</code> never meets <code>hurrican</code> (doc 1): a query for <i>hurricane</i> misses doc 0.</p>`;
    }
  }
  setStep(0);
}

/* ---------- sentence splitting with Punkt (outputs precomputed with NLTK 3.9) ---------- */
const PUNKT = {
  nb: { label: 'Notebook document', text: '\n' + HURRICANE.join('\n\n') + '\n', untrained: HURRICANE.map((h, i) => (i ? h : '\n' + h)), english: HURRICANE.map((h, i) => (i ? h : '\n' + h)) },
  abbr: { label: 'Abbreviations', text: 'Mr. Smith paid $4.20 for 2.5 kg of apples at 3 p.m. on Friday. He works for the U.S. Department of Energy. Was it worth it? Dr. Jones thinks so.',
    untrained: ['Mr.', 'Smith paid $4.20 for 2.5 kg of apples at 3 p.m.', 'on Friday.', 'He works for the U.S.', 'Department of Energy.', 'Was it worth it?', 'Dr.', 'Jones thinks so.'],
    english: ['Mr. Smith paid $4.20 for 2.5 kg of apples at 3 p.m. on Friday.', 'He works for the U.S. Department of Energy.', 'Was it worth it?', 'Dr. Jones thinks so.'] },
  post: { label: 'Newsgroup post', text: 'In article <C5JA6s.A59@cs.psu.edu> so@eiffel.cs.psu.edu (Nicol C So) writes:\n>In article <897@pivot.sbi.com> bet@sbi.com (Bennett Todd @ Salomon Brothers Inc., NY ) writes:\n>>This came up because I decided to configure up MIT-MAGIC-COOKIE-1 security\n>>for X11R5. For this to work you need to stick some bits that an intruder\n>>can\'t guess in a file (readable only by you) which X client applications\n>>read. They pass the bits back to the server when they want to establish a\n>>connection.\n>>\n>>...',
    untrained: null, english: ['In article <C5JA6s.A59@cs.psu.edu> so@eiffel.cs.psu.edu (Nicol C So) writes:\n>In article <897@pivot.sbi.com> bet@sbi.com (Bennett Todd @ Salomon Brothers Inc., NY ) writes:\n>>This came up because I decided to configure up MIT-MAGIC-COOKIE-1 security\n>>for X11R5.', 'For this to work you need to stick some bits that an intruder\n>>can\'t guess in a file (readable only by you) which X client applications\n>>read.', 'They pass the bits back to the server when they want to establish a\n>>connection.', '>>\n>>...'] },
  hard: { label: 'Still hard', text: '"Stop!" he said... Then he left. It was 5 a.m. The end. See Fig. 3 in Sec. 2.1 for details.',
    untrained: null, english: ['"Stop!"', 'he said... Then he left.', 'It was 5 a.m.', 'The end.', 'See Fig.', '3 in Sec.', '2.1 for details.'] },
};
PUNKT.post.untrained = PUNKT.post.english; PUNKT.hard.untrained = PUNKT.hard.english;
function initSentences() {
  const out = document.getElementById('ss-out');
  let pre = 'nb', model = 'untrained';
  pills(document.getElementById('ss-pre'), Object.entries(PUNKT).map(([k, p]) => [k, p.label]), pre, k => { pre = k; render(); });
  pills(document.getElementById('ss-model'), [['untrained', 'PunktSentenceTokenizer()'], ['english', 'sent_tokenize (trained English)']], model, k => { model = k; render(); });
  function render() {
    const p = PUNKT[pre], ss = p[model], other = p[model === 'english' ? 'untrained' : 'english'];
    const mark = (s) => esc(s.trim()).replace(/\n/g, '<span class="ss-nl">↵</span>').replace(/(\p{L})\.(?=.)/gu, '$1<span class="ss-dot">.</span>');
    out.innerHTML = `<div class="ss-text"><span class="ii-step-l">Text</span><p class="tk-raw">${esc(p.text.trim()).replace(/\n/g, '<span class="ss-nl">↵</span><br>')}</p></div>` +
      '<ol class="ss-list">' + ss.map(s => `<li>${mark(s)}</li>`).join('') + '</ol>' +
      `<p class="note"><b>${ss.length}</b> sentences. The other model finds <b>${other.length}</b>.` +
      (ss.length !== other.length ? ' ❗ The untrained tokenizer has no list of abbreviations, so it ends a sentence at <i>Mr.</i>, <i>p.m.</i>, <i>U.S.</i> and <i>Dr.</i>' : '') + ' Periods inside a sentence are highlighted.</p>';
  }
  render();
}

/* ---------- four word tokenizers side by side ---------- */
const TZ_PRE = {
  s0: [HURRICANE[0], 'Whitespace keeps punctuation glued to the words: <code>Portugal,</code> and <code>power.</code>'],
  s2: [HURRICANE[2], 'WordPunct splits off every run of punctuation.'],
  money: ['On a $50,000 mortgage of 30 years at 8 percent, the monthly payment would be $366.88.', 'WordPunct breaks <code>$50,000</code> into <code>$ 50 , 000</code>; Treebank keeps <code>50,000</code> and <code>366.88</code> whole.'],
  email: ['My email is admin@sth.com', 'Treebank splits the e-mail at <code>@</code>; Tweet keeps it as one token.'],
  tweet: ['Last sunny day before winter :) #sunisenergy', 'Tweet keeps the emoticon <code>:)</code> and the hashtag.'],
  ip: ['Here is my ip address 192.33.24.45', 'Tweet reads <code>192.33</code> and <code>24.45</code> as two decimal numbers. The notebook: "we might want to fix this".'],
  cant: ["I can't stop singing that song!", "Tweet keeps <code>can't</code>, Treebank gives <code>ca</code> + <code>n't</code>. The notebook: \"we might want to split can't in can, 't instead\"."],
  kmh: [HURRICANE[1], 'Tweet: <code>176km</code> <code>/</code> <code>h</code>. The notebook: "maybe we want to keep km/h together apart from 176?"'],
  it: ['Eugenia e Jack sposi e innamorati (ma la magia di Harry e Meghan non c’è)', 'Tweet: <code>c</code> <code>’</code> <code>è</code>. The notebook: "maybe we want language specific tokenizers".'],
  url: ['Read https://en.wikipedia.org/wiki/Tokenization_(lexical_analysis) or www.nltk.org today.', 'Tweet and Whitespace keep the URL whole (Whitespace also keeps the final <code>today.</code>). WordPunct cuts it into 14 pieces, Treebank breaks it after <code>https :</code>.'],
  dash: ['The state-of-the-art model was released on 2024-09-27 by a New York-based lab.', 'Hyphens: is <code>York-based</code> one token? Tweet cuts the date into <code>2024-09-</code> and <code>27</code>.'],
  code: ["C++ and C# are faster than Node.js, said O'Neill.", 'Names with symbols: Tweet gives <code>C + +</code>, WordPunct <code>Node . js</code> and <code>O \' Neill</code>. Only Whitespace keeps <code>C#</code>, because it splits on spaces only.'],
  abbr: ['U.S.A. vs USA, e.g. Ph.D. students at 5 p.m.', 'Abbreviations: Tweet and WordPunct spell them out letter by letter; Treebank splits <code>p.m</code> + <code>.</code> at the end of the text.'],
  emoji: ['Great talk 👍🏽🔥 by @nlp_lab!!! #NLProc', 'Only Tweet separates the two emoji and keeps <code>@nlp_lab</code> and <code>#NLProc</code>.'],
  phone: ['Call +1 (555) 123-4567 before 10:30am, tickets cost €25.50.', 'Tweet matches the whole phone number, spaces included, as one token, and splits <code>€</code> from the price.'],
  cjk: ['Lebensversicherungsgesellschaft vs 信息检索很有趣', 'No spaces, no split: a German compound and a Chinese sentence each stay one token. These languages need word segmentation.'],
};
function initTokenizers() {
  const inp = document.getElementById('tz-in'), out = document.getElementById('tz-out'), note = document.getElementById('tz-note');
  const box1 = document.getElementById('tz-pre1'), box2 = document.getElementById('tz-pre2');
  const NB = [['s0', 'sentences[0]'], ['s2', 'sentences[2]'], ['money', 'Mortgage'], ['email', 'E-mail'], ['tweet', 'Tweet'], ['ip', 'IP address'], ['cant', "can't"], ['kmh', 'km/h'], ['it', 'Italian']];
  const MORE = [['url', 'URL'], ['dash', 'Hyphens, dates'], ['code', 'C++, C#'], ['abbr', 'Abbreviations'], ['emoji', 'Emoji, @, #'], ['phone', 'Phone, prices'], ['cjk', 'No spaces']];
  const pick = (k) => { setPill(box1, k); setPill(box2, k); inp.value = TZ_PRE[k][0]; note.innerHTML = '💡 ' + TZ_PRE[k][1]; render(); };
  pills(box1, NB, 's0', pick); pills(box2, MORE, null, pick);
  function render() {
    out.innerHTML = Object.entries(TOKENIZERS).map(([k, f]) => {
      const ts = f(inp.value);
      return `<div class="ii-step"><span class="ii-step-l">${TOKENIZER_NAMES[k]} · ${ts.length}</span><div class="chip-row">${ts.map(t => chip(t)).join('') || '—'}</div></div>`;
    }).join('');
  }
  inp.addEventListener('input', () => { setPill(box1, null); setPill(box2, null); note.innerHTML = ''; render(); });
  pick('s0');
}

/* ---------- normalize a text ---------- */
const NZ_PRE = {
  car: 'Car sharing will bring a whole new era to the automobile industry. Eventually, it may even decreas air pollutions.',
  storm: HURRICANE[1],
  hurt: 'The Who sang "To be or not to be" in the US. Apple\'s new iPhone 15 costs $999, but IT won\'t help us with Windows 95.',
};
function initNormalize() {
  const inp = document.getElementById('nz-in'), out = document.getElementById('nz-out');
  const cb = (id) => document.getElementById(id);
  let norm = 'porter';
  pills(document.getElementById('nz-pre'), [['car', 'Car sharing'], ['storm', 'Hurricane'], ['hurt', 'When it hurts']], 'car', k => { inp.value = NZ_PRE[k]; render(); });
  pills(document.getElementById('nz-norm'), [['none', 'No stemming'], ['porter', 'Porter'], ['snowball', 'Snowball'], ['lancaster', 'Lancaster'], ['lemma', 'WordNet lemma']], norm, k => { norm = k; render(); });
  inp.value = NZ_PRE.car;
  function render() {
    const cfg = { lower: cb('nz-lower').checked, punct: cb('nz-punct').checked, numbers: cb('nz-num').checked, stop: cb('nz-stop').checked };
    const ts = tweetTokenize(inp.value);
    const res = ts.map(t => {
      let x = cfg.lower ? t.toLowerCase() : t;
      if (cfg.punct && isPunct(x)) return [t, null, 'punct'];
      if (cfg.numbers && isNumber(x)) return [t, null, 'num'];
      if (cfg.stop && STOP_SET.has(x)) return [t, null, 'stop'];
      if (norm !== 'none') x = normalize(norm, x);
      return [t, x, ''];
    });
    const kept = res.filter(r => r[1] !== null);
    out.innerHTML = `<div class="chip-row">` + res.map(([t, x, why]) => x === null ? `<span class="chip tk-chip gone ${why}">${esc(t)}</span>` :
      x !== t ? `<span class="chip tk-chip changed"><s>${esc(t)}</s> ${esc(x)}</span>` : chip(t)).join('') + '</div>' +
      `<p class="note" style="margin-top:0.6rem;">Tokens: <b>${ts.length}</b> → <b>${kept.length}</b>. Distinct: <b>${new Set(ts).size}</b> → <b>${new Set(kept.map(r => r[1])).size}</b>.</p>`;
  }
  ['nz-lower', 'nz-punct', 'nz-num', 'nz-stop'].forEach(id => cb(id).addEventListener('change', render));
  inp.addEventListener('input', render);
  render();
}

/* ---------- the NLTK stopword list ---------- */
function initStoplist() {
  const box = document.getElementById('sw-list'), q = document.getElementById('sw-q'), cnt = document.getElementById('sw-count');
  function render() {
    const s = q.value.trim().toLowerCase();
    const words = s ? s.split(/\s+/) : [];
    box.innerHTML = NLTK_STOP.map(w => `<span class="chip tk-chip${words.includes(w) ? ' hit' : ''}">${esc(w)}</span>`).join('');
    cnt.innerHTML = words.length ? words.map(w => `<b>${esc(w)}</b> ${STOP_SET.has(w) ? 'is' : 'is <u>not</u>'} a stopword`).join(' · ') : `${NLTK_STOP.length} words`;
  }
  q.addEventListener('input', render);
  render();
}

/* ---------- stemmers and the lemmatizer side by side ---------- */
const ST_PRE = {
  nb: ['Notebook examples', 'agreed children flies humbled colonizer owned meeting sitting understood whom'],
  car: ['Car sharing', NZ_PRE.car],
  over: ['Over-stemming', 'university universe universal organization organ organic news new general generator'],
  under: ['Under-stemming', 'children child mice mouse ran run understood understand geese goose was is'],
};
function initStemmers() {
  const inp = document.getElementById('st-in'), table = document.getElementById('st-table'), groups = document.getElementById('st-groups');
  pills(document.getElementById('st-pre'), Object.entries(ST_PRE).map(([k, p]) => [k, p[0]]), 'nb', k => { inp.value = ST_PRE[k][1]; render(); });
  inp.value = ST_PRE.nb[1];
  const COLS = [['PorterStemmer', porterStem], ['LancasterStemmer', lancasterStem], ['SnowballStemmer', snowballStem], ['lemmatize(w)', lemmaN], ["lemmatize(w, 'v')", lemmaV]];
  function render() {
    const words = tweetTokenize(inp.value);
    table.innerHTML = `<thead><tr><th>original</th>${COLS.map(([n]) => `<th>${esc(n)}</th>`).join('')}</tr></thead><tbody>` +
      words.map(w => `<tr><td><code>${esc(w)}</code></td>${COLS.map(([, f]) => { const v = f(w); return `<td class="${v === w ? 'same' : 'diff'}">${esc(v)}</td>`; }).join('')}</tr>`).join('') + '</tbody>';
    // words that one method maps to the same output
    const uniq = [...new Set(words.filter(w => !PUNCT_ONLY.test(w)))];
    const rows = COLS.map(([n, f]) => {
      const g = new Map();
      uniq.forEach(w => { const v = f(w); if (!g.has(v)) g.set(v, []); g.get(v).push(w); });
      const merged = [...g.entries()].filter(([, ws]) => ws.length > 1);
      return `<div class="ii-step"><span class="ii-step-l">${esc(n)}</span><div class="chip-row">${merged.length ? merged.map(([v, ws]) => `<span class="chip st-group"><b>${esc(v)}</b> ← ${ws.map(esc).join(', ')}</span>`).join('') : '<span class="note">no two words merged</span>'}</div></div>`;
    });
    groups.innerHTML = rows.join('');
  }
  inp.addEventListener('input', render);
  render();
}

/* ---------- the preprocessing pipeline on sci.crypt + querying ---------- */
const DEFAULT_CUSTOM = 'path subject newsgroups message-id date apr gmt lines organization references sender xref writes article sci.crypt cantaloupe.srv.cs.cmu.edu ... would could also one';
const QUERY_SCENARIOS = {
  keys: { label: 'keys', q: 'keys', cfg: {}, why: '✅ Stemming maps <b>keys</b> and <b>key</b> to one term, so the query also finds posts that only say <i>key</i>.' },
  wiretap: { label: 'wiretapping', q: 'wiretapping', cfg: {}, why: '✅ Nobody writes <i>wiretapping</i>, but posts say <i>wiretap</i> and <i>wiretaps</i>: 0 → 20 documents.' },
  random: { label: 'random numbers', q: 'random numbers', cfg: {}, why: '✅ <i>numbers</i> is in a single post, and not together with <i>random</i>; the stem <code>number</code> also matches <i>number</i>.' },
  not: { label: 'not secure', q: 'not secure', cfg: {}, why: '❌ <i>not</i> is a stopword, so the query becomes just <code>secur</code>: the negation is lost.' },
  data: { label: 'data (Lancaster)', q: 'data', cfg: { norm: 'lancaster' }, why: '❌ Lancaster stems <i>data</i> and <i>date</i> to <code>dat</code>. Every post has a <i>Date:</i> header, so all 100 match.' },
  general: { label: 'general (Porter vs Snowball)', q: 'general', cfg: {}, why: '❌ Porter maps <i>general</i>, <i>generally</i>, <i>generate</i>, <i>generation</i> and <i>generators</i> to <code>gener</code>. Switch the normalization to Snowball: its special rule for words starting with <i>gener-</i> keeps <code>general</code> apart.' },
  us: { label: 'US (lemmatizer)', q: 'US', cfg: { norm: 'lemma' }, why: '❌ Lower-casing turns the country <i>US</i> into the pronoun <i>us</i>, and the WordNet lemmatizer then reads it as the plural of the letter <i>u</i>.' },
  cmu: { label: 'cmu (split hosts)', q: 'cmu', cfg: { hosts: 'split' }, why: 'Splitting host names makes <i>cmu</i> a term, but it comes from the <i>Path:</i> header of every post. Now try <b>Headers: drop</b>.' },
  year: { label: '1993 (drop numbers)', q: '1993', cfg: { numbers: true }, why: '❌ With numbers dropped, the query has no terms left.' },
};
function initPipeline() {
  const cfg = { ...NOTEBOOK_CFG, custom: DEFAULT_CUSTOM };
  const $ = (id) => document.getElementById(id);
  const boxes = { tok: $('pp-tok'), headers: $('pp-head'), hosts: $('pp-hosts'), stop: $('pp-stop'), norm: $('pp-norm') };
  pills(boxes.tok, Object.entries(TOKENIZER_NAMES), cfg.tok, k => { cfg.tok = k; update(); });
  pills(boxes.headers, [['all', 'keep all'], ['subject', 'Subject only'], ['none', 'drop']], cfg.headers, k => { cfg.headers = k; update(); });
  pills(boxes.hosts, [['keep', 'keep'], ['drop', 'drop'], ['split', 'split into words']], cfg.hosts, k => { cfg.hosts = k; update(); });
  pills(boxes.stop, [['none', 'none'], ['nltk', 'NLTK'], ['custom', 'NLTK + yours']], cfg.stop, k => { cfg.stop = k; update(); });
  pills(boxes.norm, [['none', 'none'], ['porter', 'Porter'], ['snowball', 'Snowball'], ['lancaster', 'Lancaster'], ['lemma', 'WordNet lemma']], cfg.norm, k => { cfg.norm = k; update(); });
  const checks = { quotes: $('pp-quotes'), lower: $('pp-lower'), punct: $('pp-punct'), numbers: $('pp-num') };
  const custom = $('pp-custom');
  custom.value = cfg.custom;
  Object.entries(checks).forEach(([k, c]) => c.addEventListener('change', () => { cfg[k] = k === 'quotes' ? (c.checked ? 'drop' : 'keep') : c.checked; update(); }));
  custom.addEventListener('input', () => { cfg.custom = custom.value; update(); });
  $('pp-reset').addEventListener('click', () => { setCfg({ ...NOTEBOOK_CFG, custom: cfg.custom }); });
  function setCfg(c) {
    Object.assign(cfg, c);
    Object.entries(boxes).forEach(([k, b]) => setPill(b, cfg[k]));
    checks.quotes.checked = cfg.quotes === 'drop'; checks.lower.checked = cfg.lower; checks.punct.checked = cfg.punct; checks.numbers.checked = cfg.numbers;
    update();
  }

  const svg = $('pp-funnel'), statsBox = $('pp-stats'), top = $('pp-top'), docBox = $('pp-doc');
  let current = null;
  const baseline = { index: null };
  function update() {
    $('pp-custom-row').classList.toggle('show', cfg.stop === 'custom');
    const fu = funnel(cfg);
    current = { cfg: { ...cfg }, index: buildIndex(fu.docs), rows: fu.rows, docs: fu.docs };
    drawFunnel(fu.rows); drawTop(); drawDoc(); renderQuery();
  }
  function drawFunnel(rows) {
    const first = rows[0], last = rows[rows.length - 1];
    statsBox.innerHTML = [[fmt(last.tokens), 'tokens'], [fmt(last.terms), 'terms in the dictionary'], [fmt(last.postings), 'postings'],
      [`${Math.round(100 * (1 - last.terms / first.terms))}%`, 'fewer terms than after tokenizing']]
      .map(([n, l]) => `<div class="stat"><span class="n">${n}</span><span class="l">${l}</span></div>`).join('');
    svg.innerHTML = '';
    const W = 760, L = 170, R = 70, rowH = 32, T = 8, H = T + rows.length * rowH + 22;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const max = Math.max(...rows.map(r => r.terms));
    rows.forEach((r, i) => {
      const y = T + i * rowH, w = (W - L - R) * r.terms / max;
      txt(svg, L - 8, y + 18, r.label, 'fn-l', 'end');
      el('rect', { x: L, y: y + 4, width: Math.max(w, 1), height: rowH - 10, rx: 4, class: 'fn-bar' + (i === rows.length - 1 ? ' last' : i === 0 ? ' first' : '') }, svg);
      txt(svg, L + w + 6, y + 18, fmt(r.terms), 'fn-n');
      if (i > 0) { const d = r.terms - rows[i - 1].terms; txt(svg, W - 4, y + 18, (d > 0 ? '+' : d < 0 ? '−' : '±') + fmt(Math.abs(d)), 'fn-d' + (d > 0 ? ' up' : ''), 'end'); }
    });
    txt(svg, L, H - 4, 'dictionary size (number of distinct terms) after each step', 'tick');
  }
  function drawTop() {
    const arr = [...current.index.freq].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 15);
    const max = arr.length ? arr[0][1] : 1;
    top.innerHTML = `<thead><tr><th>term</th><th>freq</th><th>df</th></tr></thead><tbody>` +
      arr.map(([t, f]) => `<tr><td><code>${esc(t)}</code></td><td><span class="pp-bar" style="width:${(100 * f / max).toFixed(1)}%"></span><b>${f}</b></td><td>${current.index.post.get(t).size}</td></tr>`).join('') + '</tbody>';
  }
  function drawDoc() {
    const ts = current.docs[1];
    docBox.innerHTML = `<p class="note">Document 1 (<code>${corpus()[1].f}</code>) after the pipeline: ${ts.length} tokens; the first 80:</p><div class="chip-row pp-chips">${ts.slice(0, 80).map(t => chip(t)).join('')}</div>`;
  }

  // querying: the Lab 01 index vs the current pipeline
  const qIn = $('qq-in'), qOut = $('qq-out'), why = $('qq-why'), cfgNote = $('qq-cfg');
  pills($('qq-pre'), Object.entries(QUERY_SCENARIOS).map(([k, s]) => [k, s.label]), null, k => {
    const s = QUERY_SCENARIOS[k];
    qIn.value = s.q; why.innerHTML = s.why;
    setCfg({ ...NOTEBOOK_CFG, custom: cfg.custom, ...s.cfg });
  });
  qIn.addEventListener('input', () => { why.innerHTML = ''; setPill($('qq-pre'), null); renderQuery(); });
  function describe(c) {
    const parts = [TOKENIZER_NAMES[c.tok]];
    if (c.headers !== 'all') parts.push(c.headers === 'none' ? 'no headers' : 'Subject only');
    if (c.quotes === 'drop') parts.push('no quotes');
    if (c.lower) parts.push('lower-case'); if (c.punct) parts.push('no punctuation'); if (c.numbers) parts.push('no numbers');
    if (c.hosts !== 'keep') parts.push(c.hosts === 'split' ? 'hosts split' : 'no hosts');
    if (c.stop !== 'none') parts.push(c.stop === 'nltk' ? 'NLTK stopwords' : 'NLTK + your stopwords');
    if (c.norm !== 'none') parts.push({ porter: 'Porter', snowball: 'Snowball', lancaster: 'Lancaster', lemma: 'WordNet lemma' }[c.norm]);
    return parts.join(' · ');
  }
  function renderQuery() {
    if (!current) return;
    if (!baseline.index) baseline.index = buildIndex(funnel(LAB01_CFG).docs);
    cfgNote.textContent = describe(current.cfg);
    const q = qIn.value;
    const side = (c, index) => { const terms = queryTerms(c, q); return { terms, res: andQuery(index, terms), dfs: terms.map(t => (index.post.get(t) || new Set()).size) }; };
    const A = side(LAB01_CFG, baseline.index), B = side(current.cfg, current.index);
    const inA = new Set(A.res), inB = new Set(B.res);
    const col = (name, s) => `<div class="qq-col"><p class="qq-h">${name}</p><p>${s.terms.length ? s.terms.map((t, i) => `<code>${esc(t)}</code> <span class="qp-df">df ${s.dfs[i]}</span>`).join(' AND ') : '<i>no terms left</i>'}</p><p class="big"><b>${s.res.length}</b> document${s.res.length === 1 ? '' : 's'}</p></div>`;
    const all = [...new Set([...A.res, ...B.res])].sort((a, b) => a - b);
    const gained = B.res.filter(d => !inA.has(d)).length, lost = A.res.filter(d => !inB.has(d)).length;
    qOut.innerHTML = `<div class="qq-cols">${col('Lab 01 index', A)}${col('Your pipeline', B)}</div>` +
      `<p class="note">${gained ? `<span class="qq-tag plus">+${gained} found</span>` : ''} ${lost ? `<span class="qq-tag minus">−${lost} lost</span>` : ''} ${!gained && !lost ? 'Same documents.' : ''}</p>` +
      (all.length ? `<ul class="qq-docs">${all.map(d => `<li class="${inA.has(d) && inB.has(d) ? '' : inB.has(d) ? 'plus' : 'minus'}"><b>${corpus()[d].f}</b> ${esc(corpus()[d].subject)}</li>`).join('')}</ul>` : '');
  }
  qIn.value = 'keys'; why.innerHTML = QUERY_SCENARIOS.keys.why; setPill($('qq-pre'), 'keys');
  update();
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initHero();
  initFlow();
  initSentences();
  initTokenizers();
  initNormalize();
  initStoplist();
  initStemmers();
  initPipeline();
});

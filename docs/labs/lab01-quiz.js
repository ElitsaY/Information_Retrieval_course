/* ===== Lab 01 quiz: question data (rendered and graded by quiz.js) ===== */
const M = String.raw;
const LAB = 'lab01-inverted-index.html';
const code = (s) => `<pre class="qz-code">${s}</pre>`;
// a Python code card, styled and highlighted by code-cards.js (loaded after quiz.js)
const pyCard = (file, src) => `<details class="code-card" open><summary><span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="code-file">${file}</span><span class="code-lang">Python</span><button type="button" class="code-copy">Copy</button><span class="code-chevron" aria-hidden="true">▾</span></summary><pre class="code-body"><code class="lang-py">${src}</code></pre></details>`;
// ---------- visual helpers (styles: "Lab 01 (IR) quiz visuals" in style.css) ----------
// documents as small sheets of paper
const papers = (rows) => `<div class="qz-papers" style="grid-template-columns: repeat(${rows.length}, minmax(0, 9.5rem))">` + rows.map(([id, text]) => `<div class="qz-paper"><span class="qz-paper-id">${id}</span><p>${text}</p></div>`).join('') + '</div>';
// a chip, optionally with a small caption under it
const chip = (t, cap = '', cls = '') => `<span class="qz-chip ${cls}"><b>${t}</b>${cap ? `<small>${cap}</small>` : ''}</span>`;
// a left → right flow of chip groups
const flow = (...groups) => '<div class="qz-flow">' + groups.map(g => `<div class="qz-flow-g">${g}</div>`).join('<span class="qz-flow-ar">→</span>') + '</div>';
// a short case description: who searches what, under which constraints
const caseCard = (who, text) => `<div class="qz-case"><span class="qz-case-k">Case</span><p><b>${who}.</b> ${text}</p></div>`;
// postings lists as linked boxes
const postings = (rows) => '<div class="qz-pls">' + rows.map(([name, ids]) => `<div class="qz-pl"><span class="qz-pl-name">${name}</span><span class="qz-pl-ids">${ids.map(d => `<b>${d}</b>`).join('<i>→</i>')}</span></div>`).join('') + '</div>';
// horizontal bars, e.g. document frequencies
const bars = (rows, max) => '<div class="qz-bars">' + rows.map(([lab, v]) => `<div class="qz-bar-row"><span>${lab}</span><div><i style="width:${(100 * v / max).toFixed(1)}%"></i></div><b>${v}</b></div>`).join('') + '</div>';
// a postings list with one skip pointer, and the other list's current document
function skipFig(ids, from, to, curA, curB) {
  const W = 70, x = (i) => 30 + i * W, y = 92;
  const box = (i, d, cls) => `<rect x="${x(i)}" y="${y}" width="46" height="34" rx="8" class="qz-sk-box ${cls}"/><text x="${x(i) + 23}" y="${y + 23}" class="qz-sk-t">${d}</text>`;
  let g = `<text x="2" y="${y + 23}" class="qz-sk-name">A</text>`;
  ids.forEach((d, i) => { g += box(i, d, i === curA ? 'cur' : ''); if (i < ids.length - 1) g += `<line x1="${x(i) + 46}" y1="${y + 17}" x2="${x(i + 1)}" y2="${y + 17}" class="qz-sk-link"/>`; });
  const x1 = x(from) + 23, x2 = x(to) + 23;
  g += `<path d="M${x1},${y} C${x1},${y - 62} ${x2},${y - 62} ${x2},${y - 6}" class="qz-sk-arc" marker-end="url(#qz-sk-ah)"/><text x="${(x1 + x2) / 2}" y="${y - 52}" class="qz-sk-lbl">skip pointer</text>`;
  g += `<text x="${x(curA) + 23}" y="${y + 56}" class="qz-sk-lbl">▲ current in A</text>`;
  g += `<text x="2" y="${y + 104}" class="qz-sk-name">B</text><text x="${x(0) - 4}" y="${y + 104}" class="qz-sk-dots">…</text>` + `<rect x="${x(0) + 20}" y="${y + 81}" width="46" height="34" rx="8" class="qz-sk-box cur"/><text x="${x(0) + 43}" y="${y + 104}" class="qz-sk-t">${curB}</text><text x="${x(0) + 80}" y="${y + 104}" class="qz-sk-dots">…</text><text x="${x(0) + 100}" y="${y + 104}" class="qz-sk-lbl start">◀ current in B</text>`;
  return `<div class="qz-fig qz-skip"><svg viewBox="0 0 ${x(ids.length - 1) + 60} 230" role="img" aria-label="Postings list A with a skip pointer"><defs><marker id="qz-sk-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="qz-sk-ahp"/></marker></defs>${g}</svg></div>`;
}

window.QUIZ = {
  id: 'ir-lab01',
  skills: [
    { id: 'model', label: 'The Boolean retrieval model', href: LAB + '#task' },
    { id: 'index', label: 'Dictionary and postings', href: LAB + '#inverted-index' },
    { id: 'norm', label: 'From text to terms', href: LAB + '#text' },
    { id: 'bool', label: 'Boolean query processing', href: LAB + '#boolean' },
    { id: 'skip', label: 'Skip pointers', href: LAB + '#faster' },
    { id: 'phrase', label: 'Phrase and positional retrieval', href: LAB + '#phrase' },
    { id: 'design', label: 'Case scenarios: designing a system', href: LAB + '#summary' },
  ],
  tasks: [
    /* ---------- Part A: the Boolean model and the index ---------- */
    {
      id: 't_scan', title: 'Index or scan?', type: 'single choice', level: 'Easy', skill: 'model',
      intro: caseCard('A collection of 10 million documents', 'It receives thousands of queries a day. One option is to search the full text of every document for each query, as <code>grep</code> would; the other is to build an inverted index once, in advance.'),
      parts: [{ kind: 'mc', pts: 3, q: 'What is the main reason to build the index?', answer: 1, options: [
        'Scanning returns wrong documents for AND queries.',
        'A query then reads only the postings of its terms.',
        'The index keeps the documents in compressed form.',
        'Scanning cannot handle more than one query term.'] }],
      explain: '<p>Scanning costs time proportional to the <b>whole collection</b>, again for every query. The index is built once; a query then fetches the postings of its own terms and never reads the documents. Scanning is not wrong (it finds the same matches), and an inverted index is not a compressed copy of the documents.</p>',
    },
    {
      id: 't_bool', title: 'The Boolean retrieval model', type: 'select all', level: 'Easy', skill: 'model',
      parts: [{ kind: 'multi', pts: 3, q: 'Which statements about Boolean retrieval are true?', answer: [0, 2, 4], options: [
        'The answer is a set: a document matches or it does not.',
        'Results are ordered by how often the query terms occur.',
        'A long AND query often returns nothing, a long OR query far too much.',
        'It matches synonyms such as car and automobile automatically.',
        'Writing good Boolean queries takes practice.'] }],
      explain: '<p>The Boolean model returns an <b>unranked set</b>, and term frequencies play no role. Its downsides: no ranking, <i>feast or famine</i> (AND of many terms: nothing; OR: too much), exact matching without synonyms or variants, and queries that are hard to write. These are the motivations for ranked retrieval.</p>',
    },
    {
      id: 'q01', title: 'Counting tokens and terms', type: 'single choice', level: 'Easy', skill: 'index',
      intro: '<p>A document contains this text. The indexing pipeline tokenizes, removes punctuation and lower-cases.</p>' + papers([['doc', 'Friends, FRIENDS!']]),
      parts: [{ kind: 'mc', pts: 3, q: 'Which statement is correct?', answer: 2, options: [
        'The line has one token and two dictionary terms.',
        'It yields two terms, Friends and FRIENDS.',
        'Two token occurrences map to one term, friends.',
        'Lower-casing cuts the token count from 2 to 1.'] }],
      explain: '<p>There are two token occurrences, <i>Friends</i> and <i>FRIENDS</i>; after lower-casing both normalize to the same dictionary term <code>friends</code>. Lower-casing changes how tokens map to terms, not how many tokens there are: the term frequency of <code>friends</code> in this document is 2.</p>',
    },
    {
      id: 'q02', title: 'A row of the term-document matrix', type: 'single choice', level: 'Easy', skill: 'index',
      intro: '<p>One row of a <b>term-document frequency</b> matrix:</p><table class="qz-pq qz-terms"><thead><tr><th>term = <code>alpha</code></th><th>D0</th><th>D1</th><th>D2</th><th>D3</th><th>D4</th></tr></thead><tbody><tr><td>count</td><td>1</td><td>0</td><td>2</td><td>0</td><td>1</td></tr></tbody></table>',
      parts: [{ kind: 'mc', pts: 3, q: 'Which postings list keeps all the information of this row while storing only the non-zero entries?', answer: 3, options: [
        '<code>[0, 2, 4]</code>',
        '<code>[(0, 1), (2, 1), (4, 1)]</code>',
        '<code>[(0, 1), (1, 0), (2, 2), (3, 0), (4, 1)]</code>',
        '<code>[(0, 1), (2, 2), (4, 1)]</code>'] }],
      explain: '<p>Document IDs plus the per-document term frequencies reproduce every non-zero cell; the zeros are implied by absence. <code>[0, 2, 4]</code> loses the counts, <code>(2, 1)</code> gets D2 wrong, and the list with <code>(1, 0)</code> and <code>(3, 0)</code> stores the zeros the inverted index exists to avoid.</p>',
    },
    {
      id: 't_sorted', title: 'Postings in document order', type: 'single choice', level: 'Easy', skill: 'index',
      parts: [{ kind: 'mc', pts: 3, q: 'Why are postings lists kept sorted by document ID?', answer: 0, options: [
        'The merge can then walk both lists once, in linear time.',
        'The most relevant documents then come first in the list.',
        'The dictionary needs sorted lists to store frequencies.',
        'Document IDs are assigned to files in alphabetical order.'] }],
      explain: '<p>With both lists in increasing ID order, the two-pointer merge compares the current IDs and always advances the smaller one: each posting is visited at most once, \\(O(x + y)\\). Boolean retrieval has no notion of relevance, and \\(df\\) is just the length of the list, sorted or not.</p>',
    },
    {
      id: 'q04', title: 'Two frequencies of one term', type: 'numbers', level: 'Easy', skill: 'index',
      intro: '<p>Three documents after preprocessing:</p>' + papers([['D0', 'ai ai retrieval'], ['D1', 'ai index'], ['D2', 'retrieval']]) + '<p>Consider the term <code>ai</code>.</p>',
      parts: [
        { kind: 'num', pts: 2, q: 'Its document frequency (the number of documents that contain it):', prefix: M`\(df\) =`, answer: 2 },
        { kind: 'num', pts: 2, q: 'Its collection frequency (the total number of occurrences in the collection):', prefix: M`\(cf\) =`, answer: 3 },
      ],
      explain: '<p><code>ai</code> appears in D0 and D1, so \\(df = 2\\); it occurs twice in D0 and once in D1, so the collection frequency is 3.</p>',
    },
    /* ---------- Part B: from text to terms ---------- */
    {
      id: 't_equiv', title: 'U.S.A., USA and windows', type: 'single choice', level: 'Medium', skill: 'norm',
      intro: '<p>Two ways to make different forms match:</p><table class="qz-pq"><thead><tr><th>approach</th><th>example</th></tr></thead><tbody><tr><td>equivalence classes, built at indexing time</td><td>delete the periods: <code>U.S.A.</code> and <code>USA</code> become one term</td></tr><tr><td>asymmetric expansion of the query</td><td><code>window</code> → window, windows · <code>windows</code> → Windows, windows · <code>Windows</code> → Windows</td></tr></tbody></table>',
      parts: [{ kind: 'mc', pts: 3, q: 'How does asymmetric expansion compare with equivalence classes?', answer: 2, options: [
        'It is cheaper per query, but it cannot handle case.',
        'It is just as powerful; only the index size changes.',
        'It is more powerful, but each query costs more.',
        'It works only together with a positional index.'] }],
      explain: '<p>Expansion can be <b>asymmetric</b>: a query for <i>Windows</i> (the product) need not match <i>window</i>, while <i>window</i> matches both forms. Equivalence classes cannot express that. The price: an expanded query looks up and merges several postings lists, so it is less efficient.</p>',
    },
    {
      id: 'q07', title: 'US and us', type: 'single choice', level: 'Easy–Medium', skill: 'norm',
      intro: '<p>Lower-casing maps two different words to the same term:</p>' + flow(chip('US', 'the country') + chip('us', 'the pronoun'), chip('us', 'one term', 't1')),
      parts: [{ kind: 'mc', pts: 3, q: 'Which trade-off does this illustrate?', answer: 2, options: [
        'It always makes the search results better.',
        'It changes the df values but never the query results.',
        'More matches are found, but some are unrelated.',
        'It is only a storage optimization.'] }],
      explain: '<p>Case folding merges variants (<i>Friends</i>, <i>friends</i>), so a query finds more of the documents it should. But it can also merge <b>distinct meanings</b>: a query for the country now also matches every document with the pronoun <i>us</i>, so some of the results are unrelated. Every normalization choice weighs these two effects; <a href="lab05-evaluation.html">Lab 05</a> names them recall and precision.</p>',
    },
    {
      id: 'q08', title: 'A stop list and four queries', type: 'single choice', level: 'Easy', skill: 'norm',
      intro: '<p>A system removes these terms from its index entirely:</p><div class="qz-stop">' + ['to', 'be', 'or', 'not'].map(t => chip(t, '', 'off')).join('') + '</div>',
      parts: [{ kind: 'mc', pts: 3, q: 'Which query can no longer be answered exactly from that index alone?', answer: 3, options: [
        '<code>cryptography AND key</code>',
        '<code>retrieval OR search</code>',
        '<code>index AND NOT matrix</code>',
        '<code>"to be or not to be"</code>'] }],
      explain: '<p>Every word of the phrase was dropped, so no postings and no positions are left to match it. The Boolean operators <code>OR</code> and <code>NOT</code> in the other queries are operators, not indexed terms.</p>',
    },
    {
      id: 'q09', title: 'The stem bu', type: 'single choice', level: 'Easy', skill: 'norm',
      intro: '<p>The Porter stemmer can produce forms that are not words:</p>' + flow(chip('bus', 'word'), chip('bu', 'stem', 't1')),
      parts: [{ kind: 'mc', pts: 3, q: 'Which statement is most accurate?', answer: 0, options: [
        'Stems are matching keys, not words.',
        'It shows that the stemmer is broken.',
        'A stem must be a dictionary word to be useful.',
        'Stemming only ever makes the results better.'] }],
      explain: '<p>A stem is an artificial <b>matching key</b>: what matters is that related surface forms (<i>bus</i>, <i>buses</i>) map to the same key, so a query finds documents with either form. Stemming can also merge unrelated words under one stem, so it does not guarantee better results.</p>',
    },
    {
      id: 't_lemma', title: 'Stems and lemmas', type: 'matching', level: 'Easy–Medium', skill: 'norm',
      parts: [{ kind: 'rows', pts: 4, q: 'Which technique produces each mapping?', options: ['Lemmatization', 'Stemming (Porter)'], rows: [
        { label: '<code>am, are, is → be</code>', answer: 0 },
        { label: '<code>replacement → replac</code>', answer: 1 },
        { label: '<code>ponies → poni</code>', answer: 1 },
        { label: '<code>better → good</code>', answer: 0 }] }],
      explain: '<p><b>Lemmatization</b> maps inflected forms to the dictionary headword, which needs a vocabulary and morphological analysis (<i>am, are, is → be</i>; <i>better → good</i>). <b>Stemming</b> chops suffixes by rules, and its output need not be a word: Porter\'s <code>ies → i</code> gives <i>poni</i>, and <code>(m>1) ement →</code> gives <i>replac</i>.</p>',
    },
    {
      id: 's_lang', title: 'Case: a multilingual collection', type: 'matching', level: 'Medium', skill: 'norm',
      intro: caseCard('An international company', 'It indexes its documents in German, Chinese and Arabic with the same English-style tokenizer, which splits text at spaces and punctuation.'),
      parts: [{ kind: 'rows', pts: 6, q: 'Which tokenization problem does each language raise?', options: ['long compound words are not split', 'written right to left, numbers left to right', 'accents that users leave out', 'no spaces between words'], rows: [
        { label: '<b>Arabic</b>', answer: 1 },
        { label: '<b>Chinese</b>', answer: 3 },
        { label: '<b>German</b>', answer: 0 }] }],
      explain: '<p>Tokenization is language-specific. German writes noun compounds as one word (<i>Lebensversicherungsgesellschaftsangestellter</i>), so a query for <i>Versicherung</i> misses it unless compounds are segmented; Chinese and Japanese have no spaces, so splitting at spaces finds no words at all; Arabic and Hebrew run right to left with numbers left to right. Accents are a normalization issue, mostly for languages such as French or German.</p>',
    },
    {
      id: 'q06', title: 'Header terms in sci.crypt', type: 'single choice', level: 'Medium', skill: 'norm',
      intro: '<p>In the <code>sci.crypt</code> collection, header terms such as <code>path</code>, <code>message-id</code>, <code>from</code> and <code>subject</code> appear in almost every post (an invented example):</p><div class="qz-post"><div class="qz-post-h"><span class="qz-post-tag">header</span><span>Path: news.example.org!crypt</span><span>From: alice@example.org</span><span>Subject: Re: key length for RSA</span><span>Message-ID: &lt;1993Apr2.1234@example.org&gt;</span></div><div class="qz-post-b"><span class="qz-post-tag">body</span>For new keys, 1024 bits is the minimum I would trust; the factoring records keep moving.</div></div><p>The product requirement: <i>search the semantic content of messages, but still support queries restricted to the sender or the subject.</i></p>',
      parts: [{ kind: 'mc', pts: 3, q: 'Which design best fits the requirement?', answer: 1, options: [
        'Delete all headers before indexing.',
        'Index body and headers as separate zones.',
        'Merge headers and body into one field.',
        'Drop every term with df above 90%.'] }],
      explain: '<p>Separate <b>zones / fields</b> keep the searchable metadata (sender, subject) without letting header boilerplate pollute the body statistics. Deleting headers loses the sender and subject queries; mixing everything lets <code>from</code> and <code>subject</code> dominate the body; a blanket df cut-off also removes useful frequent words.</p>',
    },
    /* ---------- Part C: Boolean queries ---------- */
    {
      id: 'q14', title: 'Intersect two postings lists', type: 'single choice', level: 'Easy', skill: 'bool',
      intro: '<p>Two postings lists:</p>' + postings([['A', [1, 4, 7, 9, 13]], ['B', [2, 4, 6, 9, 12]]]),
      parts: [{ kind: 'mc', pts: 3, q: 'What is <code>A AND B</code>?', answer: 1, options: ['{1, 2, 4, 6, 7, 9, 12, 13}', '{4, 9}', '{1, 7, 13}', '{2, 6, 12}'] }],
      explain: '<p>Only 4 and 9 occur in both lists. {1, 2, …, 13} is <code>A OR B</code>, {1, 7, 13} is <code>A AND NOT B</code>.</p>',
    },
    {
      id: 'q15', title: 'Comparisons in the merge', type: 'number', level: 'Medium', skill: 'bool',
      intro: postings([['A', [1, 4, 7, 9, 13]], ['B', [2, 4, 6, 9, 12]]]) + '<p>Use the standard two-pointer <code>AND</code> merge. Count one comparison each time the algorithm compares the two current document IDs.</p>',
      parts: [{ kind: 'num', pts: 4, q: 'How many document-ID comparisons are made before one list ends?', answer: 7 }],
      explain: '<p>(1, 2) advance A · (4, 2) advance B · (4, 4) match · (7, 6) advance B · (7, 9) advance A · (9, 9) match · (13, 12) advance B, and B is exhausted: <b>7</b> comparisons.</p>',
    },
    {
      id: 'q16', title: 'Order of a four-term AND', type: 'single choice', level: 'Easy', skill: 'bool',
      intro: '<p>The query <code>a AND b AND c AND d</code>, with document frequencies:</p>' + bars([['a', 900], ['b', 40], ['c', 12], ['d', 400]], 900),
      parts: [{ kind: 'mc', pts: 3, q: 'Which processing order follows the lab\'s heuristic?', answer: 2, options: [
        'a, d, b, c',
        'a, b, c, d',
        'c, b, d, a',
        'Any order: AND is commutative, so the cost is equal'] }],
      explain: '<p>Process terms in order of <b>increasing df</b>: start with the shortest postings list, so every intermediate result stays at most as long as that list. <code>AND</code> is commutative for the <i>result</i>, not for the <i>cost</i>.</p>',
    },
    {
      id: 'q17', title: 'A term with df = 0', type: 'single choice', level: 'Easy', skill: 'bool',
      intro: '<p>The query, with what the dictionary says about <code>beta</code>:</p>' + flow(chip('alpha') + '<span class="qz-op">AND</span>' + chip('beta', 'df = 0', 't3') + '<span class="qz-op">AND</span>' + chip('gamma')),
      parts: [{ kind: 'mc', pts: 3, q: 'What is the correct result?', answer: 0, options: [
        'Empty, without reading the other postings.',
        'Evaluate alpha AND gamma; beta is ignored.',
        'Replace beta by its closest spelling first.',
        'It is equivalent to alpha OR gamma.'] }],
      explain: '<p>An <code>AND</code> with an empty postings list is empty. Processing in increasing-df order finds this at the first step, before any other list is read.</p>',
    },
    {
      id: 'q18', title: 'The query NOT x', type: 'single choice', level: 'Medium', skill: 'bool',
      intro: M`<p>A collection has \(N = 1{,}000{,}000\) documents and \(df(x) = 10\). The query is <code>NOT x</code>, and the system must explicitly return all matching document IDs.</p>`,
      parts: [{ kind: 'mc', pts: 3, q: 'What is the asymptotic cost?', answer: 3, options: [M`\(O(1)\)`, M`\(O(\log 10)\)`, M`\(O(df(x))\)`, M`\(O(N)\)`] }],
      explain: '<p>The answer is the complement: 999,990 documents. Enumerating it takes work proportional to the <b>collection size</b>, however short the postings list of <code>x</code> is. This is why a lone <code>NOT</code> is expensive, while <code>a AND NOT b</code> costs only the two lists.</p>',
    },
    {
      id: 's_news', title: 'Case: a newspaper archive', type: 'case scenario', level: 'Medium', skill: 'bool',
      intro: caseCard('A journalist', 'searches the archive for articles about the election that mention tax or the budget, but are not opinion pieces.') + '<p>The query <code>election AND (tax OR budget) AND NOT opinion</code>, and the postings of its terms:</p>' + postings([['election', [2, 3, 5, 7, 8, 11]], ['tax', [3, 4, 7, 12]], ['budget', [5, 7, 9]], ['opinion', [7, 11]]]),
      parts: [
        { kind: 'multi', pts: 4, q: 'Which documents does the query return?', answer: [1, 3], options: ['2', '3', '4', '5', '7', '9', '11', '12'] },
        { kind: 'num', pts: 3, q: 'Before merging, a query planner estimates the size of <code>tax OR budget</code> from the document frequencies alone. What is that upper bound?', answer: 7 },
      ],
      explain: '<p><code>tax OR budget</code> = {3, 4, 5, 7, 9, 12}; AND <code>election</code> keeps {3, 5, 7}; AND NOT <code>opinion</code> removes 7: the answer is <b>{3, 5}</b>. Without merging, the planner only knows \\(df_{tax} + df_{budget} = 4 + 3 = 7\\), an upper bound (the true union has 6 documents, since 7 is in both lists). It compares such estimates to decide which subquery to process first.</p>',
    },
    /* ---------- Part D: skip pointers ---------- */
    {
      id: 'q19', title: 'One step of a skip-pointer merge', type: 'single choice', level: 'Medium', skill: 'skip',
      intro: '<p>The current state of an <code>AND</code> merge with skip pointers:</p>' + skipFig([1, 4, 7, 10, 13], 0, 2, 0, 8),
      parts: [{ kind: 'mc', pts: 3, q: 'Using the lab\'s rule, what should the algorithm do?', answer: 1, options: [
        'Advance from 1 to 4: a skip must pass 8.',
        'Take the skip from 1 to 7, since 7 ≤ 8.',
        'Jump directly to 10, the first ID above 8.',
        'Stop: the two lists cannot intersect.'] }],
      explain: '<p>A skip is safe when its target is <b>≤ the other list\'s current ID</b>: 7 ≤ 8, so nothing between 1 and 7 can match 8, and 4 is skipped without a comparison. Jumping to 10 would need a skip pointer that does not exist.</p>',
    },
    {
      id: 'q20', title: 'Skip pointers and OR', type: 'single choice', level: 'Medium', skill: 'skip',
      parts: [{ kind: 'mc', pts: 3, q: 'Why are skip pointers generally not useful for an <code>OR</code> merge?', answer: 2, options: [
        'OR needs the postings lists to be unsorted.',
        'Skip pointers only work in positional indexes.',
        'Every posting of both lists is in the result.',
        'OR is always O(1), so there is nothing to save.'] }],
      explain: '<p><code>OR</code> must output every posting of both lists (deduplicated), so there is nothing to skip: a skipped posting would be missing from the result. Skips help <code>AND</code>, where many postings are known not to match.</p>',
    },
    {
      id: 'q21', title: 'How many skip pointers?', type: 'select all', level: 'Medium', skill: 'skip',
      parts: [{ kind: 'multi', pts: 3, q: 'Select <b>all</b> statements that are true.', answer: [0, 1, 2, 4], options: [
        'More skips consume extra space.',
        'More skips can introduce extra skip comparisons.',
        'Frequent index updates make skip placement harder to maintain.',
        'Skip pointers guarantee a speedup on modern hardware.',
        'A useful skip layout depends partly on postings-list length.'] }],
      explain: '<p>Skips cost space and comparisons, are awkward to maintain under updates, and are only a heuristic; the classic layout uses about \\(\\sqrt{L}\\) evenly spaced skips for a list of length \\(L\\). On modern hardware a tight sequential merge is often already fast enough, so there is no guarantee.</p>',
    },
    /* ---------- Part E: phrase and positional retrieval ---------- */
    {
      id: 'q22', title: 'Biwords for a three-word phrase', type: 'single choice', level: 'Medium', skill: 'phrase',
      intro: '<p>A biword index evaluates the phrase query <code>"a b c"</code> as two biwords:</p>' + flow(chip('a b c', 'phrase'), chip('a b', 'biword', 't1') + '<span class="qz-op">AND</span>' + chip('b c', 'biword', 't1')),
      parts: [{ kind: 'mc', pts: 3, q: 'Which document is a <b>false positive</b> of this method?', answer: 0, options: ['<code>a b x b c</code>', '<code>a b c</code>', '<code>x a b c y</code>', '<code>a x b x c</code>'] }],
      explain: '<p><code>a b x b c</code> contains both biwords, <i>a b</i> and <i>b c</i>, but not the phrase <i>a b c</i>. <code>a b c</code> and <code>x a b c y</code> are true matches; <code>a x b x c</code> contains neither biword.</p>',
    },
    {
      id: 'q23', title: 'Read a positional index', type: 'single choice', level: 'Easy', skill: 'phrase',
      intro: '<p>A positional index (term → positions in each document):</p><table class="qz-pq qz-terms"><thead><tr><th>document</th><th><code>alpha</code></th><th><code>beta</code></th></tr></thead><tbody><tr><td>D0</td><td>[1, 5]</td><td>[2, 9]</td></tr><tr><td>D1</td><td>[3]</td><td>[5]</td></tr></tbody></table><p>The phrase query <code>"alpha beta"</code>.</p>',
      parts: [{ kind: 'mc', pts: 3, q: 'Which documents match the exact phrase?', answer: 0, options: ['D0 only', 'D1 only', 'D0 and D1', 'Neither'] }],
      explain: '<p>In D0, <i>alpha</i> at position 1 is followed by <i>beta</i> at 2. In D1 there is a gap (3 and 5): both words occur, but not as a phrase.</p>',
    },
    {
      id: 'q24', title: 'Positions vs postings for one document', type: 'numbers', level: 'Medium', skill: 'phrase',
      intro: '<p>A document has 100,000 term positions. A particular term fills 0.1% of those positions and occurs nowhere else in the collection.</p>',
      parts: [
        { kind: 'num', pts: 2, q: 'How many positions must a positional index store for this term in this document?', answer: 100 },
        { kind: 'num', pts: 2, q: 'How many postings does a non-positional Boolean index need for it?', answer: 1 },
      ],
      explain: '<p>0.1% of 100,000 is 100 positions, against a single posting (the document ID) in a non-positional index. Positional indexes are typically several times larger than non-positional ones.</p>',
    },
    /* ---------- Part F: case scenarios ---------- */
    {
      id: 's_legal', title: 'Case: searching contracts at a law firm', type: 'case scenario', level: 'Medium', skill: 'design',
      intro: caseCard('A law firm with 2 million contracts', 'Lawyers write precise Boolean queries, search for exact phrases such as "act of God" and for case numbers such as 2019-CV-0412, and a missed document can be costly.'),
      parts: [
        { id: 'a', kind: 'rows', pts: 4, q: 'For each indexing choice: is it a good idea here, or risky?', options: ['Good idea here', 'Risky here'], rows: [
          { label: 'Index codes such as <code>2019-CV-0412</code> as terms', answer: 0 },
          { label: 'Remove a stop list of the 300 most common words', answer: 1 },
          { label: 'Drop all numbers to keep the dictionary small', answer: 1 },
          { label: 'Store the positions of each term in the postings', answer: 0 }] },
        { id: 'b', kind: 'mc', pts: 4, q: 'A lawyer asks for contracts where <i>indemnify</i> occurs within 5 words of <i>damages</i>. Which index can answer this?', answer: 3, options: [
          'A biword index',
          'A non-positional inverted index',
          'A term-document incidence matrix',
          'A positional inverted index'] },
      ],
      explain: '<p>Codes and numbers are exactly what these users search for, so they must be indexed, not dropped. A large stop list deletes <i>of</i> and breaks phrases such as <i>act of God</i>. Positions are needed both for exact phrases and for the proximity request <code>indemnify /5 damages</code>, which a biword index cannot express and the other two cannot answer at all.</p>',
    },
    {
      id: 's_wiki', title: 'Case: a search box for a company wiki', type: 'case scenario', level: 'Medium', skill: 'design',
      intro: caseCard('A company wiki', '50,000 short pages, edited hundreds of times a day. Users type one to three words, in lower case, and never use quotes.'),
      parts: [{ kind: 'rows', pts: 6, q: 'Is each feature worth building here?', options: ['Worth it', 'Not needed here'], rows: [
        { label: 'Skip pointers in the postings lists', answer: 1 },
        { label: 'Case folding of documents and queries', answer: 0 },
        { label: 'A positional index', answer: 1 }] }],
      explain: '<p><b>Skip pointers</b> pay off only for a fairly static index (constant edits keep changing the list lengths and the skip placement) and may not help on modern hardware anyway. <b>Case folding</b> matches what these users type. A <b>positional index</b> costs several times the space of a non-positional one, and nobody here asks phrase or proximity queries.</p>',
    },
  ],
};

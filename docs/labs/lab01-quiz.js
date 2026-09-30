/* ===== Lab 01 quiz: question data (rendered and graded by quiz.js) ===== */
const M = String.raw;
const LAB = 'lab01-inverted-index.html';
const code = (s) => `<pre class="qz-code">${s}</pre>`;

window.QUIZ = {
  id: 'ir-lab01',
  skills: [
    { id: 'index', label: 'Terms, postings and frequencies', href: LAB + '#inverted-index' },
    { id: 'norm', label: 'Normalization choices', href: LAB + '#text' },
    { id: 'build', label: 'Building the index', href: LAB + '#construction' },
    { id: 'bool', label: 'Boolean query processing', href: LAB + '#boolean' },
    { id: 'skip', label: 'Skip pointers', href: LAB + '#faster' },
    { id: 'phrase', label: 'Phrase and positional retrieval', href: LAB + '#phrase' },
  ],
  tasks: [
    /* ---------- Part A: from documents to terms ---------- */
    {
      id: 'q01', title: 'Counting tokens and terms', type: 'single choice', level: 'Easy', skill: 'index',
      intro: '<p>A document contains <code>Friends, FRIENDS!</code> The indexing pipeline tokenizes, removes punctuation and lower-cases.</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'Which statement is correct?', answer: 2, options: [
        'The line has one token and two dictionary terms.',
        'It yields two terms, Friends and FRIENDS.',
        'Two token occurrences map to one term, friends.',
        'Lower-casing cuts the token count from 2 to 1.'] }],
      explain: '<p>There are two token occurrences, <i>Friends</i> and <i>FRIENDS</i>; after lower-casing both normalize to the same dictionary term <code>friends</code>. Lower-casing changes how tokens map to terms, not how many tokens there are: the term frequency of <code>friends</code> in this document is 2.</p>',
    },
    {
      id: 'q02', title: 'A row of the term-document matrix', type: 'single choice', level: 'Easy', skill: 'index',
      intro: '<p>One row of a <b>term-document frequency</b> matrix:</p><table class="qz-pq"><thead><tr><th>term = alpha</th><th>D0</th><th>D1</th><th>D2</th><th>D3</th><th>D4</th></tr></thead><tbody><tr><td>count</td><td>1</td><td>0</td><td>2</td><td>0</td><td>1</td></tr></tbody></table>',
      parts: [{ kind: 'mc', pts: 4, q: 'Which postings list keeps all the information of this row while storing only the non-zero entries?', answer: 3, options: [
        '<code>[0, 2, 4]</code>',
        '<code>[(0, 1), (2, 1), (4, 1)]</code>',
        '<code>[(0, 1), (1, 0), (2, 2), (3, 0), (4, 1)]</code>',
        '<code>[(0, 1), (2, 2), (4, 1)]</code>'] }],
      explain: '<p>Document IDs plus the per-document term frequencies reproduce every non-zero cell; the zeros are implied by absence. <code>[0, 2, 4]</code> loses the counts, <code>(2, 1)</code> gets D2 wrong, and the list with <code>(1, 0)</code> and <code>(3, 0)</code> stores the zeros the inverted index exists to avoid.</p>',
    },
    {
      id: 'q03', title: 'A 2 in the lab\'s matrix', type: 'single choice', level: 'Easy', skill: 'index',
      intro: M`<p>The lab calls its toy table an incidence matrix, but the implementation fills it with <code>sent.count(token)</code>. Suppose a cell contains <b>2</b>.</p>`,
      parts: [{ kind: 'mc', pts: 4, q: 'What does the 2 mean?', answer: 0, options: [
        'The term occurs twice in that document.',
        'The term occurs in two different documents.',
        'The document contains two distinct terms.',
        'The matrix is invalid: incidence means 0 or 1.'] }],
      explain: '<p><code>sent.count(token)</code> counts occurrences of the token in one document (sentence), so the cell holds the <b>within-document term frequency</b>. Strictly, a table with counts is a term-document <i>count</i> matrix; a pure incidence matrix would store only 0 and 1.</p>',
    },
    {
      id: 'q04', title: 'Two frequencies of one term', type: 'numbers', level: 'Easy', skill: 'index',
      intro: code('D0: ai ai retrieval\nD1: ai index\nD2: retrieval') + '<p>The three documents after preprocessing. Consider the term <code>ai</code>.</p>',
      parts: [
        { kind: 'num', pts: 2, q: 'Its document frequency (the number of documents that contain it):', prefix: M`\(df\) =`, answer: 2 },
        { kind: 'num', pts: 2, q: 'Its collection frequency (the total number of occurrences in the collection):', prefix: M`\(cf\) =`, answer: 3 },
      ],
      explain: '<p><code>ai</code> appears in D0 and D1, so \\(df = 2\\); it occurs twice in D0 and once in D1, so the collection frequency is 3.</p>',
    },
    {
      id: 'q05', title: 'set(document) in the df loop', type: 'single choice', level: 'Easy–Medium', skill: 'index',
      intro: code('for document in documents:\n    for token in set(document):\n        df[token] += 1') + '<p>The lab computes document frequencies with the equivalent of this loop.</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'What would happen if <code>set(document)</code> were replaced by <code>document</code>?', answer: 3, options: [
        'Nothing: both versions give the same counts.',
        'Rare terms would disappear from the dictionary.',
        'The postings lists would no longer be sorted.',
        'It would count occurrences, not documents.'] }],
      explain: '<p>Without <code>set()</code>, a term that occurs three times in one document adds 3 instead of 1: the loop would compute the <b>collection frequency</b>, not the document frequency.</p>',
    },
    {
      id: 'q06', title: 'Header terms in sci.crypt', type: 'single choice', level: 'Medium', skill: 'norm',
      intro: '<p>In the <code>sci.crypt</code> collection, terms such as <code>path</code>, <code>message-id</code>, <code>from</code> and <code>subject</code> appear in almost every post. The product requirement: <i>search the semantic content of messages, but still support queries restricted to the sender or the subject.</i></p>',
      parts: [{ kind: 'mc', pts: 4, q: 'Which design best fits the requirement?', answer: 1, options: [
        'Delete all headers before indexing.',
        'Index body and headers as separate zones.',
        'Merge headers and body into one field.',
        'Drop every term with df above 90%.'] }],
      explain: '<p>Separate <b>zones / fields</b> keep the searchable metadata (sender, subject) without letting header boilerplate pollute the body statistics. Deleting headers loses the sender and subject queries; mixing everything lets <code>from</code> and <code>subject</code> dominate the body; a blanket df cut-off also removes useful frequent words.</p>',
    },
    {
      id: 'q07', title: 'US and us', type: 'single choice', level: 'Easy–Medium', skill: 'norm',
      intro: '<p>Lower-casing maps both the country abbreviation <code>US</code> and the pronoun <code>us</code> to <code>us</code>.</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'Which trade-off does this illustrate?', answer: 2, options: [
        'It always improves both precision and recall.',
        'It changes df but never the query results.',
        'It can raise recall but lower precision.',
        'It is only a storage optimization.'] }],
      explain: '<p>Case folding merges variants (<i>Friends</i>, <i>friends</i>), which helps matching and recall, but it can also merge <b>distinct meanings</b>: a query for the country now matches every <i>us</i>, which lowers precision.</p>',
    },
    {
      id: 'q08', title: 'A stop list and four queries', type: 'single choice', level: 'Easy', skill: 'norm',
      intro: '<p>A system removes the terms <code>to</code>, <code>be</code>, <code>or</code> and <code>not</code> from its index entirely.</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'Which query can no longer be answered exactly from that index alone?', answer: 3, options: [
        '<code>cryptography AND key</code>',
        '<code>retrieval OR search</code>',
        '<code>index AND NOT matrix</code>',
        '<code>"to be or not to be"</code>'] }],
      explain: '<p>Every word of the phrase was dropped, so no postings and no positions are left to match it. The Boolean operators <code>OR</code> and <code>NOT</code> in the other queries are operators, not indexed terms.</p>',
    },
    {
      id: 'q09', title: 'The stem bu', type: 'single choice', level: 'Easy', skill: 'norm',
      intro: '<p>The Porter stemmer can produce forms such as <code>bu</code> from <code>bus</code>.</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'Which statement is most accurate?', answer: 0, options: [
        'Stems are matching keys, not words.',
        'It shows that the stemmer is broken.',
        'A stem must be a dictionary word to be useful.',
        'Stemming raises precision and recall together.'] }],
      explain: '<p>A stem is an artificial <b>matching key</b>: what matters is that related surface forms map to the same key. Stemming usually trades some precision for recall; it does not guarantee both.</p>',
    },
    {
      id: 'q10', title: 'Filtering the token ...', type: 'single choice', level: 'Medium', skill: 'norm',
      intro: code("_tok not in string.punctuation") + '<p>The lab filters punctuation with this test. <code>string.punctuation</code> is <b>one string</b> of individual punctuation characters: <code>!"#$%&amp;\'()*+,-./:;&lt;=&gt;?@[\\]^_`{|}~</code></p>',
      parts: [{ kind: 'mc', pts: 4, q: 'What happens to the token <code>...</code> (three dots)?', answer: 1, options: [
        'It is removed, since it contains punctuation.',
        "It survives: '...' is not in that string.",
        "It is shortened to a single '.'.",
        'It becomes the empty string.'] }],
      explain: '<p><code>in</code> on strings tests for a <b>substring</b>. <code>"..." in string.punctuation</code> is False, because the string contains only one dot in a row, so the test <code>not in</code> is True and the token is kept. Tokens made of several punctuation characters slip through; a fix is <code>not all(ch in string.punctuation for ch in _tok)</code>.</p>',
    },
    /* ---------- Part B: building the index ---------- */
    {
      id: 'q11', title: 'Sorting the pairs by token', type: 'single choice', level: 'Medium', skill: 'build',
      intro: code('sorted(token_docid, key=itemgetter(0))') + '<p>The (token, doc_id) pairs are emitted in document order and then sorted by token only.</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'Why do the postings of each term still come out in increasing document-ID order?', answer: 2, options: [
        'Dictionaries sort document IDs automatically.',
        'itemgetter(0) actually sorts by both fields.',
        'The sort is stable: ties keep their document order.',
        'Doc IDs do not matter for merging postings.'] }],
      explain: '<p>Python\'s <code>sorted</code> is <b>stable</b>: pairs with the same token keep their original relative order, which was increasing doc ID. Document order does matter: the merge algorithms assume sorted postings.</p>',
    },
    {
      id: 'q12', title: 'A safer sort key', type: 'single choice', level: 'Medium', skill: 'build',
      intro: '<p>You want the construction to be correct <b>without</b> relying on sort stability or on the original order of the pairs <code>(token, doc_id)</code>.</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'Which sort key is the safest replacement?', answer: 0, options: [
        '<code>key=lambda x: (x[0], x[1])</code>',
        '<code>key=lambda x: x[1]</code>',
        '<code>key=lambda x: len(x[0])</code>',
        '<code>key=lambda x: (x[1], x[0])</code>'] }],
      explain: '<p>Sorting by <code>(token, doc_id)</code> explicitly enforces both the grouping by term and the order inside each postings list. <code>(x[1], x[0])</code> sorts by document first, so the pairs of one term are scattered.</p>',
    },
    {
      id: 'q13', title: 'Document IDs from os.listdir', type: 'single choice', level: 'Medium', skill: 'build',
      intro: '<p>The lab assigns document IDs with <code>enumerate(os.listdir(...))</code>. On another machine, <code>os.listdir</code> returns the files in a different order. The index and the <code>doc_id → filename</code> map are built consistently within each run.</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'What is the main consequence?', answer: 3, options: [
        'Boolean retrieval becomes incorrect.',
        "Every term's document frequency becomes zero.",
        'The postings lists are no longer sorted.',
        'Exact doc IDs change between runs; results do not.'] }],
      explain: '<p>The IDs are internal labels. As long as the index and the ID-to-file map come from the same run, the same <b>files</b> are retrieved; only the exact ID numbers are not reproducible across machines. Sorting <code>os.listdir</code> fixes that.</p>',
    },
    /* ---------- Part C: Boolean query processing ---------- */
    {
      id: 'q14', title: 'Intersect two postings lists', type: 'single choice', level: 'Easy', skill: 'bool',
      intro: code('A: 1 → 4 → 7 → 9 → 13\nB: 2 → 4 → 6 → 9 → 12'),
      parts: [{ kind: 'mc', pts: 4, q: 'What is <code>A AND B</code>?', answer: 1, options: ['{1, 2, 4, 6, 7, 9, 12, 13}', '{4, 9}', '{1, 7, 13}', '{2, 6, 12}'] }],
      explain: '<p>Only 4 and 9 occur in both lists. {1, 2, …, 13} is <code>A OR B</code>, {1, 7, 13} is <code>A AND NOT B</code>.</p>',
    },
    {
      id: 'q15', title: 'Comparisons in the merge', type: 'number', level: 'Medium', skill: 'bool',
      intro: code('A: 1 → 4 → 7 → 9 → 13\nB: 2 → 4 → 6 → 9 → 12') + '<p>Use the standard two-pointer <code>AND</code> merge. Count one comparison each time the algorithm compares the two current document IDs.</p>',
      parts: [{ kind: 'num', pts: 4, q: 'How many document-ID comparisons are made before one list ends?', answer: 7 }],
      explain: '<p>(1, 2) advance A · (4, 2) advance B · (4, 4) match · (7, 6) advance B · (7, 9) advance A · (9, 9) match · (13, 12) advance B, and B is exhausted: <b>7</b> comparisons.</p>',
    },
    {
      id: 'q16', title: 'Order of a four-term AND', type: 'single choice', level: 'Easy', skill: 'bool',
      intro: '<p>The query <code>a AND b AND c AND d</code>, with document frequencies:</p><table class="qz-pq"><thead><tr><th>term</th><th>df</th></tr></thead><tbody><tr><td>a</td><td>900</td></tr><tr><td>b</td><td>40</td></tr><tr><td>c</td><td>12</td></tr><tr><td>d</td><td>400</td></tr></tbody></table>',
      parts: [{ kind: 'mc', pts: 4, q: 'Which processing order follows the lab\'s heuristic?', answer: 2, options: [
        'a, d, b, c',
        'a, b, c, d',
        'c, b, d, a',
        'Any order: AND is commutative, so the cost is equal'] }],
      explain: '<p>Process terms in order of <b>increasing df</b>: start with the shortest postings list, so every intermediate result stays at most as long as that list. <code>AND</code> is commutative for the <i>result</i>, not for the <i>cost</i>.</p>',
    },
    {
      id: 'q17', title: 'A term with df = 0', type: 'single choice', level: 'Easy', skill: 'bool',
      intro: '<p>The query <code>alpha AND beta AND gamma</code>; the dictionary says <code>df(beta) = 0</code>.</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'What is the correct result?', answer: 0, options: [
        'Empty, without reading the other postings.',
        'Evaluate alpha AND gamma; beta is ignored.',
        'Replace beta by its closest spelling first.',
        'It is equivalent to alpha OR gamma.'] }],
      explain: '<p>An <code>AND</code> with an empty postings list is empty. Processing in increasing-df order finds this at the first step, before any other list is read.</p>',
    },
    {
      id: 'q18', title: 'The query NOT x', type: 'single choice', level: 'Medium', skill: 'bool',
      intro: M`<p>A collection has \(N = 1{,}000{,}000\) documents and \(df(x) = 10\). The query is <code>NOT x</code>, and the system must explicitly return all matching document IDs.</p>`,
      parts: [{ kind: 'mc', pts: 4, q: 'What is the asymptotic cost?', answer: 3, options: [M`\(O(1)\)`, M`\(O(\log 10)\)`, M`\(O(df(x))\)`, M`\(O(N)\)`] }],
      explain: '<p>The answer is the complement: 999,990 documents. Enumerating it takes work proportional to the <b>collection size</b>, however short the postings list of <code>x</code> is. This is why a lone <code>NOT</code> is expensive, while <code>a AND NOT b</code> costs only the two lists.</p>',
    },
    /* ---------- Part D: skip pointers ---------- */
    {
      id: 'q19', title: 'One step of a skip-pointer merge', type: 'single choice', level: 'Medium', skill: 'skip',
      intro: '<pre class="qz-code qz-diagram">A: 1 → 4 → 7 → 10 → 13\n   └────→ 7            (skip pointer from 1 to 7)\n\ncurrent in A: 1        current in B: 8</pre>',
      parts: [{ kind: 'mc', pts: 4, q: 'Using the lab\'s rule, what should the algorithm do?', answer: 1, options: [
        'Advance from 1 to 4: a skip must pass 8.',
        'Take the skip from 1 to 7, since 7 ≤ 8.',
        'Jump directly to 10, the first ID above 8.',
        'Stop: the two lists cannot intersect.'] }],
      explain: '<p>A skip is safe when its target is <b>≤ the other list\'s current ID</b>: 7 ≤ 8, so nothing between 1 and 7 can match 8, and 4 is skipped without a comparison. Jumping to 10 would need a skip pointer that does not exist.</p>',
    },
    {
      id: 'q20', title: 'Skip pointers and OR', type: 'single choice', level: 'Medium', skill: 'skip',
      parts: [{ kind: 'mc', pts: 4, q: 'Why are skip pointers generally not useful for an <code>OR</code> merge?', answer: 2, options: [
        'OR needs the postings lists to be unsorted.',
        'Skip pointers only work in positional indexes.',
        'Every posting of both lists is in the result.',
        'OR is always O(1), so there is nothing to save.'] }],
      explain: '<p><code>OR</code> must output every posting of both lists (deduplicated), so there is nothing to skip: a skipped posting would be missing from the result. Skips help <code>AND</code>, where many postings are known not to match.</p>',
    },
    {
      id: 'q21', title: 'How many skip pointers?', type: 'select all', level: 'Medium', skill: 'skip',
      parts: [{ kind: 'multi', pts: 4, q: 'Select <b>all</b> statements that are true.', answer: [0, 1, 2, 4], options: [
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
      intro: '<p>A biword index evaluates the phrase query <code>"a b c"</code> as <code>"a b" AND "b c"</code>.</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'Which document is a <b>false positive</b> of this method?', answer: 0, options: ['<code>a b x b c</code>', '<code>a b c</code>', '<code>x a b c y</code>', '<code>a x b x c</code>'] }],
      explain: '<p><code>a b x b c</code> contains both biwords, <i>a b</i> and <i>b c</i>, but not the phrase <i>a b c</i>. <code>a b c</code> and <code>x a b c y</code> are true matches; <code>a x b x c</code> contains neither biword.</p>',
    },
    {
      id: 'q23', title: 'Read a positional index', type: 'single choice', level: 'Easy', skill: 'phrase',
      intro: code('D0: alpha → [1, 5]    beta → [2, 9]\nD1: alpha → [3]       beta → [5]') + '<p>The phrase query <code>"alpha beta"</code>.</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'Which documents match the exact phrase?', answer: 0, options: ['D0 only', 'D1 only', 'D0 and D1', 'Neither'] }],
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
    {
      id: 'q25', title: 'Index for Boolean, phrase and proximity queries', type: 'single choice', level: 'Easy', skill: 'phrase',
      intro: '<p>A search system must support (1) Boolean queries, (2) exact phrases and (3) arbitrary proximity queries such as "A within 3 words of B".</p>',
      parts: [{ kind: 'mc', pts: 4, q: 'Which core representation is required?', answer: 1, options: [
        'A term-document incidence matrix only',
        'A positional inverted index',
        'A non-positional inverted index only',
        'A biword index only'] }],
      explain: '<p>Arbitrary phrase and proximity constraints need <b>term positions</b>. A biword index handles only two-word phrases (and gives false positives beyond that); neither an incidence matrix nor a non-positional index knows where words occur.</p>',
    },
  ],
};

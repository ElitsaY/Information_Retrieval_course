/* ===== Lab 05 quiz: question data (rendered and graded by quiz.js) ===== */
const M = String.raw;
const LAB = 'lab05-evaluation.html';
const sec = (id, text) => `<a href="${LAB}#${id}">${text}</a>`;
// ---------- visual helpers (styles: "Lab 05 (IR) quiz visuals" in style.css) ----------
// a ranked list as tiles: rank number on top, R (relevant) or N (not relevant) below
const rk = (s) => '<span class="qz-rk">' + s.replace(/\s+/g, '').split('').map((c, i) => `<span class="qz-rk-i ${c === 'R' ? 'r' : 'n'}"><small>${i + 1}</small>${c}</span>`).join('') + '</span>';
// several named rankings, one per row
const rkRows = (rows) => '<div class="qz-rks">' + rows.map(([name, s]) => `<div class="qz-rk-row"><span class="qz-rk-name">${name}</span>${rk(s)}</div>`).join('') + '</div>';
const rkLegend = '<p class="qz-legend"><span class="qz-rk-i r mini">R</span> relevant &nbsp; <span class="qz-rk-i n mini">N</span> not relevant</p>';
// a graded ranking: rank number on top, relevance grade below (darker = higher grade)
const gr = (grades) => '<span class="qz-rk">' + grades.map((g, i) => `<span class="qz-rk-i g${g}"><small>${i + 1}</small>${g}</span>`).join('') + '</span>';
const grRows = (rows) => '<div class="qz-rks">' + rows.map(([name, g]) => `<div class="qz-rk-row"><span class="qz-rk-name">${name}</span>${gr(g)}</div>`).join('') + '</div>';
const grLegend = '<p class="qz-legend">Each tile shows the rank (small) and the relevance grade, from 0 = not relevant to 3 = highly relevant; the more strongly coloured the tile, the higher the grade.</p>';
// a few numbers that describe the setup
const facts = (rows) => '<div class="qz-facts">' + rows.map(([n, l]) => `<div class="qz-fact"><b>${n}</b><span>${l}</span></div>`).join('') + '</div>';
// a short case description: who searches what, under which constraints
const caseCard = (who, text) => `<div class="qz-case"><span class="qz-case-k">Case</span><p><b>${who}.</b> ${text}</p></div>`;

window.QUIZ = {
  id: 'ir-lab05',
  skills: [
    { id: 'judg', label: 'Relevance judgments and the evaluation setup', href: LAB + '#why' },
    { id: 'pr', label: 'Accuracy, precision and recall', href: LAB + '#pr' },
    { id: 'rank', label: 'Rank-aware metrics: RR, MRR, AP, MAP', href: LAB + '#rank' },
    { id: 'graded', label: 'Graded relevance: DCG, IDCG, nDCG', href: LAB + '#graded' },
    { id: 'choice', label: 'Choosing and reading metrics', href: LAB + '#disagree' },
    { id: 'case', label: 'Case scenarios', href: LAB + '#disagree' },
  ],
  tasks: [
    /* ---------- Part I: judgments, precision and recall ---------- */
    {
      id: 'q01', title: 'Two rankings for one query', type: 'single choice', level: 'Easy', skill: 'judg',
      intro: '<p>Two systems return different ranked lists for the same query.</p>',
      parts: [{ kind: 'mc', pts: 3, q: 'What information is still missing to decide which system retrieves better results?', answer: 2, options: [
        'The vocabulary size of each system\'s inverted index.',
        'The runtime of each system\'s ranking function.',
        'Relevance judgments for the query–document pairs.',
        'The number of terms in the original user query.'] }],
      explain: `<p>Only <b>relevance judgments</b> say which returned documents actually answer the query. Index size, speed and query length say nothing about whether the results are relevant. See ${sec('why', 'Part I')}.</p>`,
    },
    {
      id: 'q02', title: 'A line of the qrels', type: 'single choice', level: 'Easy', skill: 'judg',
      parts: [{ kind: 'mc', pts: 3, q: 'In an offline IR evaluation, what does one <b>qrel</b> record?', answer: 0, options: [
        'A query, a document, and its assessed relevance.',
        'A query and the model\'s predicted score only.',
        'A document and its position in the inverted index.',
        'A system and its mean evaluation score.'] }],
      explain: `<p>Qrels are the human relevance judgments: for each query–document pair, the assessor's label. The system's ranked documents and scores are a different file, the <i>run</i>. See the offline evaluation setup in ${sec('why', 'Part I')}.</p>`,
    },
    {
      id: 'q03', title: 'A system that retrieves nothing', type: 'single choice', level: 'Easy', skill: 'pr',
      intro: facts([['1,400', 'documents'], ['7', 'relevant to the query'], ['0', 'retrieved']]),
      parts: [{ kind: 'mc', pts: 3, q: 'The system retrieves nothing, yet its accuracy is very high. Why?', answer: 3, options: [
        'Retrieving no documents gives perfect recall.',
        'Precision is automatically 1 when nothing is retrieved.',
        'Accuracy weights relevant documents more than irrelevant ones.',
        'The many true negatives dominate the accuracy.'] }],
      explain: M`<p>Retrieving nothing gives \(TP = 0\), \(FP = 0\), \(FN = 7\), \(TN = 1393\), so accuracy is \(1393 / 1400 = 99.5\%\), although the system found no relevant document. Recall is 0, not 1, and precision is undefined (0/0). See the accuracy playground in ` + sec('pr', 'Part II') + '.</p>',
    },
    {
      id: 'q04', title: 'Four outcomes for one document', type: 'matching', level: 'Easy', skill: 'pr',
      parts: [{ kind: 'rows', pts: 3, q: 'Label each outcome. Every label is used once.', options: ['TP', 'FP', 'FN', 'TN'], rows: [
        { label: 'A relevant document is not retrieved.', answer: 2 },
        { label: 'A relevant document is retrieved.', answer: 0 },
        { label: 'A non-relevant document is not retrieved.', answer: 3 },
        { label: 'A non-relevant document is retrieved.', answer: 1 }] }],
      explain: `<p>Retrieved and relevant: <b>TP</b> (a hit). Retrieved but not relevant: <b>FP</b> (noise the user reads). Relevant but not retrieved: <b>FN</b> (a miss). Not retrieved and not relevant: <b>TN</b> (correctly left out). See the table at the start of ${sec('pr', 'Part II')}.</p>`,
    },
    {
      id: 'q05', title: 'Six relevant in the top 10', type: 'single choice', level: 'Easy', skill: 'pr',
      intro: facts([['10', 'retrieved'], ['6', 'of them relevant']]),
      parts: [{ kind: 'mc', pts: 3, q: M`A system returns 10 documents, 6 of them relevant. What is \(P@10\)?`, answer: 1, options: ['0.400', '0.600', '0.667', '1.000'] }],
      explain: M`<p>\(P@10 = 6 / 10 = 0.600\). Precision divides by the number of documents retrieved at the cutoff.</p>`,
    },
    {
      id: 'q06', title: 'Fifteen relevant in the collection', type: 'single choice', level: 'Easy', skill: 'pr',
      intro: facts([['15', 'relevant in the collection'], ['10', 'retrieved'], ['6', 'of them relevant']]),
      parts: [{ kind: 'mc', pts: 3, q: M`The collection has <b>15</b> relevant documents. The top 10 results contain 6 of them. What is \(Recall@10\)?`, answer: 0, options: ['0.400', '0.600', '0.667', '0.900'] }],
      explain: M`<p>\(Recall@10 = 6 / 15 = 0.400\). Recall divides by <b>all</b> relevant documents in the collection, including those the system never returned. 0.600 is \(P@10\), not recall.</p>`,
    },
    {
      id: 'q07', title: 'From cutoff k to k + 1', type: 'select all', level: 'Easy–Medium', skill: 'pr',
      intro: '<p>The ranking and the relevance judgments stay fixed; only the cutoff grows from \\(k\\) to \\(k + 1\\).</p>',
      parts: [{ kind: 'multi', pts: 3, q: 'Which statements are true?', answer: [1, 3], options: [
        'Precision at the cutoff must decrease.',
        'Recall at the cutoff cannot decrease.',
        M`Recall at the cutoff has \(k\) as its denominator.`,
        'Precision at the cutoff can increase.'] }],
      explain: M`<p>A longer list keeps every relevant document it already had, so recall cannot go down. Precision goes up when the document at rank \(k + 1\) is relevant, so it does not have to decrease. Recall divides by the total number of relevant documents, not by \(k\).</p>`,
    },
    {
      id: 'q08', title: 'A cutoff smaller than R', type: 'select all', level: 'Medium', skill: 'pr',
      intro: facts([['8', 'relevant documents for the query'], [M`\(k = 5\)`, 'cutoff']]),
      parts: [{ kind: 'multi', pts: 3, q: M`We report \(Recall@5\). Which statements are true?`, answer: [0, 2, 3], options: [
        M`Even a perfect ranking gets at most \(Recall@5 = 5/8\).`,
        M`A perfect ranking reaches \(Recall@5 = 1\).`,
        M`\(P@5\) can still be 1.`,
        M`Capped recall divides by \(\min(k, R) = 5\), so a perfect ranking gets 1.`,
        M`\(Recall@5\) can be larger than \(P@5\) for this query.`] }],
      explain: M`<p>The top 5 hold at most 5 relevant documents, so \(Recall@5 \le 5/8\) while \(P@5\) can be \(5/5 = 1\). With \(h\) relevant in the top 5, recall is \(h/8\) and precision \(h/5\), so recall is never larger here. Capped recall divides by \(\min(k, R)\) so that a perfect ranking scores 1. See the recall bullets in ` + sec('pr', 'Part II') + '.</p>',
    },
    {
      id: 'q09', title: 'Returning the whole collection', type: 'single choice', level: 'Easy–Medium', skill: 'pr',
      intro: facts([['1,400', 'documents'], ['7', 'relevant to the query'], ['1,400', 'retrieved']]),
      parts: [{ kind: 'mc', pts: 3, q: 'The system returns every document in the collection. What are its recall and precision?', answer: 1, options: [
        'Recall 0.005, precision 1',
        'Recall 1, precision 0.005',
        'Recall 1, precision 1',
        'Recall 1, precision undefined'] }],
      explain: M`<p>Every relevant document is among the results, so \(Recall = 7/7 = 1\). But the 7 are buried among 1,393 irrelevant ones: \(Precision = 7/1400 = 0.005\). Perfect recall is easy if we ignore precision.</p>`,
    },
    /* ---------- Part II: rank-aware metrics ---------- */
    {
      id: 'q10', title: 'Two relevant results in the top 4', type: 'single choice', level: 'Easy', skill: 'rank',
      intro: rkRows([['System A', 'RRNN'], ['System B', 'NNRR']]) + rkLegend,
      parts: [{ kind: 'mc', pts: 3, q: 'Which statement is correct?', answer: 2, options: [
        M`System A has the higher \(P@4\), because its relevant results come first.`,
        M`System B has the higher \(P@4\), because its relevant results come later.`,
        M`Both have the same \(P@4\), although A's relevant results come earlier.`,
        M`\(P@4\) cannot be computed without knowing the collection size.`] }],
      explain: M`<p>Both lists have 2 relevant documents in the top 4, so \(P@4 = 2/4 = 0.5\) for both. \(P@k\) ignores the order inside the top \(k\); rank-aware metrics such as RR and AP tell the two apart. See ` + sec('rank', 'Part III') + '.</p>',
    },
    {
      id: 'q11', title: 'First relevant result at rank 4', type: 'single choice', level: 'Easy', skill: 'rank',
      intro: rkRows([['Ranking', 'NNNRN']]) + rkLegend,
      parts: [{ kind: 'mc', pts: 3, q: 'The first relevant result of a query is at <b>rank 4</b>. What is its Reciprocal Rank?', answer: 1, options: ['0.200', '0.250', '0.400', '4.000'] }],
      explain: M`<p>\(RR = 1 / r = 1/4 = 0.250\): the user had to skip three useless results to reach the first relevant one.</p>`,
    },
    {
      id: 'q12', title: 'Changes that RR does not see', type: 'single choice', level: 'Easy–Medium', skill: 'rank',
      intro: '<p>For example, this ranking has its first relevant result at rank 3:</p>' + rkRows([['Ranking', 'NNRNR']]),
      parts: [{ kind: 'mc', pts: 3, q: 'Which change to a ranking leaves its Reciprocal Rank unchanged?', answer: 0, options: [
        'Reordering the documents below the first relevant result.',
        'Moving the first relevant result from rank 3 to rank 2.',
        'Removing the only relevant result from the ranking.',
        'Inserting a non-relevant document above the first relevant one.'] }],
      explain: '<p>RR depends only on the rank of the <b>first</b> relevant result. Anything below it can change without affecting RR. Moving, removing or pushing down that first result changes RR. This is why MRR "ignores everything after the first relevant document".</p>',
    },
    {
      id: 'q13', title: 'Relevant documents the ranking never returned', type: 'single choice', level: 'Medium', skill: 'rank',
      intro: rkRows([['Ranking', 'RNR']]) + '<p>The collection has <b>4</b> relevant documents for this query, so two of them were never returned.</p>',
      parts: [{ kind: 'mc', pts: 3, q: 'How do the two missing relevant documents affect Average Precision?', answer: 2, options: [
        'They leave the denominator, which becomes 2 instead of 4.',
        'They count as relevant at ranks 4 and 5 of the ranking.',
        'They add nothing to the sum but stay in the denominator.',
        'They make AP undefined, because not all were found.'] }],
      explain: M`<p>AP adds up the precision at the ranks where relevant documents were retrieved and divides by \(R\), all relevant documents for the query. Missed documents add no term to the sum but stay in \(R\): \(AP = (1 + 2/3) / 4 \approx 0.417\).</p>`,
    },
    {
      id: 'q14', title: 'From AP to MAP', type: 'single choice', level: 'Easy', skill: 'rank',
      parts: [{ kind: 'mc', pts: 3, q: 'What does Mean Average Precision compute?', answer: 3, options: [
        'Precision averaged over all documents in the collection.',
        'The reciprocal of the average first relevant rank.',
        'The highest AP reached by any query in the test set.',
        'The average of the AP values of the test queries.'] }],
      explain: M`<p>\(MAP = \frac{1}{|Q|} \sum_{q \in Q} AP(q)\): one AP per query, then the mean over the test queries. It scores a whole system, as MRR does for RR.</p>`,
    },
    {
      id: 'q15', title: 'Tasks and metrics', type: 'matching', level: 'Easy–Medium', skill: 'choice',
      parts: [{ kind: 'rows', pts: 3, q: 'Choose the most suitable metric for each task. Every metric is used once.', options: ['MRR', 'Recall@100', 'nDCG@10', 'MAP'], rows: [
        { label: 'Legal document discovery: missing a relevant case is costly.', answer: 1 },
        { label: 'General ad-hoc retrieval: relevant documents should rank well throughout.', answer: 3 },
        { label: 'Navigational search: one correct page should appear quickly.', answer: 0 },
        { label: 'Web results: highly relevant pages should appear near the top.', answer: 2 }] }],
      explain: `<p>MRR rewards an early first relevant result; recall at a deep cutoff rewards finding as much as possible; nDCG@10 rewards high grades near the top; MAP rewards relevant documents ranked high throughout. See "Metric choice follows the task" in ${sec('disagree', 'Part V')}.</p>`,
    },
    /* ---------- Part III: graded relevance ---------- */
    {
      id: 'q16', title: 'The gain of grade 3', type: 'single choice', level: 'Easy', skill: 'graded',
      parts: [{ kind: 'mc', pts: 3, q: M`With the gain \(2^{rel} - 1\), how many points does a document with grade <b>3</b> earn?`, answer: 2, options: ['3', '6', '7', '8'] }],
      explain: M`<p>\(2^3 - 1 = 8 - 1 = 7\). The gains for grades 0, 1, 2, 3 are 0, 1, 3, 7: they grow much faster than the grades.</p>`,
    },
    {
      id: 'q17', title: 'The discount at rank i', type: 'single choice', level: 'Easy', skill: 'graded',
      parts: [{ kind: 'mc', pts: 3, q: M`In the lab's DCG, the gain at rank \(i\) is divided by which value?`, answer: 3, options: [M`\(i\)`, M`\(2^i - 1\)`, M`\(1/i\)`, M`\(\log_2(i + 1)\)`] }],
      explain: M`<p>DCG divides the gain at rank \(i\) by \(\log_2(i + 1)\): 1 at rank 1, 1.585 at rank 2, 2 at rank 3. A logarithm grows slowly, so lower-ranked documents keep part of their value. See ` + sec('graded', 'Part IV') + '.</p>',
    },
    {
      id: 'q18', title: 'Where IDCG comes from', type: 'single choice', level: 'Easy', skill: 'graded',
      parts: [{ kind: 'mc', pts: 3, q: M`For a fixed query, judged documents and cutoff \(k\), how is \(IDCG@k\) obtained?`, answer: 1, options: [
        'Sort the documents from lowest to highest grade, then compute DCG.',
        'Sort the documents from highest to lowest grade, then compute DCG.',
        'Compute DCG of the documents in their original retrieval order.',
        'Divide each grade by the number of retrieved documents.'] }],
      explain: M`<p>IDCG is the DCG of the <b>ideal</b> ranking: the same judged documents sorted from the highest grade to the lowest. It is the best DCG possible for this query, so \(nDCG@k = DCG@k / IDCG@k\) lies between 0 and 1. The original order gives DCG itself, not IDCG.</p>`,
    },
    {
      id: 'q19', title: 'An nDCG of 0.7', type: 'single choice', level: 'Easy–Medium', skill: 'graded',
      parts: [{ kind: 'mc', pts: 3, q: M`A ranking has \(nDCG@10 = 0.7\). What does this mean?`, answer: 0, options: [
        'It reaches 70% of the DCG@10 of the ideal ranking.',
        '7 of its top 10 results are relevant.',
        'It found 70% of the relevant documents in the collection.',
        '7 of its 10 documents are in their ideal position.'] }],
      explain: M`<p>\(nDCG = DCG / IDCG\): 0.7 means the ranking collects 70% of the DCG the ideal order of the same documents would collect. "7 of the top 10 are relevant" is \(P@10 = 0.7\), and "70% of the relevant documents found" is recall.</p>`,
    },
    /* ---------- reading averages ---------- */
    {
      id: 'q20', title: 'A higher MAP', type: 'single choice', level: 'Easy–Medium', skill: 'choice',
      parts: [{ kind: 'mc', pts: 3, q: 'System A has a higher MAP than System B on a set of test queries. What can you conclude <b>without looking at single queries</b>?', answer: 1, options: [
        'A has a higher AP than B on every single test query.',
        'A has the higher mean AP; B may still win on some queries.',
        'A must also have the higher MRR and the higher Recall@100.',
        'A is the better system for every search task and every user.'] }],
      explain: `<p>A mean says nothing about single queries: some queries may strongly prefer B. Other metrics can disagree too, since MRR looks only at the first relevant result. See "Per-query analysis" in ${sec('disagree', 'Part V')}.</p>`,
    },
    /* ---------- calculations ---------- */
    {
      id: 'q21', title: 'Four relevant in the top 10', type: 'numbers', level: 'Medium', skill: 'pr',
      intro: facts([['1,400', 'documents'], ['7', 'relevant to the query'], ['10', 'retrieved'], ['4', 'of them relevant']]),
      parts: [
        { id: 'tp', kind: 'num', pts: 0.25, q: 'True positives:', prefix: M`\(TP\) =`, answer: 4 },
        { id: 'fp', kind: 'num', pts: 0.25, q: 'False positives:', prefix: M`\(FP\) =`, answer: 6 },
        { id: 'fn', kind: 'num', pts: 0.25, q: 'False negatives:', prefix: M`\(FN\) =`, answer: 3 },
        { id: 'tn', kind: 'num', pts: 0.25, q: 'True negatives:', prefix: M`\(TN\) =`, answer: 1387, show: '1,387' },
        { id: 'p', kind: 'num', pts: 1, q: 'Precision at 10 (three decimals):', prefix: M`\(P@10\) =`, answer: 0.4, tol: 0.001, show: '0.400' },
        { id: 'r', kind: 'num', pts: 1, q: 'Recall at 10 (three decimals):', prefix: M`\(Recall@10\) =`, answer: 0.571, tol: 0.001, show: '0.571' },
        { id: 'acc', kind: 'num', pts: 1, q: 'Accuracy over all 1,400 documents (three decimals, or a percentage):', prefix: 'Accuracy =', answer: 0.994, tol: 0.001, pct: true, show: '0.994 (99.4%)' },
      ],
      explain: M`<p>\(TP = 4\), \(FP = 10 - 4 = 6\), \(FN = 7 - 4 = 3\), \(TN = 1400 - 4 - 6 - 3 = 1387\). Then \(P@10 = 4/10 = 0.400\), \(Recall@10 = 4/7 \approx 0.571\), and accuracy \(= (4 + 1387) / 1400 \approx 0.994\). Accuracy is 99.4% while recall is only 57.1%.</p>`,
    },
    {
      id: 'q22', title: 'AP of R N N R N R', type: 'numbers', level: 'Medium', skill: 'rank',
      intro: rkRows([['Ranking', 'RNNRNR']]) + '<p>The collection has <b>exactly four</b> relevant documents for this query, so one of them was not retrieved.</p>',
      parts: [
        { id: 'p4', kind: 'num', pts: 1, q: 'Precision at the second relevant document (rank 4):', prefix: M`\(P@4\) =`, answer: 0.5, tol: 0.001, show: '0.500' },
        { id: 'p6', kind: 'num', pts: 1, q: 'Precision at the third relevant document (rank 6):', prefix: M`\(P@6\) =`, answer: 0.5, tol: 0.001, show: '0.500' },
        { id: 'ap', kind: 'num', pts: 2, q: 'Average Precision (three decimals):', prefix: 'AP =', answer: 0.5, tol: 0.001, show: '0.500' },
      ],
      explain: M`<p>Relevant documents are at ranks 1, 4 and 6: \(P@1 = 1\), \(P@4 = 2/4 = 0.5\), \(P@6 = 3/6 = 0.5\). There are four relevant documents, so \(AP = (1 + 0.5 + 0.5) / 4 = 0.500\). Dividing by 3, the number found, would give 0.667 and is wrong.</p>`,
    },
    {
      id: 'q23', title: 'MRR over three queries', type: 'numbers', level: 'Medium', skill: 'rank',
      intro: '<table class="qz-pq"><thead><tr><th>query</th><th>first relevant result</th></tr></thead><tbody><tr><td>Query 1</td><td>rank 1</td></tr><tr><td>Query 2</td><td>rank 3</td></tr><tr><td>Query 3</td><td>no relevant result retrieved</td></tr></tbody></table>',
      parts: [
        { id: 'rr2', kind: 'num', pts: 1, q: 'RR of Query 2 (three decimals):', prefix: M`\(RR_2\) =`, answer: 0.333, tol: 0.001, show: '0.333' },
        { id: 'rr3', kind: 'num', pts: 1, q: 'RR of Query 3:', prefix: M`\(RR_3\) =`, answer: 0 },
        { id: 'mrr', kind: 'num', pts: 2, q: 'MRR over the three queries (three decimals):', prefix: 'MRR =', answer: 0.444, tol: 0.001, show: '0.444' },
      ],
      explain: M`<p>\(RR_1 = 1/1 = 1\), \(RR_2 = 1/3 \approx 0.333\), and \(RR_3 = 0\) because no relevant result was retrieved. \(MRR = (1 + 1/3 + 0) / 3 = 4/9 \approx 0.444\). The query with no hit still counts in the mean.</p>`,
    },
    {
      id: 'q24', title: 'DCG, IDCG and nDCG of [2, 0, 1]', type: 'numbers', level: 'Medium', skill: 'graded',
      intro: grRows([['Ranking', [2, 0, 1]]]) + grLegend + M`<p>These are all the judged documents for the query. Use the gain \(2^{rel} - 1\) and the discount \(\log_2(i + 1)\).</p>`,
      parts: [
        { id: 'dcg', kind: 'num', pts: 1, q: 'DCG of the ranking (three decimals):', prefix: M`\(DCG@3\) =`, answer: 3.5, tol: 0.002, show: '3.500' },
        { id: 'idcg', kind: 'num', pts: 1, q: 'DCG of the ideal ranking (three decimals):', prefix: M`\(IDCG@3\) =`, answer: 3.631, tol: 0.002, show: '3.631' },
        { id: 'ndcg', kind: 'num', pts: 2, q: 'nDCG (three decimals):', prefix: M`\(nDCG@3\) =`, answer: 0.964, tol: 0.002, show: '0.964' },
      ],
      explain: M`<p>Gains \([3, 0, 1]\): \(DCG@3 = 3/1 + 0/1.585 + 1/2 = 3.500\). The ideal order is \([2, 1, 0]\) with gains \([3, 1, 0]\): \(IDCG@3 = 3 + 1/1.585 + 0 \approx 3.631\). So \(nDCG@3 = 3.5 / 3.631 \approx 0.964\).</p>`,
    },
    /* ---------- case studies ---------- */
    {
      id: 'q25', title: 'Case: two systems, two relevant documents', type: 'case study', level: 'Medium', skill: 'case',
      intro: caseCard('A small test collection', 'For one query, exactly two relevant documents exist in the collection. Two systems return four results each.') + rkRows([['System A', 'RRNN'], ['System B', 'NNRR']]) + rkLegend,
      parts: [
        { id: 'pa', kind: 'num', pts: 1, q: 'Precision at 4 of System A:', prefix: M`\(P@4(A)\) =`, answer: 0.5, tol: 0.001, show: '0.500' },
        { id: 'pb', kind: 'num', pts: 1, q: 'Precision at 4 of System B:', prefix: M`\(P@4(B)\) =`, answer: 0.5, tol: 0.001, show: '0.500' },
        { id: 'rra', kind: 'num', pts: 1, q: 'Reciprocal Rank of System A:', prefix: M`\(RR(A)\) =`, answer: 1, tol: 0.001, show: '1.000' },
        { id: 'rrb', kind: 'num', pts: 1, q: 'Reciprocal Rank of System B (three decimals):', prefix: M`\(RR(B)\) =`, answer: 0.333, tol: 0.001, show: '0.333' },
        { id: 'apa', kind: 'num', pts: 1, q: 'Average Precision of System A:', prefix: M`\(AP(A)\) =`, answer: 1, tol: 0.001, show: '1.000' },
        { id: 'apb', kind: 'num', pts: 1, q: 'Average Precision of System B (three decimals):', prefix: M`\(AP(B)\) =`, answer: 0.417, tol: 0.001, show: '0.417' },
        { id: 'fav', kind: 'mc', pts: 2, q: 'Which system does AP prefer?', answer: 0, options: [
          'System A, whose relevant documents come first',
          'System B, whose relevant documents come at the end',
          'Neither: both have the same precision at 4'] },
      ],
      explain: M`<p>(a) Both have \(P@4 = 2/4 = 0.500\). (b) \(RR(A) = 1/1 = 1\), \(RR(B) = 1/3 \approx 0.333\). (c) \(AP(A) = (1/1 + 2/2) / 2 = 1\); \(AP(B) = (1/3 + 2/4) / 2 = 5/12 \approx 0.417\). AP prefers A, because both relevant documents appear earlier; \(P@4\) alone cannot see this.</p>`,
    },
    {
      id: 'q26', title: 'Case: two rankings on a cooking website', type: 'case study', level: 'Medium–Hard', skill: 'case',
      intro: caseCard('A cooking website', 'It tests two versions of its search for <i>"how to bake bread"</i>. The four judged pages are a full recipe (grade 3), a page explaining how bread is made (grade 2), a page that briefly mentions baking bread (grade 1), and a page about buying shoes (grade 0).') + grRows([['Version A', [1, 3, 0, 2]], ['Version B', [3, 0, 2, 1]]]) + grLegend + M`<p>Evaluate the top 3 with the gain \(2^{rel} - 1\) and the discount \(\log_2(i + 1)\).</p>`,
      parts: [
        { id: 'dcga', kind: 'num', pts: 2, q: 'DCG at 3 of Version A (three decimals):', prefix: M`\(DCG@3(A)\) =`, answer: 5.417, tol: 0.005, show: '5.417' },
        { id: 'ndcga', kind: 'num', pts: 2, q: 'nDCG at 3 of Version A (three decimals):', prefix: M`\(nDCG@3(A)\) =`, answer: 0.577, tol: 0.002, show: '0.577' },
        { id: 'ndcgb', kind: 'num', pts: 2, q: 'nDCG at 3 of Version B (three decimals):', prefix: M`\(nDCG@3(B)\) =`, answer: 0.905, tol: 0.002, show: '0.905' },
        { id: 'p1', kind: 'mc', pts: 2, q: 'Grades 1–3 count as relevant for P@1. Which statement is correct?', answer: 3, options: [
          'P@1 prefers Version B, and nDCG@3 agrees.',
          'P@1 prefers Version A, but nDCG@3 prefers Version B.',
          'Both metrics rate the two versions as equal.',
          'Both have P@1 = 1, but nDCG@3 prefers Version B.'] },
      ],
      explain: M`<p>Version A's top 3 have gains \([1, 7, 0]\): \(DCG@3 = 1/1 + 7/1.585 + 0 \approx 5.417\). The ideal top 3 are grades \([3, 2, 1]\): \(IDCG@3 = 7 + 3/1.585 + 1/2 \approx 9.393\), so \(nDCG@3(A) \approx 0.577\). Version B: \(DCG@3 = 7 + 0 + 3/2 = 8.5\), \(nDCG@3(B) \approx 0.905\). Both first results count as relevant, so \(P@1 = 1\) for both; only nDCG sees that B puts the full recipe first. See ` + sec('graded', 'Part IV') + '.</p>',
    },
    {
      id: 'q27', title: 'Case: different users, different metrics', type: 'case study', level: 'Medium', skill: 'case',
      intro: caseCard('Two search systems', 'They are evaluated on the same test queries. The results are hypothetical.') + '<table class="qz-pq"><thead><tr><th>system</th><th>MRR</th><th>Recall@100</th><th>MAP</th></tr></thead><tbody><tr><td><b>A</b></td><td>0.780</td><td>0.420</td><td>0.400</td></tr><tr><td><b>B</b></td><td>0.610</td><td>0.890</td><td>0.460</td></tr></tbody></table>',
      parts: [
        { id: 'nav', kind: 'mc', pts: 2, q: 'A <b>navigational search tool</b>: users mainly want the first correct result quickly. Based on these metrics, which system fits better?', answer: 0, letters: false, options: ['System A', 'System B'] },
        { id: 'legal', kind: 'mc', pts: 2, q: '<b>Legal document discovery</b>: missing a relevant case is costly. Based on these metrics, which system fits better?', answer: 1, letters: false, options: ['System A', 'System B'] },
        { id: 'checks', kind: 'multi', pts: 4, q: 'The averages disagree. Which per-query checks would help before choosing a system for deployment?', answer: [0, 2, 4], options: [
          'For navigational queries, look up the rank of the first relevant result under A and under B.',
          'Average MRR, Recall@100 and MAP into one score per system and pick the higher one.',
          'For legal topics, list the relevant documents each system missed, query by query.',
          'Compare the average length of the test queries the two systems received.',
          'Find the queries where the two systems differ most and read both result lists.'] },
      ],
      explain: `<p>(a) <b>A</b>: its MRR is higher (0.780 vs 0.610), and MRR measures how early the first relevant result appears. (b) <b>B</b>: its Recall@100 is much higher (0.890 vs 0.420); B also has the higher MAP, but recall is the stronger reason. (c) Per-query checks show what the means hide: where A really puts the right page first, which relevant documents each system misses, and which queries drive the difference. Averaging three different metrics into one number hides the disagreement, and both systems ran the same queries, so query length tells nothing. See ${sec('disagree', 'Part V')}.</p>`,
    },
  ],
};

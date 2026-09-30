# Lab 05 — Evaluating Information Retrieval Systems

> **Format:** 90-minute lecturer-led seminar  
> **Structure:** 2 × 45 minutes  
> **Audience:** Master's students in Information Retrieval  
> **Style:** explanation + worked examples + live evaluation demo  
> **Primary dataset:** Cranfield  
> **Systems compared:** TF-IDF and BM25

---

## Seminar goal

Lab 04 answered:

> How do we rank documents?

Lab 05 answers:

> How do we know whether that ranking is good?

The core evaluation pipeline is:

```text
queries
   +
system rankings
   +
relevance judgments
   ↓
metrics
```

Students should understand not only how to calculate standard metrics, but what user behavior each metric approximates.

---

# Learning objectives

By the end of the seminar, students should be able to explain:

- why retrieval evaluation requires relevance judgments;
- the difference between Precision and Recall;
- why rank-aware metrics are needed;
- the meaning of Reciprocal Rank and MRR;
- the meaning of Average Precision and MAP;
- how graded relevance leads to DCG and nDCG;
- why different metrics can produce different conclusions;
- why Recall@k is especially important in RAG-style retrieval.

---

# Session plan

## First 45 minutes

| Time | Topic |
|---|---|
| 0–10 min | Why retrieval evaluation is necessary |
| 10–25 min | Precision and Recall |
| 25–40 min | RR, MRR, AP, MAP |
| 40–45 min | Recap |

## Second 45 minutes

| Time | Topic |
|---|---|
| 45–60 min | DCG and nDCG |
| 60–75 min | Live Cranfield evaluation |
| 75–85 min | Metric choice and per-query analysis |
| 85–90 min | RAG connection and summary |

---

# Part I — Why evaluation?

## 0–10 min

Start with two rankings for the same query.

```text
System A:
D8, D4, D19, D2, D7

System B:
D2, D8, D3, D19, D4
```

Ask:

> Which system is better?

The answer is:

```text
We do not know.
```

We need relevance judgments.

---

# Relevance judgments

For each query-document pair, a human assessor may assign a label such as:

```text
relevant
not relevant
```

or a grade:

```text
0 = not relevant
1 = somewhat relevant
2 = relevant
3 = highly relevant
```

Once we have:

```text
ranking + relevance
```

we can calculate metrics.

---

# Offline evaluation setup

Draw:

```text
           ┌────────────┐
query ────▶│ retrieval  │
           │  system    │
           └─────┬──────┘
                 │
                 ▼
          ranked documents
                 │
                 ▼
        relevance judgments
                 │
                 ▼
              metric
```

The metric is a summary of ranking quality under a particular definition of relevance.

---

# Part II — Precision and Recall

## 10–25 min

Use this toy ranking throughout:

| Rank | Document | Relevant? |
|---:|---|---|
| 1 | D1 | yes |
| 2 | D2 | no |
| 3 | D3 | yes |
| 4 | D4 | no |
| 5 | D5 | yes |

Assume the collection contains exactly these three relevant documents:

```text
D1, D3, D5
```

---

# Precision

Precision asks:

> Of the documents we retrieved, how many are relevant?

\[
Precision =
\frac{
\text{relevant retrieved}
}{
\text{retrieved}
}
\]

At rank 5:

```text
3 relevant out of 5
```

so:

\[
P@5 = \frac{3}{5}=0.6
\]

---

# Precision@k

For ranked retrieval we usually calculate precision at a cutoff.

Examples:

```text
P@1
P@5
P@10
P@20
```

For the toy example:

```text
P@1 = 1/1 = 1.0
P@3 = 2/3
P@5 = 3/5
```

---

# Recall

Recall asks:

> Of all relevant documents that exist, how many did we retrieve?

\[
Recall =
\frac{
\text{relevant retrieved}
}{
\text{all relevant}
}
\]

At rank 3:

```text
we found 2 of the 3 relevant documents
```

so:

\[
Recall@3 = \frac{2}{3}
\]

At rank 5:

\[
Recall@5 = 1.0
\]

---

# Precision vs Recall

Use a simple contrast.

Suppose there are 10 relevant documents.

```text
System A retrieves 2 documents.
Both are relevant.

Precision = 1.0
Recall    = 0.2
```

```text
System B retrieves 100 documents.
10 are relevant.

Precision = 0.1
Recall    = 1.0
```

### Main point

Precision and Recall answer different questions.

Neither is universally more important.

---

# Retrieval depth

Ask:

> What usually happens when we retrieve more and more documents?

Often:

```text
Recall tends to increase.
Precision often decreases.
```

But avoid presenting that as a mathematical guarantee for every individual step.

---

# Part III — Why rank position matters

## 25–40 min

Compare:

```text
Ranking A:
R R R N N N N N N N
```

and:

```text
Ranking B:
N N N N N N N R R R
```

Both have:

\[
P@10=0.3
\]

Yet Ranking A is clearly preferable for most users.

So we need rank-aware metrics.

---

# Reciprocal Rank

Reciprocal Rank cares about the first relevant result.

\[
RR=\frac{1}{r}
\]

where \(r\) is the rank of the first relevant result.

Examples:

```text
first relevant at rank 1 → RR = 1
first relevant at rank 2 → RR = 0.5
first relevant at rank 5 → RR = 0.2
```

If there is no relevant result:

```text
RR = 0
```

---

# Mean Reciprocal Rank

Across many queries:

\[
MRR=
\frac{1}{|Q|}
\sum_{q\in Q}
RR(q)
\]

Explain the distinction:

```text
RR  → one query
MRR → mean across queries
```

---

# When is MRR useful?

Tasks where the user mainly wants one good result:

- navigational search;
- entity lookup;
- question answering;
- some FAQ tasks.

But MRR ignores everything after the first relevant document.

---

# Average Precision

Average Precision considers all relevant documents.

For one query:

\[
AP =
\frac{1}{R}
\sum_{k=1}^{N}
P@k \cdot rel(k)
\]

In words:

> Every time we encounter a relevant document, record the precision at that point. Then average those values.

For:

```text
R N R N R
```

we use:

```text
P@1
P@3
P@5
```

---

# Worked AP example

For the ranking:

```text
R N R N R
```

we have:

\[
P@1=1
\]

\[
P@3=\frac{2}{3}
\]

\[
P@5=\frac{3}{5}
\]

Therefore:

\[
AP=
\frac{
1+\frac{2}{3}+\frac{3}{5}
}{3}
\]

The exact decimal is less important than understanding the procedure.

---

# Mean Average Precision

Across queries:

\[
MAP=
\frac{1}{|Q|}
\sum_{q\in Q}
AP(q)
\]

Again:

```text
AP  → one query
MAP → average across queries
```

---

# First-half recap

## 40–45 min

Use this table.

| Metric | Main question |
|---|---|
| Precision@k | How many of the top \(k\) are relevant? |
| Recall@k | How much of the relevant material did we find? |
| RR | Where is the first relevant result? |
| MRR | How early is the first relevant result on average? |
| AP | Are relevant documents consistently ranked high? |
| MAP | Mean AP across queries |

Then transition:

> So far relevance has been binary. What if some relevant documents are much better than others?

---

# Part IV — Graded relevance

## 45–60 min

Cranfield contains graded relevance.

A document may be:

```text
slightly relevant
useful
highly relevant
complete answer
```

Binary metrics collapse all of these into:

```text
relevant
```

That loses information.

This motivates DCG and nDCG.

---

# DCG

A common form is:

\[
DCG@k=
\sum_{i=1}^{k}
\frac{
2^{rel_i}-1
}{
\log_2(i+1)
}
\]

There are two ideas here.

---

## Gain

Higher relevance grades produce larger gains.

Using:

\[
gain(rel)=2^{rel}-1
\]

we get:

| relevance | gain |
|---:|---:|
| 0 | 0 |
| 1 | 1 |
| 2 | 3 |
| 3 | 7 |
| 4 | 15 |

Highly relevant documents therefore matter more.

---

## Discount

Lower ranks receive less credit because of:

\[
\log_2(i+1)
\]

So:

```text
high relevance near the top
```

is rewarded most.

---

# Why normalize?

Raw DCG depends on how much relevance is available for the query.

A query with many highly relevant documents can naturally achieve a larger DCG.

So we calculate the ideal ranking:

```text
highest grade first
next highest second
...
```

This gives:

\[
IDCG@k
\]

Then:

\[
nDCG@k=
\frac{DCG@k}{IDCG@k}
\]

A perfect ranking has:

\[
nDCG@k=1
\]

---

# Small example

Suppose the system ranks:

```text
[3, 0, 2, 1]
```

The ideal order is:

```text
[3, 2, 1, 0]
```

The system's DCG is lower than the ideal DCG because the relevance-2 and relevance-1 documents appear too late.

That is the main intuition.

---

# Part V — Live evaluation on Cranfield

## 60–75 min

Load the dataset:

```python
import ir_datasets

dataset = ir_datasets.load("cranfield")

queries = list(dataset.queries_iter())
qrels = list(dataset.qrels_iter())
```

Inspect relevance grades:

```python
from collections import Counter

Counter(
    q.relevance
    for q in qrels
)
```

Explain:

```text
Cranfield has graded judgments.
```

For binary metrics we can use:

```text
relevance >= 1
```

For nDCG we preserve the grades.

---

# Using `ir_measures`

For a lecture, use an established evaluation library instead of spending the whole session implementing metrics.

```bash
pip install ir_measures
```

Assume we have the two run files from Lab 04:

```text
lab04_tfidf.run
lab04_bm25.run
```

Then:

```python
import ir_measures
from ir_measures import P, Recall, RR, AP, nDCG

tfidf_run = ir_measures.read_trec_run(
    "lab04_tfidf.run"
)

bm25_run = ir_measures.read_trec_run(
    "lab04_bm25.run"
)
```

Evaluate:

```python
metrics = [
    P(rel=1) @ 10,
    Recall(rel=1) @ 100,
    RR(rel=1),
    AP(rel=1),
    nDCG @ 10,
]
```

TF-IDF:

```python
tfidf_scores = ir_measures.calc_aggregate(
    metrics,
    qrels,
    tfidf_run
)
```

BM25:

```python
bm25_scores = ir_measures.calc_aggregate(
    metrics,
    qrels,
    bm25_run
)
```

Then print both.

---

# What to emphasize

Do not let the class focus only on:

```text
which row has the larger number?
```

Instead ask:

```text
Which metric changed?

What user behavior does that metric represent?

Is the difference at rank 10, rank 100, or across the whole ranking?
```

---

# Part VI — Different metrics can disagree

## 75–85 min

Suppose you observe:

```text
System A:
higher P@10

System B:
higher Recall@100
```

There is no contradiction.

The systems are strong in different ways.

Similarly:

```text
System A:
higher MRR

System B:
higher MAP
```

can happen because:

```text
MRR
→ cares about first relevant result

MAP
→ cares about all relevant results
```

---

# Metric choice follows the task

Use these examples.

## Web search

Often cares strongly about early ranks:

```text
P@5
P@10
nDCG@10
```

---

## Legal or medical literature search

Often values finding as much relevant material as possible:

```text
Recall@100
Recall@1000
```

---

## Navigational search

Often wants one correct result quickly:

```text
MRR
```

---

## General ad-hoc retrieval

Often uses:

```text
MAP
nDCG
```

---

# Per-query analysis

Averages can hide failures.

Suppose:

```text
BM25 MAP = 0.41
TF-IDF MAP = 0.39
```

This does not mean BM25 beats TF-IDF on every query.

Some queries may strongly prefer TF-IDF.

Others may strongly prefer BM25.

That is why serious IR evaluation often includes:

```text
aggregate metrics
+
per-query analysis
+
error analysis
```

---

# Part VII — Connection to RAG

## 85–90 min

A RAG pipeline looks like:

```text
question
   ↓
retriever
   ↓
top-k passages
   ↓
LLM
   ↓
answer
```

Suppose the correct passage is ranked:

```text
7th
```

but the LLM receives only:

```text
top 5
```

Then the generation model never sees the evidence.

This makes:

\[
Recall@k
\]

especially important for RAG retrieval.

---

# Two different RAG failures

## Retrieval failure

```text
correct evidence was not retrieved
```

## Generation failure

```text
correct evidence was retrieved,
but the model still produced a poor answer
```

Later in the course, students should learn to diagnose these separately.

---

# Final summary

End with this table.

| Metric | Best interpretation |
|---|---|
| P@k | How clean are the top results? |
| Recall@k | How much relevant material did we retrieve? |
| MRR | How quickly did we find the first relevant result? |
| MAP | Are relevant documents ranked high throughout the ranking? |
| nDCG@k | Are the most relevant documents ranked highest? |

Then show:

```text
Lab 04
build a ranking

Lab 05
evaluate the ranking

Later labs
replace the retriever
but keep the evaluation framework
```

---

# Five points students should remember

1. A retrieval score is meaningless without an evaluation setup.
2. Precision and Recall measure different retrieval goals.
3. Rank position matters.
4. Different metrics encode different assumptions about user needs.
5. RAG does not eliminate retrieval evaluation; it makes it even more important.

---

# Optional after-class exercise

Ask students to evaluate TF-IDF and BM25 on Cranfield with:

```text
P@10
Recall@100
MRR
MAP
nDCG@10
```

Then choose two queries where the systems differ strongly and inspect the rankings manually.

The purpose is not to produce a large report.

The purpose is to connect:

```text
metric difference
```

to:

```text
actual ranking behavior
```

---

# Dataset reference

Cranfield:

- https://ir-datasets.com/cranfield.html

---

# Evaluation library

`ir_measures`:

- https://ir-measur.es/

---

# Suggested reading

Christopher D. Manning, Prabhakar Raghavan, Hinrich Schütze.  
*Introduction to Information Retrieval.*

Relevant topics:

- Precision and Recall;
- ranked retrieval evaluation;
- MAP;
- DCG and nDCG.

- https://nlp.stanford.edu/IR-book/

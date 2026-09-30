# Lab 10 — Hybrid Retrieval, Reciprocal Rank Fusion, and Reranking

> **Format:** 90-minute lecturer-led seminar  
> **Structure:** 2 × 45 minutes  
> **Audience:** Master's students in Information Retrieval  
> **Style:** explanation + worked examples + short live demos  
> **Main themes:** multi-stage retrieval, lexical + dense fusion, Reciprocal Rank Fusion, cross-encoder reranking  
> **Dataset for demos:** Cranfield  
> **Prerequisites:** Lab 04 (BM25), Lab 05 (evaluation), Lab 08–09 (dense retrieval + ANN)

---

## Seminar goal

By this point, students have seen two strong but different retrieval paradigms:

```text
Lexical retrieval
BM25
```

and:

```text
Dense retrieval
embeddings + vector search
```

Each solves problems the other can struggle with.

BM25 is often strong when:

```text
exact wording matters
rare terms matter
identifiers matter
```

Dense retrieval is often strong when:

```text
semantic similarity matters
wording differs
paraphrases occur
```

This raises a natural question:

> **Why choose only one?**

Modern retrieval systems often combine multiple retrievers, then apply a more expensive reranker to the best candidates.

The central progression in this seminar is:

```text
BM25 candidates
      +
dense candidates
      ↓
fusion
      ↓
larger candidate set
      ↓
cross-encoder reranking
      ↓
final top-k
```

This is the architecture students should understand before we introduce full RAG systems.

---

# Learning objectives

By the end of the seminar, students should be able to explain:

- why lexical and dense retrieval are complementary;
- what hybrid retrieval means;
- why combining raw BM25 and dense scores directly can be problematic;
- how rank fusion differs from score fusion;
- how Reciprocal Rank Fusion works;
- why candidate generation and reranking are separate stages;
- what a cross-encoder does;
- why cross-encoders are more expensive than bi-encoders;
- how to choose candidate-set sizes;
- how to evaluate multi-stage retrieval systems;
- how hybrid retrieval and reranking fit naturally into RAG.

---

# Session plan

## First 45 minutes

| Time | Topic |
|---|---|
| 0–10 min | Why hybrid retrieval? |
| 10–22 min | Candidate generation and multi-stage retrieval |
| 22–35 min | Rank fusion and Reciprocal Rank Fusion |
| 35–42 min | Worked fusion example |
| 42–45 min | First-half recap |

## Second 45 minutes

| Time | Topic |
|---|---|
| 45–58 min | Cross-encoder reranking |
| 58–70 min | Live hybrid retrieval demo |
| 70–80 min | Live reranking demo |
| 80–86 min | Evaluation and trade-offs |
| 86–90 min | RAG connection and summary |

---

# Part I — Why hybrid retrieval?

## 0–10 min

Start with two query types.

### Query A

```text
RFC 9309 robots exclusion protocol
```

BM25 is likely to perform well because `RFC 9309` is a very distinctive lexical signal.

### Query B

```text
how to fix a broken car engine
```

A relevant document may say:

```text
automobile maintenance and engine servicing
```

Dense retrieval may help because the wording differs.

---

# Different failure modes

BM25 may miss relevant documents because:

```text
query and document use different vocabulary
```

Dense retrieval may miss relevant documents because:

```text
exact identifiers or rare terms are poorly represented
```

So the systems are complementary.

---

# The hybrid idea

Instead of:

```text
BM25 OR dense
```

use:

```text
BM25 AND dense
```

More precisely:

```text
run both retrievers
combine their candidate rankings
```

This is called **hybrid retrieval**.

---

# Part II — Multi-stage retrieval

## 10–22 min

A modern retrieval pipeline is often not one ranking model.

It is a sequence of stages.

### Stage 1 — candidate generation

Goal:

```text
retrieve a reasonably small set
with high recall
```

Possible candidate generators:

```text
BM25
dense retriever
hybrid combination
```

For example:

```text
collection:
1,000,000 documents

candidate generator:
top 100
```

### Stage 2 — reranking

Now apply a slower but more accurate model only to:

```text
100 candidates
```

instead of:

```text
1,000,000 documents
```

Then return:

```text
top 10
```

The architecture is:

```text
query
  ↓
candidate generation
  ↓
top 100
  ↓
reranker
  ↓
top 10
```

This is a fundamental IR systems pattern.

---

# Why not use the best model on everything?

Suppose a sophisticated relevance model takes:

```text
20 ms per query-document pair
```

For:

```text
1,000,000 documents
```

that is impossible.

For:

```text
100 candidates
```

it becomes feasible.

This is the key engineering idea.

---

# Recall first, precision later

The stages often optimize different goals.

Candidate generation should avoid missing relevant material:

```text
high Recall@k
```

Reranking should improve ordering near the top:

```text
nDCG@10
MRR
P@10
```

This connects directly to Lab 05.

---

# Part III — Combining BM25 and dense retrieval

## 22–35 min

Suppose BM25 returns:

```text
1. D8
2. D2
3. D5
4. D9
5. D1
```

Dense retrieval returns:

```text
1. D3
2. D8
3. D5
4. D7
5. D2
```

How should we combine them?

---

# Naive score addition

A first idea is:

\[
score(d)=BM25(d)+Dense(d)
\]

But there is a problem.

BM25 scores and dense-similarity scores are on different scales.

Example:

```text
BM25:
12.4
8.9
6.2

dense cosine:
0.82
0.76
0.69
```

Adding these directly is arbitrary.

---

# Score normalization

One possibility is to normalize scores first.

For example:

```text
min-max normalization
z-score normalization
```

Then combine:

\[
score(d)=\alpha s_{BM25}(d)+(1-\alpha)s_{dense}(d)
\]

This can work.

But now we must choose:

```text
normalization
alpha
```

and these choices may depend on the dataset.

---

# Rank fusion

An alternative is:

> Ignore raw score magnitudes and combine the rankings instead.

This is **rank fusion**.

It is attractive because BM25 and dense scores no longer need to be directly comparable.

---

# Reciprocal Rank Fusion

A common rank-fusion method is **Reciprocal Rank Fusion (RRF)**.

For document \(d\):

\[
RRF(d)=\sum_{r \in R}\frac{1}{k+rank_r(d)}
\]

where:

- \(R\) = set of ranked lists;
- \(rank_r(d)\) = position of document \(d\) in ranking \(r\);
- \(k\) = a constant that reduces the effect of very high ranks.

A commonly used value is:

```text
k = 60
```

---

# RRF intuition

A document gets more credit if it appears high in one ranking, and even more if it appears high in multiple rankings.

Documents absent from a ranking contribute nothing from that ranking.

RRF is attractive because it is:

```text
simple
robust
score-scale independent
easy to implement
```

---

# Part IV — Worked RRF example

## 35–42 min

Use two rankings.

### BM25

```text
rank 1 → D8
rank 2 → D2
rank 3 → D5
rank 4 → D9
```

### Dense

```text
rank 1 → D3
rank 2 → D8
rank 3 → D5
rank 4 → D2
```

Let:

```text
k = 60
```

Then:

\[
RRF(D8)=\frac{1}{61}+\frac{1}{62}
\]

\[
RRF(D2)=\frac{1}{62}+\frac{1}{64}
\]

\[
RRF(D5)=\frac{1}{63}+\frac{1}{63}
\]

\[
RRF(D3)=\frac{1}{61}
\]

The exact decimals are not important.

The important point is that documents supported by both retrievers accumulate evidence.

---

# Minimal RRF implementation

```python
from collections import defaultdict

def reciprocal_rank_fusion(rankings, k=60):
    scores = defaultdict(float)

    for ranking in rankings:
        for rank, doc_id in enumerate(ranking, start=1):
            scores[doc_id] += 1.0 / (k + rank)

    return sorted(
        scores.items(),
        key=lambda x: x[1],
        reverse=True
    )
```

---

# First-half recap

## 42–45 min

Put this on the board:

```text
BM25
   \
    \
     → candidate fusion → larger candidate set
    /
   /
Dense
```

Then ask:

> Can we do better than either retriever's original score once we have only 50–100 candidates?

Yes.

We can use a model that examines the query and each candidate **together**.

That leads to cross-encoder reranking.

---

# Part V — Cross-encoder reranking

## 45–58 min

Recall the bi-encoder from Lab 08:

```text
query
  ↓
encoder
  ↓
query vector

document
  ↓
encoder
  ↓
document vector

similarity(query vector, document vector)
```

The query and document are encoded separately.

That is efficient.

---

# Cross-encoder idea

A cross-encoder instead processes:

```text
query + document
```

jointly.

Conceptually:

```text
[QUERY] + [DOCUMENT]
          ↓
      transformer
          ↓
    relevance score
```

The model can directly model interactions between words in the query and document.

---

# Why cross-encoders can be stronger

A bi-encoder compresses each text into one vector before comparison.

A cross-encoder can inspect token-level interactions directly.

For example:

```text
query:
"treatment for myocardial infarction"

document:
"therapy after a heart attack"
```

The model sees both texts simultaneously.

---

# Why cross-encoders are expensive

For every query-document pair:

```text
run the transformer again
```

You cannot normally precompute one reusable document score independent of the query.

So:

```text
1 query × 1,000,000 documents
```

is too expensive.

But:

```text
1 query × 100 candidates
```

is practical.

This is why reranking is a second-stage operation.

---

# Bi-encoder vs cross-encoder

| Property | Bi-encoder | Cross-encoder |
|---|---|---|
| Query/document encoded separately | yes | no |
| Document vectors precomputable | yes | no |
| Fast large-scale retrieval | yes | no |
| Direct query-document interaction | limited | strong |
| Good for candidate generation | yes | no |
| Good for reranking | sometimes | yes |

---

# Reranking pipeline

```text
query
   ↓
BM25 + dense
   ↓
RRF
   ↓
top 50
   ↓
cross-encoder
   ↓
top 10
```

This is the core architecture of the lab.

---

# Part VI — Live hybrid retrieval demo

## 58–70 min

Reuse the systems from earlier labs:

```text
BM25
dense retrieval
```

Assume:

```python
bm25_results = ["D8", "D2", "D5", "D9", "D1"]

dense_results = ["D3", "D8", "D5", "D7", "D2"]
```

Fuse:

```python
fused = reciprocal_rank_fusion(
    [bm25_results, dense_results],
    k=60
)

for doc_id, score in fused:
    print(doc_id, round(score, 5))
```

Explain:

```text
RRF uses only rank positions
not raw retrieval scores
```

---

# Real Cranfield hybrid function

Assume:

```python
search_bm25(query, k=50)
search_dense(query, k=50)
```

each returns:

```text
(doc_id, title, score)
```

Then:

```python
def search_hybrid(query, k=10):
    bm25 = search_bm25(query, k=50)
    dense = search_dense(query, k=50)

    bm25_ids = [doc_id for doc_id, _, _ in bm25]
    dense_ids = [doc_id for doc_id, _, _ in dense]

    fused = reciprocal_rank_fusion(
        [bm25_ids, dense_ids],
        k=60
    )

    return fused[:k]
```

For one Cranfield query, print:

```text
top 5 BM25
top 5 dense
top 5 hybrid
```

Ask which documents survive because both retrievers support them and which appear because only one retriever found them.

---

# Part VII — Live reranking demo

## 70–80 min

Use a pre-trained cross-encoder.

Install:

```bash
pip install sentence-transformers
```

Load:

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder(
    "cross-encoder/ms-marco-MiniLM-L-6-v2"
)
```

Take the hybrid top 20 or top 50 candidate documents.

Build query-document pairs:

```python
pairs = [
    (query, document_text)
    for document_text in candidate_texts
]
```

Predict relevance scores:

```python
scores = reranker.predict(pairs)
```

Sort candidates:

```python
reranked = sorted(
    zip(candidate_ids, candidate_texts, scores),
    key=lambda x: x[2],
    reverse=True
)
```

Print the top results.

---

# What to emphasize

The reranker does not search the full collection.

It only reorders a candidate set.

This distinction is fundamental:

```text
retriever
→ broad candidate generation

reranker
→ precise ordering
```

---

# Candidate size matters

Suppose the retriever returns only the top 10 candidates.

If the relevant document was ranked 17th, the reranker can never recover it.

Therefore candidate generation must have enough recall.

A common pattern is:

```text
retrieve top 50 or 100
rerank
keep top 5 or 10
```

The exact numbers depend on the system.

---

# Part VIII — Evaluation and trade-offs

## 80–86 min

Evaluate stages separately.

### Candidate-generation quality

Measure:

```text
Recall@50
Recall@100
```

Question:

> Did the candidate generator include the relevant documents?

### Final-ranking quality

Measure:

```text
nDCG@10
MRR
P@10
MAP
```

Question:

> Did the reranker put the best candidates at the top?

---

# End-to-end comparison

A useful experiment is:

| System | Recall@100 | MRR | nDCG@10 |
|---|---:|---:|---:|
| BM25 | ... | ... | ... |
| Dense | ... | ... | ... |
| Hybrid RRF | ... | ... | ... |
| Hybrid + Cross-Encoder | ... | ... | ... |

This shows what each stage contributes.

---

# Latency also matters

A reranked system may be more accurate but slower.

A real system balances:

```text
effectiveness
latency
compute cost
memory
```

For example:

```text
BM25:
fast

dense ANN:
fast after indexing

cross-encoder:
much more expensive per candidate
```

So the system architecture is designed around computational constraints.

---

# Ablation thinking

If the final system improves, ask:

```text
Was it because of dense retrieval?
Was it because of RRF?
Was it because of reranking?
```

An ablation removes one component at a time.

Example:

```text
BM25
BM25 + dense
BM25 + dense + RRF
BM25 + dense + RRF + reranker
```

This is much more informative than evaluating only the final pipeline.

---

# Part IX — Connection to RAG

## 86–90 min

A strong RAG retrieval stack often looks like:

```text
user question
      ↓
BM25 retrieval
      +
dense retrieval
      ↓
fusion
      ↓
top 50 candidates
      ↓
reranker
      ↓
top 5 chunks
      ↓
LLM
```

This is why the previous labs matter.

RAG retrieval is not simply:

```text
put documents in vector DB
then ask LLM
```

A serious pipeline separates:

```text
candidate generation
fusion
reranking
context selection
generation
```

---

# Why reranking matters for RAG

The LLM has limited context.

Suppose:

```text
top 50 retrieved chunks
```

but the model can only receive:

```text
top 5
```

Reranking decides which five pieces of evidence survive.

Poor reranking can therefore remove useful evidence even if candidate generation succeeded.

---

# Final summary

End with this architecture:

```text
              BM25
                \
                 \
query ------------→ RRF → top 50 → cross-encoder → top 5
                 /
                /
          dense retrieval
```

Then connect it to the course progression:

```text
Lab 04
lexical ranking

Lab 08–09
dense retrieval + vector search

Lab 10
hybrid retrieval + reranking

Lab 11
RAG
```

---

# Five points students should remember

1. BM25 and dense retrieval are complementary candidate generators.
2. Rank fusion combines rankings without requiring comparable raw scores.
3. RRF is a simple and robust hybrid-retrieval baseline.
4. Cross-encoders are too expensive for full-corpus retrieval but strong for reranking.
5. Multi-stage retrieval separates high-recall candidate generation from high-precision final ranking.

---

# Optional after-class exercise

Using Cranfield, compare four systems:

```text
BM25
Dense
Hybrid RRF
Hybrid RRF + Cross-Encoder
```

Evaluate:

```text
Recall@100
MRR
MAP
nDCG@10
```

Then produce:

| System | Recall@100 | MRR | MAP | nDCG@10 |
|---|---:|---:|---:|---:|
| BM25 | ... | ... | ... | ... |
| Dense | ... | ... | ... | ... |
| Hybrid RRF | ... | ... | ... | ... |
| Hybrid + reranker | ... | ... | ... | ... |

Questions:

1. Does hybrid retrieval improve Recall@100?
2. Does reranking improve nDCG@10?
3. Does reranking ever hurt?
4. Are there queries where BM25 alone is still strongest?
5. Are there queries where dense retrieval contributes unique relevant documents?

---

# Optional RRF parameter exercise

Test:

```text
k = 10
k = 30
k = 60
k = 100
```

in the RRF formula.

Evaluate:

```text
nDCG@10
Recall@100
```

The purpose is not to find a universal best value.

The purpose is to show that fusion also has hyperparameters.

---

# Optional candidate-size experiment

Retrieve and rerank:

```text
top 10
top 20
top 50
top 100
```

candidates.

Measure:

```text
reranking latency
nDCG@10
Recall@candidate_size
```

Discuss:

```text
too few candidates
→ reranker cannot recover missed relevant documents

too many candidates
→ higher computation cost
```

---

# Optional failure-analysis exercise

Find three queries where:

```text
BM25 > dense
```

and three where:

```text
dense > BM25
```

Then inspect the hybrid result.

Look for causes such as:

```text
exact lexical match
rare technical terms
paraphrase
vocabulary mismatch
short query
ambiguous query
```

---

# Suggested dependencies

```bash
pip install sentence-transformers ir_datasets numpy
```

Reuse the BM25 and dense-retrieval code from previous labs.

No new vector database is required.

The conceptual priority is:

```text
fusion
→ candidate generation
→ reranking
```

---

# Suggested reading

## Reciprocal Rank Fusion

Gordon V. Cormack, Charles L. A. Clarke, Stefan Büttcher.  
*Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods.*

The important practical idea is:

```text
combine rank positions rather than raw score scales
```

## Cross-encoder reranking

Students should understand the architectural contrast:

```text
bi-encoder
→ retrieval

cross-encoder
→ reranking
```

The exact model family is less important than the distinction.

---

# Dataset reference

Cranfield:

- https://ir-datasets.com/cranfield.html

---

# Bridge to Lab 11

Students now understand a realistic retrieval stack:

```text
BM25
   +
dense retrieval
   ↓
fusion
   ↓
reranking
   ↓
top evidence
```

The next question is:

> What do we do with the retrieved evidence?

Lab 11 can now introduce Retrieval-Augmented Generation:

```text
documents
→ chunking
→ indexing
→ retrieval
→ reranking
→ prompt construction
→ LLM generation
```

The generator is added **after** the retrieval system is already understood.

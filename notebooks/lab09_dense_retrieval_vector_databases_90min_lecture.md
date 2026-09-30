# Lab 09 — Dense Retrieval, Semantic Search, Vector Indexes, and Vector Databases

> **Format:** 90-minute lecturer-led seminar  
> **Structure:** 2 × 45 minutes  
> **Audience:** Master's students in Information Retrieval  
> **Prerequisite:** Lab 08 — Embeddings, Encoders, and Transformers  
> **Style:** explanation + worked examples + short live demos  
> **Main themes:** bi-encoder retrieval, dense passage retrieval, exact search, vector indexes, FAISS, approximate nearest neighbors

---

## Seminar goal

Lab 08 answered:

> Where does a dense text vector come from?

Lab 09 asks:

> How do we use those vectors to retrieve documents efficiently?

The central pipeline is:

```text
documents
   ↓
encoder
   ↓
document vectors
   ↓
vector index

query
   ↓
encoder
   ↓
query vector
   ↓
nearest-neighbor search
   ↓
top-k documents
```

The seminar deliberately separates:

```text
representation quality
```

from:

```text
search/index quality
```

They are different problems.

---

# Learning objectives

By the end of the seminar, students should be able to explain:

- how bi-encoder retrieval works;
- why passages are often indexed instead of entire long documents;
- how Dense Passage Retrieval fits the bi-encoder pattern;
- cosine similarity and dot-product scoring;
- what exact nearest-neighbor search means;
- why brute-force dense search becomes expensive at scale;
- the role of a vector index;
- what approximate nearest-neighbor search means;
- why ANN trades some exactness for speed;
- the difference between IR Recall@k and ANN recall;
- the role of FAISS;
- how vector search fits into a RAG system.

---

# Session plan

## First 45 minutes

| Time | Topic |
|---|---|
| 0–10 min | From embeddings to retrieval |
| 10–22 min | Bi-encoders and Dense Passage Retrieval |
| 22–32 min | Similarity functions and exact search |
| 32–40 min | Scaling and memory |
| 40–45 min | First-half recap |

## Second 45 minutes

| Time | Topic |
|---|---|
| 45–58 min | Approximate nearest-neighbor search |
| 58–67 min | FAISS: exact and approximate indexes |
| 67–75 min | What is a vector database? |
| 75–83 min | Exact-vs-ANN live demo |
| 83–87 min | Recall–latency–memory trade-offs |
| 87–90 min | Bridge to hybrid retrieval |

---

# Part I — From embeddings to retrieval

## 0–10 min

From Lab 08:

```text
text
 ↓
tokenizer
 ↓
Transformer encoder
 ↓
contextual token vectors
 ↓
pooling
 ↓
text embedding
```

Now suppose every document has a vector.

Retrieval becomes:

> Find document vectors that are closest to the query vector.

Formally:

\[
\operatorname{top-k}_{d \in D}
sim(E_q(q), E_d(d))
\]

---

# Dense retrieval architecture

```text
                OFFLINE
documents
   ↓
document encoder
   ↓
document vectors
   ↓
store / index


                ONLINE
query
  ↓
query encoder
  ↓
query vector
  ↓
search index
  ↓
top-k documents
```

The document side can be precomputed.

That is what makes bi-encoder retrieval practical.

---

# Part II — Bi-encoders and DPR

## 10–22 min

A bi-encoder uses independent representations for query and passage:

\[
\vec{q}=E_q(q)
\]

\[
\vec{p}=E_p(p)
\]

Then:

\[
score(q,p)
=
\vec{q}^{\top}\vec{p}
\]

or another vector similarity.

---

# Dense Passage Retrieval

Dense Passage Retrieval (DPR) is an influential example.

Its core idea is simple:

```text
question
   ↓
question encoder
   ↓
question vector

passage
   ↓
passage encoder
   ↓
passage vector
```

Relevant question–passage pairs should receive higher similarity than irrelevant pairs.

---

# Why passages?

Suppose we have:

```text
50-page report
```

and only one paragraph answers the query.

One vector for the whole document must compress many topics.

Instead:

```text
document
  ↓
passages
  ↓
one vector per passage
```

gives finer retrieval granularity.

This will matter again in RAG.

---

# Training intuition

A dense retriever often sees:

```text
query
positive passage
negative passage
```

The objective encourages:

\[
score(q,p^+)
>
score(q,p^-)
\]

---

# Hard negatives

Example query:

```text
symptoms of influenza
```

Positive:

```text
influenza often causes fever, cough, and fatigue
```

Easy negative:

```text
medieval architecture in Europe
```

Hard negative:

```text
the common cold often causes cough and fatigue
```

Hard negatives are useful because they force the model to learn finer distinctions.

---

# Part III — Similarity functions

## 22–27 min

Common choices:

```text
cosine similarity
dot product
Euclidean distance
```

---

# Cosine similarity

\[
\cos(q,d)
=
\frac{q\cdot d}
{\|q\|\|d\|}
\]

If vectors are unit-normalized:

\[
q^\top d
=
\cos(q,d)
\]

This lets us use fast inner-product search while preserving cosine ranking.

---

# Match the model's training setup

Do not arbitrarily choose a metric.

A retrieval model may have been trained for:

```text
dot product
cosine similarity
```

The search metric should match the representation model's intended use.

---

# Part IV — Exact nearest-neighbor search

## 27–40 min

For a small collection, retrieval can be brute-force.

```python
scores = doc_embeddings @ query_embedding
top = scores.argsort()[::-1][:10]
```

Every vector is considered.

This is exact search.

---

# Why exact?

Because every candidate is scored.

Ignoring numerical precision, the true top vectors cannot be missed by the search procedure.

---

# Complexity intuition

For:

```text
N document vectors
d dimensions
```

brute-force work grows roughly as:

\[
O(Nd)
\]

So doubling the collection roughly doubles the amount of vector comparison work.

---

# Small collection

```text
N = 1,400
```

Cranfield is trivial.

---

# Large collection

```text
N = 100,000,000
```

Repeatedly scanning the entire vector collection becomes expensive.

Problems include:

```text
latency
throughput
memory bandwidth
compute cost
```

---

# Memory calculation

Suppose:

```text
1,000,000 vectors
384 dimensions
float32
```

Each float32 uses 4 bytes.

Approximate raw vector memory:

\[
1,000,000
\times
384
\times
4
\approx
1.5\text{ GB}
\]

At 100 million vectors, raw storage becomes a major systems concern.

---

# First-half recap

## 40–45 min

Put this on the board:

```text
good encoder
   ↓
good vectors

but

many vectors
   ↓
brute-force search expensive
   ↓
need vector index
```

Then ask:

> Do we always need the mathematically exact nearest neighbors?

Often, no.

That leads to approximate nearest-neighbor search.

---

# Part V — Approximate nearest neighbors

## 45–58 min

Approximate nearest-neighbor search tries to find very close vectors without scanning the whole collection.

The trade-off is explicit:

```text
faster search
in exchange for
possible missed true neighbors
```

---

# Exact vs approximate

```text
Exact:
consider every vector
→ maximum search accuracy
→ higher cost

Approximate:
consider only promising parts of the index
→ much faster
→ may miss some exact neighbors
```

---

# Two broad ideas

Many ANN methods can be understood through two high-level families.

## Partition-based

Divide vector space into regions.

```text
query
 ↓
identify promising regions
 ↓
search vectors in those regions
```

## Graph-based

Connect nearby vectors in a graph.

```text
start somewhere
 ↓
move to better neighbor
 ↓
move to better neighbor
 ↓
arrive near query
```

HNSW is a well-known graph-based approach.

No algorithmic derivation is needed in this seminar.

---

# Do not confuse two kinds of recall

## IR Recall@k

From Lab 05:

\[
Recall@k
=
\frac{\text{relevant items retrieved}}
{\text{all relevant items}}
\]

This measures usefulness relative to relevance judgments.

---

## ANN recall

ANN recall asks:

> Did approximate search recover the same nearest neighbors as exact vector search?

Example:

```text
exact top-10:
A B C D E F G H I J

ANN top-10:
A B C D E F G H X Y
```

Overlap:

```text
8 / 10
```

ANN recall@10:

\[
0.8
\]

These are different metrics.

---

# Two different failure sources

A dense system can fail because:

```text
representation failure:
relevant item has a poor embedding score
```

or:

```text
index failure:
relevant high-scoring vector exists,
but ANN search misses it
```

This distinction is important for debugging.

---

# Part VI — FAISS

## 58–70 min

FAISS is a library for efficient dense-vector similarity search.

It supports both:

```text
exact search
approximate search
```

FAISS does not automatically imply approximation.

---

# Exact flat index

For normalized vectors and inner product:

```python
import faiss
import numpy as np

vectors = np.asarray(
    doc_embeddings,
    dtype="float32"
)

d = vectors.shape[1]

index = faiss.IndexFlatIP(d)
index.add(vectors)
```

Search:

```python
scores, ids = index.search(
    query_vector,
    10
)
```

`IndexFlatIP` still checks every vector.

It is exact.

---

# IVF intuition

An inverted-file-style vector index partitions vectors into coarse regions.

Conceptually:

```text
all vectors
   ↓
coarse clusters
   ↓
query searches only selected clusters
```

---

# Example

```python
nlist = 32

quantizer = faiss.IndexFlatIP(d)

ivf = faiss.IndexIVFFlat(
    quantizer,
    d,
    nlist,
    faiss.METRIC_INNER_PRODUCT
)

ivf.train(vectors)
ivf.add(vectors)

ivf.nprobe = 4
```

Then:

```python
scores, ids = ivf.search(
    query_vector,
    10
)
```

---

# Meaning of the parameters

```text
nlist
→ number of coarse partitions

nprobe
→ number of partitions searched per query
```

More `nprobe` usually means:

```text
higher ANN recall
higher query cost
```

---

# Index training is not model training

This distinction matters.

```text
training the encoder
→ learns text representations

training an IVF index
→ learns a partitioning of the vector collection
```

They solve different problems.

---


# Part VII — What is a vector database?

A vector index and a vector database are related, but they are not the same thing.

This distinction is important.

---

# Vector index

A **vector index** is primarily a data structure for efficient similarity search.

It answers:

> Given this query vector, which stored vectors are nearest?

Examples of index ideas include:

```text
flat exact search
IVF
HNSW
product quantization
```

A library such as FAISS provides vector-indexing and similarity-search algorithms.

---

# Vector database

A **vector database** wraps vector search inside a broader data-management system.

Conceptually, it stores:

```text
ID
embedding vector
metadata
original text or pointer to text
```

Example record:

```python
{
    "id": "chunk_0042",
    "vector": [0.12, -0.31, ...],
    "text": "The master's thesis is worth 30 ECTS credits.",
    "metadata": {
        "document": "programme_rules.pdf",
        "page": 14,
        "section": "Thesis"
    }
}
```

The database can then support:

```text
similarity search
metadata filtering
persistence
updates
deletion
index management
distributed storage
```

---

# Why metadata matters

Suppose the query is:

```text
What is the vacation policy?
```

but the collection contains:

```text
HR documents
engineering manuals
legal contracts
student regulations
```

We may want:

```text
semantic similarity
+
metadata filter
```

For example:

```text
department = "HR"
year = 2026
document_type = "policy"
```

So retrieval can become:

\[
\text{similarity}(q,d)
\quad \text{subject to metadata constraints}
\]

This is extremely common in practical RAG systems.

---

# Vector database vs relational database

A relational database is designed around operations such as:

```text
exact equality
ranges
joins
structured fields
```

A vector database adds support for:

```text
nearest-neighbor search in high-dimensional space
```

It does not necessarily replace relational storage.

Many real systems use both.

---

# Vector database vs FAISS

A useful distinction for students:

```text
FAISS
→ similarity-search library / vector-index toolkit

Vector database
→ persistent data system that may use ANN indexes internally
```

A vector database often provides:

```text
storage
metadata
filtering
APIs
index lifecycle
replication / sharding
```

in addition to nearest-neighbor search.

---

# Semantic search with a vector database

The end-to-end flow is:

```text
documents
   ↓
encoder
   ↓
embeddings
   ↓
vector database

query
   ↓
encoder
   ↓
query embedding
   ↓
similarity search
   ↓
nearest chunks
```

If metadata filters are used:

```text
query embedding
      +
metadata conditions
      ↓
filtered semantic search
```

---

# What the vector database does NOT do

A vector database does not create semantic meaning by itself.

It does not replace the embedding model.

Bad embeddings stored in an excellent vector database are still bad embeddings.

Keep the layers separate:

```text
encoder
→ representation quality

vector index/database
→ storage + retrieval efficiency

reranker
→ final ordering quality
```

---

# Common vector-database operations

Students should recognize these operations conceptually:

```text
insert / upsert vectors
search nearest neighbors
filter by metadata
delete stale vectors
update embeddings
persist index
partition or shard collection
```

These are the practical operations that make a vector database useful in production.

---

# When do we actually need one?

For a teaching dataset such as Cranfield:

```text
NumPy + FAISS
```

is enough.

A vector database becomes more useful when we need:

```text
persistent collections
frequent updates
metadata filters
multiple users
large-scale serving
operational APIs
distributed storage
```

Do not introduce one merely because RAG tutorials use one.

The underlying retrieval concepts come first.

---

# Part VIII — Live exact-vs-ANN demo

## 70–80 min

Reuse Cranfield document embeddings.

Cranfield is small enough that ANN is unnecessary.

That is pedagogically useful because exact search can act as the reference.

---

# Exact index

```python
flat = faiss.IndexFlatIP(d)
flat.add(vectors)
```

Encode several queries:

```python
query_vectors = model.encode(
    [q.text for q in queries[:20]],
    normalize_embeddings=True
).astype("float32")
```

Exact search:

```python
exact_scores, exact_ids = flat.search(
    query_vectors,
    10
)
```

---

# Approximate index

```python
nlist = 32

quantizer = faiss.IndexFlatIP(d)

ivf = faiss.IndexIVFFlat(
    quantizer,
    d,
    nlist,
    faiss.METRIC_INNER_PRODUCT
)

ivf.train(vectors)
ivf.add(vectors)

ivf.nprobe = 2
```

Search:

```python
ann_scores, ann_ids = ivf.search(
    query_vectors,
    10
)
```

---

# ANN recall@10

```python
def ann_recall_at_k(
    exact_ids,
    approx_ids,
    k=10
):
    values = []

    for exact, approx in zip(
        exact_ids,
        approx_ids
    ):
        a = set(exact[:k])
        b = set(approx[:k])

        values.append(
            len(a & b) / k
        )

    return sum(values) / len(values)
```

---

# Vary nprobe

Try:

```text
1
2
4
8
16
```

Measure:

```text
ANN recall@10
query time
```

The important pattern is typically:

```text
nprobe ↑
→ more search work
→ ANN recall ↑
→ latency ↑
```

Exact numbers depend on the data and hardware.

---

# Part IX — Three levels of quality

## 80–86 min

Students should distinguish:

### 1. Representation quality

Are relevant documents close to the query in embedding space?

Evaluate with relevance judgments:

```text
Recall@k
MRR
MAP
nDCG
```

### 2. Index quality

Does ANN recover what exact vector search would have returned?

Evaluate with:

```text
ANN recall@k
```

### 3. Systems quality

How expensive is retrieval?

Measure:

```text
latency
queries per second
memory
index size
build time
```

---

# Diagnostic table

| Symptom | Likely layer |
|---|---|
| Exact dense search has poor nDCG | representation / retriever |
| Exact dense search good, ANN worse | vector index |
| Quality good, latency too high | systems / index settings |
| Retrieval good, final answer bad | downstream RAG/generation |

---

# Part X — Bridge to Lab 10

## 86–90 min

Students now have two candidate generators:

```text
BM25
```

and:

```text
dense retrieval
```

Their strengths differ.

That motivates:

```text
BM25
   +
dense retrieval
   ↓
fusion
   ↓
reranking
```

Lab 10 will focus on:

```text
hybrid retrieval
Reciprocal Rank Fusion
cross-encoder reranking
multi-stage retrieval
```

---

# Five points students should remember

1. A dense retriever has both a representation model and a search/index layer.
2. Bi-encoders make retrieval efficient because document vectors can be precomputed.
3. Exact search evaluates every vector; ANN avoids much of that work.
4. ANN recall and IR Recall@k measure different things.
5. A vector database adds persistence, metadata, filtering, and operational data management around vector search.
6. Vector-index design affects latency and can affect which evidence reaches later RAG stages.

---

# Optional after-class exercise

Using Cranfield embeddings:

1. build an exact `IndexFlatIP`;
2. build an `IndexIVFFlat`;
3. vary `nprobe`;
4. measure ANN recall@10;
5. measure mean query latency;
6. evaluate retrieved documents with nDCG@10.

Compare:

```text
vector-search fidelity
```

with:

```text
user-facing IR quality
```

They are related, but not identical.

---

# Suggested dependencies

```bash
pip install sentence-transformers ir_datasets numpy faiss-cpu
```

---

# Suggested reading

## Dense Passage Retrieval

Vladimir Karpukhin et al.  
*Dense Passage Retrieval for Open-Domain Question Answering.*

- https://arxiv.org/abs/2004.04906

## FAISS

- https://faiss.ai/

---

# Course progression

```text
Lab 08
where neural embeddings come from
      ↓
Lab 09
dense retrieval + vector search
      ↓
Lab 10
hybrid retrieval + reranking
      ↓
Lab 11
RAG
```

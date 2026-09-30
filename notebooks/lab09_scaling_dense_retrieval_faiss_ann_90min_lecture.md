# Lab 09 — Scaling Dense Retrieval: Vector Indexes, ANN, FAISS, and DPR

> **Format:** 90-minute lecturer-led seminar  
> **Structure:** 2 × 45 minutes  
> **Audience:** Master's students in Information Retrieval  
> **Style:** explanation + worked examples + short live demos  
> **Main themes:** dense passage retrieval, exact nearest-neighbor search, approximate nearest neighbors, FAISS, recall–latency trade-offs  
> **Dataset for demos:** Cranfield  
> **Prerequisite:** Lab 08 — Embeddings, Semantic Search, and Dense Retrieval

---

## Seminar goal

In Lab 08, dense retrieval looked simple:

```text
encode documents
      ↓
store vectors

encode query
      ↓
compare against every document vector
      ↓
return nearest documents
```

That works perfectly well for:

```text
1,400 documents
```

But what happens with:

```text
1 million documents?
100 million documents?
1 billion passages?
```

The retrieval problem changes.

The embedding model is only one part of a dense retrieval system. We also need an efficient way to search the vector collection.

The central progression in this seminar is:

```text
dense embeddings
      ↓
exact nearest-neighbor search
      ↓
scaling problem
      ↓
vector indexes
      ↓
approximate nearest-neighbor search
      ↓
latency / memory / recall trade-offs
```

---

# Learning objectives

By the end of the seminar, students should be able to explain:

- what dense passage retrieval is;
- the difference between embedding generation and vector search;
- why brute-force dense retrieval does not scale indefinitely;
- what exact nearest-neighbor search means;
- what approximate nearest-neighbor search means;
- why ANN deliberately trades exactness for speed;
- the difference between IR relevance recall and ANN recall;
- the basic role of FAISS;
- the difference between a flat index and an approximate index;
- the intuition behind partitioning- and graph-based ANN methods;
- how indexing choices affect latency, memory, and retrieval quality;
- how vector indexes fit into a RAG pipeline.

---

# Session plan

## First 45 minutes

| Time | Topic |
|---|---|
| 0–10 min | Recap: dense retrieval architecture |
| 10–22 min | Dense Passage Retrieval and bi-encoders |
| 22–32 min | Exact nearest-neighbor search |
| 32–40 min | Why brute force becomes expensive |
| 40–45 min | First-half recap |

## Second 45 minutes

| Time | Topic |
|---|---|
| 45–58 min | Approximate nearest-neighbor search |
| 58–70 min | FAISS: flat and approximate indexes |
| 70–80 min | Live exact-vs-ANN demo |
| 80–86 min | Recall–latency–memory trade-offs |
| 86–90 min | Connection to hybrid retrieval and RAG |

---

# Part I — Recap: what a dense retriever actually contains

## 0–10 min

From Lab 08:

```text
documents
   ↓
encoder
   ↓
document embeddings
   ↓
vector collection

query
   ↓
encoder
   ↓
query embedding
   ↓
similarity search
   ↓
top-k documents
```

There are two separate problems:

```text
1. Representation
   How do we map text to vectors?

2. Search
   How do we efficiently find the nearest vectors?
```

Students often mix these together. Do not.

---

# Representation vs indexing

For example:

```text
SentenceTransformer
DPR encoder
E5
BGE
```

are representation models.

Whereas:

```text
FAISS
HNSW
vector database indexes
```

are search/indexing technologies.

A better embedding model does not automatically make nearest-neighbor search faster.

A better index does not automatically make the embeddings semantically better.

---

# Small-scale dense retrieval

Suppose:

```text
N = 1,400 documents
d = 384 dimensions
```

For one query, brute force computes roughly one similarity per document.

That is trivial.

---

# Large-scale dense retrieval

Suppose:

```text
N = 100,000,000 documents
d = 768 dimensions
```

Comparing the query with every vector becomes much more expensive.

This motivates specialized indexing.

---

# Part II — Dense Passage Retrieval

## 10–22 min

Before discussing indexes, introduce one influential dense-retrieval architecture.

**Dense Passage Retrieval (DPR)** uses separate encoders for questions and passages.

Conceptually:

```text
question
   ↓
question encoder
   ↓
q

passage
   ↓
passage encoder
   ↓
p
```

Then:

\[
score(q,p)=q^\top p
\]

or a related similarity function.

---

# Why passage retrieval?

Long documents are often broken into smaller passages.

Why?

Because a long document may contain:

```text
many topics
many sections
only one relevant paragraph
```

A single vector for the entire document can blur the relevant information.

So modern retrieval often indexes:

```text
passages
chunks
sections
```

instead of whole documents.

This will become critical for RAG.

---

# Passage example

Document:

```text
20-page technical report
```

Relevant answer:

```text
one paragraph on page 14
```

If we embed the entire report:

```text
one vector must summarize everything
```

If we embed passages:

```text
the relevant paragraph can have its own vector
```

This usually provides finer retrieval granularity.

---

# Dense retriever training intuition

A dense retriever is often trained using:

```text
query
positive passage
negative passage
```

The model should make:

\[
score(q,p^+) > score(q,p^-)
\]

where:

- \(p^+\) is relevant;
- \(p^-\) is non-relevant.

The training objective pushes relevant query-passage pairs closer together.

---

# Negative examples matter

Suppose the query is:

```text
symptoms of influenza
```

Positive:

```text
influenza commonly causes fever, cough, and fatigue
```

Easy negative:

```text
history of medieval architecture
```

Hard negative:

```text
common symptoms of the common cold include coughing and fatigue
```

The hard negative is much more informative.

This is why **negative mining** matters in dense retrieval.

Do not derive the training loss in detail in this introductory seminar.

---

# Part III — Exact nearest-neighbor search

## 22–32 min

Once the vectors exist, we need:

\[
\operatorname{top-k}_{d \in D} sim(q,d)
\]

The most straightforward approach is exhaustive search.

---

# Brute-force search

For normalized vectors:

```python
scores = doc_embeddings @ query_embedding

top_k = scores.argsort()[::-1][:k]
```

This compares the query against every document.

That is **exact nearest-neighbor search**.

---

# Why is it exact?

Because every document is considered.

If the highest-scoring document exists in the collection, brute force will find it.

Ignoring numerical issues, there is no approximation in the search layer.

---

# Exact search complexity intuition

If we have:

```text
N vectors
d dimensions
```

a brute-force query requires work proportional to roughly:

\[
O(Nd)
\]

Students do not need low-level hardware analysis.

The important point is:

```text
cost grows linearly with collection size
```

---

# Memory cost

Dense vectors also require storage.

Suppose:

```text
100 million vectors
768 dimensions
float32
```

Each float32 uses 4 bytes.

Approximate vector memory:

\[
100,000,000 \times 768 \times 4
\]

bytes.

That is hundreds of gigabytes before adding index overhead.

This is why dense retrieval involves both:

```text
search complexity
+
memory complexity
```

---

# Quick board calculation

Use a simpler example.

```text
1 million vectors
384 dimensions
float32
```

Approximate vector memory:

\[
1,000,000 \times 384 \times 4
\]

which is roughly 1.5 GB.

The goal is not perfect unit conversion.

The goal is to show that vector storage becomes a systems issue.

---

# Part IV — Why brute force becomes a problem

## 32–40 min

Imagine a service handling:

```text
10 queries per second
```

and:

```text
100 million passage vectors
```

Brute force now means repeatedly comparing each query against the whole collection.

Possible problems:

```text
high latency
high compute cost
large memory bandwidth
poor throughput
```

This motivates indexing.

---

# The search-engine analogy

Classical lexical retrieval does not scan every document either.

Instead, we build:

```text
inverted index
```

Dense retrieval also needs data structures that avoid unnecessary comparisons.

The index is different because the objects are continuous vectors rather than discrete terms.

---

# First-half recap

## 40–45 min

Put this on the board:

```text
embedding model
      ↓
good representation

but

100M vectors
      ↓
brute force expensive
      ↓
need vector index
```

Then ask:

> Must we always find the mathematically exact nearest neighbors?

For many applications:

```text
not necessarily
```

If we can retrieve almost the same neighbors much faster, the trade-off may be worthwhile.

That leads to ANN.

---

# Part V — Approximate nearest-neighbor search

## 45–58 min

**Approximate nearest-neighbor search** means:

> Find vectors that are very likely to be among the nearest neighbors without exhaustively comparing against every vector.

The keyword is:

```text
approximate
```

The index may occasionally miss a true nearest neighbor.

In exchange, retrieval can become much faster.

---

# The basic trade-off

```text
exact search:
high search accuracy
higher cost

approximate search:
slightly lower search accuracy
much lower cost
```

The appropriate balance depends on the application.

---

# Do not confuse two kinds of recall

This distinction is important.

## IR recall

From Lab 05:

\[
Recall@k =
\frac{\text{relevant documents retrieved}}{\text{relevant documents}}
\]

This measures relevance to the user.

---

## ANN recall

ANN recall measures whether the approximate index reproduces the neighbors found by exact vector search.

For example:

```text
exact top-10:
A B C D E F G H I J

ANN top-10:
A B C D E F G H X Y
```

Then 8 of the exact top-10 were recovered.

ANN recall@10:

\[
\frac{8}{10}=0.8
\]

This does **not** directly tell us whether those documents are relevant to the user's information need.

---

# Two independent failure sources

A dense system can fail because:

```text
embedding failure:
relevant document has a bad vector score
```

or:

```text
index failure:
relevant high-scoring vector exists,
but ANN search fails to retrieve it
```

This separation is extremely useful for debugging.

---

# Two broad ANN ideas

At a conceptual level, many ANN methods can be understood as using structures that avoid examining all vectors.

Two common families are:

```text
1. partition-based methods
2. graph-based methods
```

---

# Partition-based intuition

Imagine dividing vector space into regions.

For a query:

```text
search only the most promising regions
```

instead of every vector.

This is the intuition behind inverted-file-style vector indexes.

---

# Graph-based intuition

Imagine each vector connected to nearby vectors.

Search begins somewhere in the graph and moves toward increasingly similar nodes.

Conceptually:

```text
start
  ↓
better neighbor
  ↓
better neighbor
  ↓
near query
```

This is the intuition behind graph-based methods such as HNSW.

Do not derive HNSW in this seminar.

---

# Part VI — FAISS

## 58–70 min

FAISS is a library for efficient similarity search over dense vectors.

It supports several index types.

For this seminar, students only need to understand the contrast:

```text
flat exact index
vs
approximate index
```

---

# Exact search with FAISS

Suppose embeddings are normalized and we want inner-product search.

```python
import faiss
import numpy as np

vectors = np.asarray(
    doc_embeddings,
    dtype="float32"
)

dimension = vectors.shape[1]

index = faiss.IndexFlatIP(
    dimension
)

index.add(vectors)
```

This creates an exact flat index.

---

# Search

```python
query_vector = model.encode(
    [query],
    normalize_embeddings=True
).astype("float32")

scores, ids = index.search(
    query_vector,
    10
)
```

The result gives:

```text
scores
document-vector positions
```

---

# Important point

`IndexFlatIP` is still exhaustive.

FAISS does not automatically mean:

```text
approximate search
```

FAISS can perform both exact and approximate search.

That distinction matters.

---

# Approximate index example: IVF

Conceptually, an IVF index partitions vectors into coarse clusters.

At query time:

```text
query
   ↓
find promising clusters
   ↓
search vectors only inside some clusters
```

The key parameter is often how many regions are searched.

Search more regions:

```text
higher recall
higher latency
```

Search fewer:

```text
lower latency
potentially lower recall
```

---

# Conceptual IVF code

```python
dimension = vectors.shape[1]

nlist = 100

quantizer = faiss.IndexFlatIP(
    dimension
)

ivf = faiss.IndexIVFFlat(
    quantizer,
    dimension,
    nlist,
    faiss.METRIC_INNER_PRODUCT
)

ivf.train(vectors)
ivf.add(vectors)

ivf.nprobe = 10
```

Then:

```python
scores, ids = ivf.search(
    query_vector,
    10
)
```

Do not make students memorize the API.

Explain:

```text
nlist
→ number of coarse regions

nprobe
→ how many regions are searched
```

---

# Why training?

Some vector indexes need a training step to learn their partitioning structure.

This is different from training the embedding model.

Again, keep the layers separate:

```text
embedding-model training
≠
vector-index training
```

---

# HNSW at a high level

Another popular approach uses a navigable proximity graph.

Conceptually:

```text
vectors become graph nodes
nearby vectors become connected
search traverses the graph
```

HNSW can provide strong speed/recall trade-offs and is widely used in vector-search systems.

For this seminar, students only need the architectural intuition.

---

# Part VII — Live exact-vs-ANN demo

## 70–80 min

Reuse the Cranfield embeddings from Lab 08.

Because Cranfield is small, ANN is unnecessary.

That is precisely why it is useful pedagogically:

```text
we can compute exact neighbors
and treat them as ground truth for the search layer
```

---

# Exact FAISS search

```python
import faiss
import numpy as np

vectors = np.asarray(
    doc_embeddings,
    dtype="float32"
)

d = vectors.shape[1]

flat = faiss.IndexFlatIP(d)
flat.add(vectors)
```

Search several query vectors:

```python
query_vectors = model.encode(
    [q.text for q in queries[:20]],
    normalize_embeddings=True
).astype("float32")

exact_scores, exact_ids = flat.search(
    query_vectors,
    10
)
```

---

# Build an approximate IVF index

For a small teaching example:

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

Then:

```python
ann_scores, ann_ids = ivf.search(
    query_vectors,
    10
)
```

---

# Measure ANN recall@10

```python
def ann_recall_at_k(
    exact_ids,
    approx_ids,
    k=10
):
    recalls = []

    for exact, approx in zip(
        exact_ids,
        approx_ids
    ):
        exact_set = set(exact[:k])
        approx_set = set(approx[:k])

        recalls.append(
            len(exact_set & approx_set) / k
        )

    return sum(recalls) / len(recalls)
```

Then:

```python
print(
    ann_recall_at_k(
        exact_ids,
        ann_ids,
        k=10
    )
)
```

---

# Change nprobe

Try:

```text
nprobe = 1
nprobe = 2
nprobe = 4
nprobe = 8
nprobe = 16
```

For each value measure:

```text
ANN recall@10
query time
```

This produces the central systems trade-off of the seminar.

---

# Expected pattern

As `nprobe` increases:

```text
searches more clusters
      ↓
higher chance of recovering exact neighbors
      ↓
higher ANN recall
      ↓
more computation
```

Typically:

```text
recall ↑
latency ↑
```

The exact numbers depend on data and hardware.

---

# Part VIII — Three different notions of quality

## 80–86 min

At this point students should distinguish three layers.

---

## 1. Embedding quality

Does the representation rank semantically relevant documents highly?

Measure using:

```text
nDCG
MRR
Recall@k
MAP
```

against relevance judgments.

---

## 2. ANN quality

Does the approximate index recover the neighbors that exact vector search would return?

Measure with:

```text
ANN recall@k
```

relative to exact search.

---

## 3. Systems quality

How expensive is retrieval?

Measure things such as:

```text
latency
queries per second
memory
index size
build time
```

These are related but distinct.

---

# A useful diagnosis table

| Symptom | Possible cause |
|---|---|
| Exact dense search has poor nDCG | embedding/retrieval model problem |
| Exact dense search is good but ANN is worse | vector-index problem |
| Retrieval quality is good but too slow | systems/index configuration problem |
| Good dense retrieval but weak final answer | downstream RAG/generation problem |

This decomposition is extremely useful later.

---

# Recall–latency–memory trade-off

A retrieval system rarely optimizes one variable in isolation.

Examples:

```text
more probes
→ higher recall
→ higher latency

more graph edges
→ potentially better search
→ more memory

compressed vectors
→ lower memory
→ possible quality loss
```

The engineering question is not:

> Which index is best?

It is:

> Which operating point satisfies our quality and resource requirements?

---

# Part IX — Connection to hybrid retrieval and RAG

## 86–90 min

Dense retrieval now has a complete architecture:

```text
documents
   ↓
chunk
   ↓
embed
   ↓
vector index
   ↓
ANN search
   ↓
top-k candidates
```

But Lab 08 already showed that dense retrieval has weaknesses.

BM25 has different weaknesses.

This suggests the next step:

```text
BM25
   +
dense retrieval
   ↓
combine candidates
   ↓
rerank
```

That is the basis of hybrid retrieval.

---

# RAG connection

A practical RAG retriever might look like:

```text
user question
     ↓
query embedding
     ↓
ANN vector search
     ↓
top 50 candidates
     ↓
reranking
     ↓
top 5 chunks
     ↓
LLM
```

The vector index is therefore not merely an implementation detail.

It directly affects what evidence the LLM can access.

---

# Final summary

End with this progression:

```text
Lab 08
embeddings
   ↓
dense similarity

Lab 09
scale dense similarity
   ↓
exact search
   ↓
ANN
   ↓
vector indexes
   ↓
FAISS
   ↓
recall / latency / memory trade-offs

Lab 10
combine lexical + dense retrieval
and rerank candidates
```

---

# Five points students should remember

1. The embedding model and the vector index solve different problems.
2. Exact dense search compares against every vector; ANN avoids many comparisons.
3. ANN deliberately trades some search accuracy for speed.
4. ANN recall is not the same as IR Recall@k.
5. Large-scale RAG depends on both good embeddings and good vector-search infrastructure.

---

# Optional after-class exercise

Using Cranfield embeddings:

1. Build an exact `IndexFlatIP`.
2. Build an `IndexIVFFlat`.
3. Search the same 20 queries with both.
4. Test:

```text
nprobe = 1
2
4
8
16
```

5. Record:

| nprobe | ANN Recall@10 | Mean query time |
|---:|---:|---:|
| 1 | ... | ... |
| 2 | ... | ... |
| 4 | ... | ... |
| 8 | ... | ... |
| 16 | ... | ... |

6. Plot:

```text
x-axis:
mean query time

y-axis:
ANN Recall@10
```

Explain the trade-off.

---

# Optional retrieval-quality experiment

Do not stop at ANN recall.

For each ANN configuration, evaluate the retrieved Cranfield documents using the Lab 05 relevance metrics:

```text
Recall@10
MRR
MAP
nDCG@10
```

Then compare:

```text
ANN recall
```

with:

```text
IR effectiveness
```

Questions:

1. Does lower ANN recall always reduce nDCG?
2. Can ANN miss an exact neighbor without changing the relevance metric?
3. Why?

This demonstrates that:

```text
nearest in vector space
```

and:

```text
relevant to the user
```

are not identical concepts.

---

# Optional scaling calculation

Estimate raw vector storage for:

```text
1 million
10 million
100 million
```

vectors under:

```text
384 dimensions
768 dimensions
```

assuming float32.

Use:

\[
memory = N \times d \times 4
\]

bytes.

Then discuss why production systems may use:

```text
float16
quantization
compressed indexes
sharding
```

Do not implement these yet.

---

# Suggested dependencies

```bash
pip install sentence-transformers ir_datasets numpy faiss-cpu
```

If FAISS installation is problematic on a student's platform, the conceptual material remains the priority.

For the lecture, run the demo beforehand and keep saved output available as a fallback.

---

# Suggested reading

## Dense Passage Retrieval

Vladimir Karpukhin et al.  
*Dense Passage Retrieval for Open-Domain Question Answering.*

Core idea:

```text
independently encode question and passage
then retrieve by vector similarity
```

Paper:

- https://arxiv.org/abs/2004.04906

---

## FAISS

FAISS documentation and repository:

- https://faiss.ai/
- https://github.com/facebookresearch/faiss

---

## Dataset

Cranfield:

- https://ir-datasets.com/cranfield.html

---

# Bridge to Lab 10

Students now understand two candidate-generation systems:

```text
lexical:
BM25

dense:
embedding + ANN
```

Neither is universally superior.

The natural next question is:

> Can we combine them and then use a more expensive model only on the best candidates?

That leads to:

```text
hybrid retrieval
reciprocal rank fusion
cross-encoder reranking
multi-stage retrieval
```

which is the focus of Lab 10.

# Lab 08 — Embeddings, Semantic Search, and Dense Retrieval

> **Format:** 90-minute lecturer-led seminar  
> **Structure:** 2 × 45 minutes  
> **Audience:** Master's students in Information Retrieval  
> **Style:** explanation + worked examples + short live demos  
> **Main themes:** embeddings, semantic similarity, bi-encoders, dense retrieval, cosine similarity, nearest-neighbor search  
> **Dataset for demos:** Cranfield  
> **Suggested model family for demo:** Sentence Transformers

---

## Seminar goal

In Lab 07, we discussed a major weakness of lexical retrieval:

```text
query:
car repair

document:
automobile maintenance
```

The terms are different, even though the meanings are close.

Classical IR addresses this with techniques such as:

```text
query expansion
relevance feedback
language-model retrieval
```

Dense retrieval takes a different approach.

Instead of relying mainly on exact words, we represent queries and documents as vectors in a learned semantic space.

The central idea is:

```text
similar meaning
      ↓
nearby vectors
      ↓
high similarity
      ↓
high retrieval score
```

This seminar introduces the conceptual foundation of modern semantic retrieval.

---

# Learning objectives

By the end of the seminar, students should be able to explain:

- what an embedding is;
- how sparse and dense representations differ;
- why semantic retrieval can reduce vocabulary mismatch;
- the role of encoder models in retrieval;
- what a bi-encoder is;
- how query and document embeddings are scored;
- the difference between cosine similarity and dot product;
- how dense retrieval works end to end;
- why dense retrieval does not automatically replace BM25;
- what nearest-neighbor search is;
- why approximate nearest-neighbor search becomes necessary at scale;
- how dense retrieval connects directly to RAG.

---

# Session plan

## First 45 minutes

| Time | Topic |
|---|---|
| 0–10 min | From lexical matching to semantic representations |
| 10–20 min | What embeddings are |
| 20–32 min | Bi-encoders and dense retrieval |
| 32–40 min | Similarity functions |
| 40–45 min | First-half recap |

## Second 45 minutes

| Time | Topic |
|---|---|
| 45–60 min | Live embedding demo |
| 60–72 min | Dense retrieval on Cranfield |
| 72–82 min | Dense vs BM25 |
| 82–87 min | Nearest-neighbor search and ANN |
| 87–90 min | RAG connection and summary |

---

# Part I — From lexical retrieval to semantic retrieval

## 0–10 min

Start with two examples.

### Example 1

```text
Query:
car repair

Document:
automobile maintenance
```

### Example 2

```text
Query:
heart attack treatment

Document:
therapy for myocardial infarction
```

A lexical system sees limited overlap.

A human sees semantic similarity.

The question becomes:

> Can we represent text in a way that places semantically related texts close together?

That is the motivation for embeddings.

---

# Sparse representations

TF-IDF represents documents as vectors over vocabulary terms.

If the vocabulary has 50,000 terms:

```text
document vector:
[0, 0, 0.3, 0, ..., 1.2, ..., 0]
```

Most dimensions are zero.

This is a **sparse representation**.

Each dimension corresponds to a term.

---

# Dense representations

An embedding may look like:

```text
[0.12, -0.43, 0.08, 0.71, ...]
```

Most dimensions are non-zero.

This is a **dense representation**.

The dimensions do not correspond directly to human-readable terms.

Instead, they are learned features.

---

# Sparse vs dense

| Sparse retrieval | Dense retrieval |
|---|---|
| dimensions correspond to vocabulary terms | dimensions are learned |
| high-dimensional | lower-dimensional |
| mostly zeros | mostly non-zero |
| strong lexical matching | semantic matching |
| interpretable term weights | less directly interpretable |
| BM25 / TF-IDF | embedding retrieval |

This distinction is central.

---

# Part II — What is an embedding?

## 10–20 min

An embedding is a vector representation:

\[
E(x) \in \mathbb{R}^d
\]

where:

- \(x\) may be a word, sentence, query, passage, or document;
- \(d\) is the embedding dimension.

For example:

\[
E(\text{"car repair"})
=
[0.14, -0.31, \ldots, 0.62]
\]

The goal is that semantically related text obtains similar vectors.

---

# Conceptual geometric intuition

Suppose:

```text
car repair
automobile maintenance
car engine service
```

receive embeddings close together.

Whereas:

```text
banana nutrition
medieval history
```

appear elsewhere in the space.

Then retrieval becomes a geometric search problem.

---

# Important clarification

Embeddings are not:

```text
a dictionary of synonyms
```

They encode distributed statistical information learned from data.

The model may capture:

```text
semantic similarity
paraphrase similarity
topic similarity
syntactic patterns
domain-specific associations
```

depending on how it was trained.

---

# A simple analogy

Lexical retrieval asks:

> Do the same words occur?

Dense retrieval asks:

> Are these texts represented nearby in the learned vector space?

That is a simplification, but it is useful.

---

# Part III — From embeddings to retrieval

## 20–32 min

A dense retriever needs two basic functions:

```text
encode query
encode document
```

We can write:

\[
\vec{q} = E_q(q)
\]

\[
\vec{d} = E_d(d)
\]

Then compute:

\[
score(q,d)
=
sim(\vec{q},\vec{d})
\]

---

# Bi-encoder architecture

A common retrieval architecture is the **bi-encoder**.

Conceptually:

```text
query
  ↓
query encoder
  ↓
query vector
       \
        similarity
       /
document vector
  ↑
document encoder
  ↑
document
```

The query and document are encoded separately.

That is the key efficiency advantage.

---

# Why separate encoding matters

Documents can be encoded in advance:

```text
documents
   ↓
encoder
   ↓
stored embeddings
```

At query time:

```text
new query
   ↓
encoder
   ↓
query embedding
   ↓
nearest stored vectors
```

This avoids running a large model jointly over every query-document pair.

---

# Offline vs online computation

## Offline

Do once:

```text
encode 1 million documents
store vectors
build vector index
```

## Online

For each query:

```text
encode query
search index
return top-k
```

This pattern will later appear directly in RAG systems.

---

# One encoder or two?

There are several possibilities:

```text
same encoder for query and document
```

or:

```text
different query and document encoders
```

The retrieval idea is the same:

```text
map both into a compatible vector space
```

For an introductory seminar, students do not need the full training details yet.

---

# Part IV — Similarity functions

## 32–40 min

Once query and document are vectors, we need a score.

Common choices include:

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
\frac{
q \cdot d
}{
\|q\|\|d\|
}
\]

This is the same geometric idea seen with TF-IDF vectors.

The difference is the representation:

```text
TF-IDF:
hand-designed lexical dimensions

Dense retrieval:
learned embedding dimensions
```

---

# Dot product

\[
score(q,d)
=
q^\top d
\]

If embeddings are normalized to unit length, then:

\[
q^\top d
=
\cos(q,d)
\]

So cosine similarity and dot product may produce identical rankings after normalization.

---

# Why normalization matters

Suppose:

```text
vector A has large magnitude
vector B has small magnitude
```

A raw dot product can be influenced by vector length.

Cosine similarity removes that magnitude effect.

Whether normalization is appropriate depends on the embedding model.

---

# Euclidean distance

Another option is:

\[
\|q-d\|_2
\]

Smaller values mean closer vectors.

In practice, the correct similarity function should match how the model was trained.

---

# First-half recap

## 40–45 min

Put this on the board:

```text
text
  ↓
encoder
  ↓
embedding vector
  ↓
similarity function
  ↓
ranking
```

Then compare:

```text
BM25:
term overlap drives score

Dense retrieval:
embedding similarity drives score
```

Transition:

> Let us now see what these vectors actually look like.

---

# Part V — Live embedding demo

## 45–60 min

Use a small sentence-transformer model.

Install:

```bash
pip install sentence-transformers
```

Load:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)
```

Use a tiny collection:

```python
texts = [
    "how to repair a car engine",
    "automobile maintenance and servicing",
    "banana nutrition and healthy diets",
    "treatment for myocardial infarction",
    "therapy after a heart attack",
]
```

Encode:

```python
embeddings = model.encode(
    texts,
    normalize_embeddings=True
)

print(embeddings.shape)
```

Explain:

```text
rows    → texts
columns → embedding dimensions
```

---

# Inspect one vector

```python
print(
    embeddings[0][:10]
)
```

The values are not directly interpretable as words.

This is very different from TF-IDF.

---

# Semantic similarity demo

Encode:

```python
query = "car repair"

q = model.encode(
    [query],
    normalize_embeddings=True
)
```

Compute similarities:

```python
scores = q @ embeddings.T
```

Then:

```python
for text, score in sorted(
    zip(texts, scores[0]),
    key=lambda x: x[1],
    reverse=True
):
    print(
        round(float(score), 3),
        text
    )
```

Ask students before running:

> Which text do you expect to rank highest?

Then compare:

```text
car repair
```

against:

```text
automobile maintenance and servicing
```

This is the semantic-search moment of the lecture.

---

# Another demo

Query:

```text
heart attack treatment
```

Compare with:

```text
therapy after a heart attack
treatment for myocardial infarction
```

This illustrates that dense retrieval may match semantic equivalents even when vocabulary differs.

---

# Important caution

Do not tell students:

```text
dense retrieval understands meaning perfectly
```

That is false.

Embeddings can fail because of:

```text
domain mismatch
negation
rare entities
numbers
dates
exact identifiers
specialized terminology
long documents
ambiguous queries
```

Dense retrieval solves some lexical mismatch problems, not all retrieval problems.

---

# Part VI — Dense retrieval on Cranfield

## 60–72 min

Reuse the Cranfield collection so the retrieval methods remain comparable across labs.

```python
import ir_datasets

dataset = ir_datasets.load("cranfield")

docs = list(dataset.docs_iter())
queries = list(dataset.queries_iter())
```

Prepare documents:

```python
doc_ids = [
    doc.doc_id
    for doc in docs
]

titles = [
    doc.title
    for doc in docs
]

texts = [
    f"{doc.title}. {doc.text}"
    for doc in docs
]
```

---

# Encode documents

```python
doc_embeddings = model.encode(
    texts,
    batch_size=32,
    normalize_embeddings=True,
    show_progress_bar=True
)
```

Explain that this is the expensive **offline** step.

For a large collection, document vectors would normally be stored and indexed.

---

# Dense search

```python
import numpy as np

def search_dense(query, k=5):
    q = model.encode(
        [query],
        normalize_embeddings=True
    )[0]

    scores = doc_embeddings @ q

    top = np.argsort(
        scores
    )[::-1][:k]

    return [
        (
            doc_ids[i],
            titles[i],
            float(scores[i])
        )
        for i in top
    ]
```

Run a real Cranfield query:

```python
q = queries[0].text

print(q)

for result in search_dense(q):
    print(result)
```

---

# What to emphasize

The retrieval pipeline is:

```text
documents
   ↓
encoder
   ↓
document vectors
   ↓
store

query
   ↓
encoder
   ↓
query vector
   ↓
similarity against document vectors
   ↓
top-k
```

Students should understand this architecture before seeing vector databases.

---

# Part VII — Dense retrieval vs BM25

## 72–82 min

Now compare the two approaches.

---

# BM25 is strong when:

```text
exact words matter
rare entities matter
identifiers matter
technical terminology overlaps
queries contain distinctive lexical clues
```

Examples:

```text
"RFC 9309"
"BM25 k1 parameter"
"Python TypeError"
"COVID-19 B.1.1.529"
```

---

# Dense retrieval is useful when:

```text
meaning overlaps
wording differs
queries are paraphrases
documents use related terminology
```

Examples:

```text
car repair
automobile maintenance

heart attack treatment
therapy for myocardial infarction
```

---

# Dense retrieval can fail too

Example:

```text
Query:
documents NOT about neural networks
```

A semantic model may strongly associate:

```text
neural networks
```

with the query despite the negation.

Another example:

```text
Query:
error code 0x80070005
```

Exact lexical matching may be much more reliable than semantic similarity.

---

# Key teaching point

Do not frame the course as:

```text
BM25
    ↓
obsolete
    ↓
dense retrieval
```

A better progression is:

```text
lexical retrieval
+
dense retrieval
+
reranking
```

Different signals are useful for different failure modes.

---

# Simple comparison table

| Property | BM25 | Dense retrieval |
|---|---|---|
| Exact term matching | strong | variable |
| Semantic matching | limited | strong |
| Rare identifiers | strong | often weaker |
| Interpretability | relatively high | lower |
| Requires learned model | no | yes |
| Vector index needed | no | usually yes |
| Vocabulary mismatch | vulnerable | often more robust |

---

# Do not declare a winner by inspection

If BM25 and dense retrieval produce different rankings, ask:

> Which one is better?

The correct answer is still:

```text
evaluate them
```

Use the Lab 05 methodology:

```text
Recall@k
MRR
MAP
nDCG
```

The evaluation framework survives even when the retrieval model changes.

---

# Part VIII — Nearest-neighbor search

## 82–87 min

The demo above computes:

```text
query vector
against
every document vector
```

This is exact search.

If we have:

```text
1,400 documents
```

that is easy.

If we have:

```text
100 million documents
```

it becomes expensive.

---

# Nearest-neighbor search

The problem is:

> Given one query vector, find the closest document vectors.

Formally:

\[
\operatorname{topk}_{d \in D}
sim(q,d)
\]

For small collections, brute force is fine.

For large collections, we usually use an index.

---

# Approximate nearest neighbors

Approximate nearest-neighbor methods trade some exactness for speed.

The idea is:

```text
do not compare against every vector
```

Instead, organize the vector space so that promising candidates can be found quickly.

Common systems and libraries include:

```text
FAISS
HNSW-based indexes
vector databases
```

Do not teach the algorithms deeply yet.

The point today is architectural.

---

# Retrieval quality vs latency

ANN introduces a new engineering trade-off:

```text
more accurate search
↔
more computation
```

The nearest-neighbor layer has its own recall:

```text
Did the ANN index find the same good candidates
that exact search would have found?
```

This is separate from semantic relevance.

---

# Part IX — Connection to RAG

## 87–90 min

Dense retrieval is one of the standard building blocks of RAG.

A basic RAG pipeline is:

```text
documents
   ↓
chunk
   ↓
embed
   ↓
vector index

user query
   ↓
embed
   ↓
nearest-neighbor search
   ↓
top-k chunks
   ↓
LLM
```

This is why understanding dense retrieval matters before introducing RAG frameworks.

The framework is not the retrieval concept.

---

# RAG failure example

Suppose:

```text
correct answer is in chunk D17
```

but dense retrieval ranks it:

```text
rank 12
```

and the LLM receives only:

```text
top 5
```

Then the generation model never sees the evidence.

The retrieval problem comes first.

---

# Final summary

End with this progression:

```text
Lexical retrieval
TF-IDF / BM25
      ↓
Vocabulary mismatch
      ↓
Query expansion / LM retrieval
      ↓
Embeddings
      ↓
Dense retrieval
      ↓
Nearest-neighbor search
      ↓
RAG retrieval
```

---

# Five points students should remember

1. Embeddings represent text as dense learned vectors.
2. Dense retrieval ranks documents by similarity in embedding space.
3. Bi-encoders are efficient because documents can be encoded offline.
4. Dense retrieval helps with semantic mismatch but does not replace lexical retrieval in every setting.
5. Dense retrieval is one of the core retrieval mechanisms used in RAG systems.

---

# Optional after-class exercise

Use Cranfield and compare:

```text
BM25
vs
Dense retrieval
```

For five queries:

1. retrieve top 10 with BM25;
2. retrieve top 10 with the dense model;
3. compare overlap;
4. inspect two queries where the rankings differ strongly;
5. evaluate both with the Lab 05 metrics.

Suggested metrics:

```text
Recall@10
Recall@100
MRR
MAP
nDCG@10
```

---

# Optional semantic-similarity exercise

Encode:

```text
car repair
automobile maintenance
banana nutrition
heart attack treatment
therapy for myocardial infarction
```

Create a pairwise cosine-similarity matrix.

Ask:

1. Which pairs are most similar?
2. Are the results what you expected?
3. Can you find one surprising similarity?
4. Can you construct an example where the model fails?

---

# Optional failure-analysis exercise

Test queries containing:

```text
negation
numbers
rare names
acronyms
exact error codes
```

Examples:

```text
not about neural networks
RFC 9309
error code 0x80070005
BERT paper 2018
```

Compare BM25 and dense retrieval.

The purpose is to show that semantic retrieval is not uniformly superior.

---

# Suggested dependencies

```bash
pip install sentence-transformers ir_datasets numpy
```

Optional for later large-scale indexing:

```bash
pip install faiss-cpu
```

Do not make FAISS the focus of this seminar.

The conceptual priority is:

```text
embedding
→ similarity
→ retrieval
```

not vector-index engineering.

---

# Suggested reading

Christopher D. Manning, Prabhakar Raghavan, Hinrich Schütze.  
*Introduction to Information Retrieval.*

Use it for the classical IR background.

For modern dense retrieval, students should also become familiar with the idea of dual-encoder / bi-encoder retrieval.

---

# Dataset reference

Cranfield:

- https://ir-datasets.com/cranfield.html

---

# Bridge to Lab 09

Students now understand:

```text
documents
   ↓
embeddings
   ↓
dense similarity
   ↓
ranked results
```

The next question is:

> How do we make dense retrieval efficient and effective at larger scale?

Lab 09 can therefore focus on:

```text
dense passage retrieval
vector indexes
exact vs approximate nearest neighbors
FAISS
retrieval latency vs recall
```

and then prepare the ground for:

```text
hybrid retrieval
reranking
RAG
```

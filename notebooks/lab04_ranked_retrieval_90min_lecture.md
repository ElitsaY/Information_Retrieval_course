# Lab 04 — Ranked Retrieval: TF-IDF, Cosine Similarity, and BM25

> **Format:** 90-minute lecturer-led seminar  
> **Structure:** 2 × 45 minutes  
> **Audience:** Master's students in Information Retrieval  
> **Style:** explanation + worked examples + live demo  
> **Primary dataset for demo:** Cranfield

---

## Seminar goal

By the end of the session, students should understand the transition from:

```text
Does this document match?
```

to:

```text
How strongly does this document match, and where should it rank?
```

The central progression is:

```text
Boolean matching
      ↓
term weighting
      ↓
TF-IDF
      ↓
vector-space ranking
      ↓
cosine similarity
      ↓
BM25
```

Students are not expected to implement a full search engine during the seminar. The main objective is conceptual understanding, supported by small calculations and a short live retrieval demo.

---

# Learning objectives

By the end of the seminar, students should be able to explain:

- why Boolean retrieval is insufficient for ranked search;
- the difference between term frequency, document frequency, and inverse document frequency;
- why TF-IDF gives high weight to discriminative terms;
- how documents and queries become vectors;
- why cosine similarity is used;
- why TF-IDF has limitations;
- how BM25 introduces term-frequency saturation and document-length normalization;
- why BM25 remains an important lexical retrieval baseline.

---

# Session plan

## First 45 minutes

| Time | Topic |
|---|---|
| 0–10 min | From Boolean retrieval to ranking |
| 10–25 min | TF, DF, IDF |
| 25–40 min | TF-IDF and cosine similarity |
| 40–45 min | Recap and transition |

## Second 45 minutes

| Time | Topic |
|---|---|
| 45–60 min | Live TF-IDF retrieval demo on Cranfield |
| 60–75 min | BM25 intuition and formula |
| 75–85 min | TF-IDF vs BM25 demo |
| 85–90 min | Summary and bridge to evaluation |

---

# Part I — Why ranking?

## 0–10 min

Start from the retrieval systems students have already seen.

Boolean retrieval gives us:

```text
query: "information AND retrieval"

D1 → match
D2 → no match
D3 → match
D4 → match
```

The problem is obvious:

```text
D1, D3, D4 all match.
```

But which one should be first?

A modern retrieval system needs a scoring function:

\[
score(q,d)
\]

and then sorts documents by score:

\[
d_{(1)}, d_{(2)}, d_{(3)}, \ldots
\]

### Main point

Boolean retrieval answers:

> Does the document satisfy the query?

Ranked retrieval answers:

> How relevant does the document appear to be?

---

# Worked example

Use this tiny corpus on the board.

```text
D1: information retrieval finds relevant documents
D2: boolean retrieval returns matching documents
D3: tf idf weights rare terms in documents
D4: bm25 uses term frequency and document length
D5: search engines rank documents for user queries
```

Query:

```text
retrieval relevant documents
```

Ask the class:

> Which document would you put first?

Most students will choose `D1`.

Then ask:

> How can we make a machine arrive at a similar ranking?

This motivates term weighting.

---

# Part II — TF, DF, and IDF

## 10–25 min

## Term Frequency

Term frequency asks:

> How often does term \(t\) occur in document \(d\)?

\[
tf(t,d)
\]

For the query term `retrieval`:

```text
D1 → 1
D2 → 1
D3 → 0
D4 → 0
D5 → 0
```

A first intuition is:

```text
more occurrences → perhaps more evidence of relevance
```

But raw frequency is not enough.

---

## Document Frequency

Document frequency asks:

> In how many documents does term \(t\) appear?

\[
df_t
\]

For the toy corpus:

```text
retrieval → appears in 2 documents
relevant  → appears in 1 document
documents → appears in 4 documents
```

This tells us that:

```text
relevant
```

is more discriminative than:

```text
documents
```

---

## Inverse Document Frequency

A standard form is:

\[
idf(t)=\log\frac{N}{df_t}
\]

where:

- \(N\) = number of documents;
- \(df_t\) = number of documents containing term \(t\).

If a term appears in every document:

\[
df_t=N
\]

then:

\[
idf(t)=\log 1=0
\]

### Main intuition

A term is useful for retrieval when it helps distinguish documents.

Common terms carry less information.

Rare terms carry more.

---

## Quick board calculation

For:

```text
N = 5
```

we get approximately:

```text
retrieval:
idf = log(5 / 2)

relevant:
idf = log(5 / 1)

documents:
idf = log(5 / 4)
```

Do not spend time on calculator precision.

The important ordering is:

```text
relevant > retrieval > documents
```

in terms of IDF.

---

# Part III — TF-IDF

## 25–32 min

The basic idea is:

\[
tfidf(t,d)=tf(t,d)\times idf(t)
\]

This combines two signals:

```text
term is frequent in this document
+
term is rare in the collection
```

A document receives a high score when it contains terms that are both:

- locally important;
- globally discriminative.

---

# Why raw TF is imperfect

Suppose one term appears:

```text
1 time
2 times
20 times
```

Should 20 occurrences give 20 times the evidence of 1 occurrence?

Usually not.

This becomes important later when we introduce BM25.

---

# Part IV — Vector-space model

## 32–40 min

Once every term has a weight, a document can be represented as a vector.

Suppose the vocabulary is:

```text
[information, retrieval, relevant, documents]
```

Then a document can become:

\[
d = [0.8,\ 1.2,\ 1.5,\ 0.3]
\]

and a query:

\[
q = [0,\ 1.0,\ 1.4,\ 0.2]
\]

The retrieval problem becomes:

> Which document vector is closest to the query vector?

---

# Cosine similarity

The standard measure is:

\[
\cos(q,d)
=
\frac{q\cdot d}
{\|q\|\|d\|}
\]

The dot product rewards shared weighted terms.

The denominator normalizes for vector magnitude.

### Why normalize?

Without normalization, long documents may receive large scores simply because they contain many terms.

Cosine similarity compares vector direction rather than raw magnitude.

---

# Simple geometric interpretation

Explain without overdoing the geometry.

```text
small angle  → high cosine similarity
large angle  → low cosine similarity
```

For non-negative TF-IDF vectors:

```text
cosine ≈ 1 → very similar
cosine ≈ 0 → little overlap
```

---

# First-half recap

## 40–45 min

Put this sequence on the board:

```text
tf
↓
How common is the term inside this document?

df
↓
How common is the term across documents?

idf
↓
How discriminative is the term?

tf-idf
↓
How important is the term for this document?

cosine similarity
↓
How similar are the query and document vectors?
```

Then transition:

> Now let us see this on an actual retrieval collection.

---

# Part V — Live demo with Cranfield

## 45–60 min

Cranfield is useful because it contains:

- 1,400 documents;
- 225 queries;
- relevance judgments.

For this seminar, use it only to demonstrate ranking.

Formal evaluation comes in Lab 05.

---

# Setup

```bash
pip install ir_datasets scikit-learn
```

```python
import ir_datasets

dataset = ir_datasets.load("cranfield")

docs = list(dataset.docs_iter())
queries = list(dataset.queries_iter())

print(len(docs))
print(len(queries))
```

Build the text collection:

```python
doc_ids = [d.doc_id for d in docs]
titles = [d.title for d in docs]

texts = [
    f"{d.title} {d.text}"
    for d in docs
]
```

---

# Build TF-IDF

```python
from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer(
    lowercase=True,
    norm="l2"
)

X = vectorizer.fit_transform(texts)

print(X.shape)
```

Explain:

```text
rows    → documents
columns → terms
```

The matrix is sparse because most terms do not occur in most documents.

---

# Search function

```python
from sklearn.metrics.pairwise import cosine_similarity

def search_tfidf(query, k=5):
    q = vectorizer.transform([query])

    scores = cosine_similarity(
        q,
        X
    ).ravel()

    top = scores.argsort()[::-1][:k]

    return [
        (
            doc_ids[i],
            titles[i],
            scores[i]
        )
        for i in top
    ]
```

Try one real Cranfield query:

```python
print(
    queries[0].query_id,
    queries[0].text
)
```

Then:

```python
search_tfidf(
    queries[0].text
)
```

---

# What to point out during the demo

Do not focus on code syntax.

Focus on the pipeline:

```text
documents
   ↓
TF-IDF matrix

query
   ↓
TF-IDF query vector

query vector
   ↓
cosine similarity

scores
   ↓
sorting

ranked documents
```

This is the conceptual model students should retain.

---

# Part VI — Why BM25?

## 60–75 min

TF-IDF is elegant, but it has limitations.

Two important ones are:

1. term frequency should saturate;
2. document length should affect scoring.

---

# Problem 1 — Term-frequency saturation

Suppose the query contains:

```text
engine
```

Compare:

```text
Document A: "engine" appears once
Document B: "engine" appears 5 times
Document C: "engine" appears 50 times
```

Do we really believe:

```text
C is 50 times stronger than A?
```

Probably not.

After several occurrences, each additional occurrence provides less new evidence.

This is:

```text
term-frequency saturation
```

---

# Problem 2 — Document length

Compare:

```text
Document A:
50 words, "engine" appears 3 times

Document B:
5000 words, "engine" appears 3 times
```

The same term frequency means something different in the two documents.

BM25 handles this directly.

---

# BM25 formula

Show the formula once:

\[
BM25(q,d)
=
\sum_{t\in q}
idf(t)
\frac{
tf(t,d)(k_1+1)
}{
tf(t,d)+
k_1
\left(
1-b+b\frac{|d|}{avgdl}
\right)
}
\]

Do not ask students to memorize it.

Break it into components.

---

# BM25 pieces

## IDF

Rare query terms matter more.

Same broad idea as TF-IDF.

---

## \(tf(t,d)\)

A term appearing more often usually contributes more.

But because of the denominator:

```text
the gain gradually saturates
```

---

## \(k_1\)

Controls term-frequency saturation.

Typical value:

```text
k1 ≈ 1.2
```

Higher values let repeated terms continue to contribute more.

---

## \(b\)

Controls document-length normalization.

Typical value:

```text
b ≈ 0.75
```

Special cases:

```text
b = 0
→ ignore document length

b = 1
→ strong length normalization
```

---

# BM25 intuition in one sentence

BM25 asks:

> Does this document contain the query terms often enough to matter, while accounting for how rare the terms are and how long the document is?

That is enough for an introductory session.

---

# Part VII — TF-IDF vs BM25

## 75–85 min

Use an existing BM25 implementation for the live comparison.

For a lecture, do not spend 15 minutes implementing the full formula from scratch.

The point is ranking behavior.

Example library:

```bash
pip install rank-bm25
```

```python
from rank_bm25 import BM25Okapi

tokenized_docs = [
    text.lower().split()
    for text in texts
]

bm25 = BM25Okapi(tokenized_docs)

def search_bm25(query, k=5):
    tokens = query.lower().split()

    scores = bm25.get_scores(tokens)
    top = scores.argsort()[::-1][:k]

    return [
        (
            doc_ids[i],
            titles[i],
            scores[i]
        )
        for i in top
    ]
```

Run:

```python
query = queries[0].text

print("TF-IDF")
for x in search_tfidf(query):
    print(x)

print("\nBM25")
for x in search_bm25(query):
    print(x)
```

---

# Discussion prompt

Ask:

> Are the rankings identical?

Usually they will not be.

Then ask:

> Which one is better?

Do **not** answer from visual inspection alone.

That is the bridge to Lab 05.

---

# Why this comparison matters

Students should leave with this point:

```text
Different ranking functions
→ different ranked lists
→ we need evaluation
```

Without relevance judgments and metrics, we cannot make a rigorous claim that one ranking is superior.

---

# Part VIII — Final summary

## 85–90 min

End with this table.

| Method | Main idea |
|---|---|
| Boolean retrieval | exact match / logical conditions |
| TF-IDF | weight terms by local frequency and global rarity |
| Cosine similarity | compare query/document vectors |
| BM25 | lexical ranking with TF saturation and length normalization |

Then show the semester progression:

```text
Lab 04
How do we rank documents?
        ↓
Lab 05
How do we know whether the ranking is good?
```

---

# Key takeaways

Students should remember these five points:

1. Retrieval is usually a ranking problem, not just a matching problem.
2. Rare terms are often more discriminative than common terms.
3. TF-IDF gives us a practical weighted vector representation.
4. Cosine similarity provides a normalized comparison between query and document vectors.
5. BM25 improves lexical ranking by modeling saturation and document length.

---

# Optional after-class exercise

Students can reproduce the live demo and compare TF-IDF and BM25 for five Cranfield queries.

For each query:

```text
1. print the top 5 TF-IDF results
2. print the top 5 BM25 results
3. identify whether the rankings differ
4. do not yet decide which system is better
```

That decision requires the material from Lab 05.

---

# Dataset reference

Cranfield via `ir_datasets`:

- https://ir-datasets.com/cranfield.html

---

# Suggested reading

Christopher D. Manning, Prabhakar Raghavan, Hinrich Schütze.  
*Introduction to Information Retrieval.*

Relevant topics:

- ranked retrieval;
- TF-IDF;
- vector-space model;
- cosine scoring.

- https://nlp.stanford.edu/IR-book/

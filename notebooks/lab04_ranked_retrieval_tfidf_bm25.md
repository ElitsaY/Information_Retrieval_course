# Lab 04 — Ranked Retrieval: TF-IDF, Cosine Similarity, and BM25

> **Information Retrieval — Master's level**  
> **Estimated time:** 2.5–3 hours  
> **Prerequisites:** inverted indexes, document/term frequency, text preprocessing, basic NumPy/Python  
> **Main dataset:** Cranfield

---

## Overview

So far, our retrieval systems have mostly answered a binary question:

> **Does this document match the query?**

Real search systems need to answer a harder question:

> **Which matching documents should appear first?**

In this lab, we move from **Boolean retrieval** to **ranked retrieval**. We will represent documents and queries with weighted terms, score their similarity, and return an ordered list of results.

We will study three closely related ideas:

1. **TF-IDF** — terms should receive more weight when they are frequent in a document but rare in the collection.
2. **Cosine similarity** — compare a query vector to document vectors while controlling for vector magnitude.
3. **BM25** — a classical probabilistic ranking function that adds term-frequency saturation and document-length normalization.

The lab intentionally starts with a tiny corpus where every number is inspectable, then moves to a real IR benchmark.

---

## Learning objectives

By the end of the lab, you should be able to:

- explain why Boolean matching is insufficient for ranked search;
- distinguish **term frequency** \(tf\), **document frequency** \(df\), and **inverse document frequency** \(idf\);
- compute TF-IDF weights manually;
- represent queries and documents in the vector-space model;
- rank documents using cosine similarity;
- explain the role of document-length normalization;
- implement a simplified BM25 ranker;
- compare TF-IDF and BM25 qualitatively on a real dataset;
- produce retrieval runs that we will evaluate quantitatively in **Lab 05**.

---

# 1. From matching to ranking

Consider the query:

```text
retrieval relevant documents
```

Suppose three documents contain at least one query term.

A Boolean retrieval system can tell us that they match, but it cannot naturally tell us which result is the best.

A ranked retrieval system instead computes a score:

\[
\operatorname{score}(q,d)
\]

and returns documents in descending score order:

\[
d_{(1)}, d_{(2)}, \ldots, d_{(k)}
\]

The score is not a probability of truth. It is a numerical signal used to order documents.

---

# 2. A tiny corpus we can calculate by hand

We will first use five documents:

```python
toy_docs = {
    "D1": "information retrieval finds relevant documents",
    "D2": "boolean retrieval returns matching documents",
    "D3": "tf idf weights rare terms in documents",
    "D4": "bm25 uses term frequency and document length",
    "D5": "search engines rank documents for user queries",
}

query = "retrieval relevant documents"
```

Use the same preprocessing choices for both documents and queries.

For this first exercise, simple lower-casing and whitespace tokenization are enough:

```python
def tokenize(text):
    return text.lower().split()
```

> **Important:** in a real system, the query must go through a preprocessing pipeline compatible with the one used for the documents. A stemming/indexing mismatch between query and corpus can destroy retrieval quality.

---

## Exercise 1 — Term frequency and document frequency

For each query term:

```text
retrieval
relevant
documents
```

compute:

- \(tf_{t,d}\): number of occurrences of term \(t\) in document \(d\);
- \(df_t\): number of documents that contain \(t\).

Complete a table like this:

| term | df | tf in D1 | tf in D2 | tf in D3 | tf in D4 | tf in D5 |
|---|---:|---:|---:|---:|---:|---:|
| retrieval | ? | ? | ? | ? | ? | ? |
| relevant | ? | ? | ? | ? | ? | ? |
| documents | ? | ? | ? | ? | ? | ? |

### Questions

1. Which query term is most common in the collection?
2. Which query term should be most informative for distinguishing D1 from the others?
3. Should a term that occurs in almost every document receive a large weight?

---

# 3. Inverse document frequency

A simple inverse document frequency is

\[
idf(t)=\log\frac{N}{df_t},
\]

where:

- \(N\) is the number of documents;
- \(df_t\) is the number of documents containing term \(t\).

A rare term receives a larger IDF.

A term appearing in every document has

\[
idf(t)=\log 1 = 0.
\]

This captures an important IR intuition:

> A term is useful for retrieval when it helps distinguish some documents from others.

---

## Exercise 2 — Compute IDF manually

For the toy corpus, \(N=5\).

Compute the IDF for each query term using natural logarithms.

```python
import math

def idf(N, df):
    # TODO
    pass
```

Then print the values.

### Question

Why is `relevant` more informative than `documents` for this query?

---

## A practical detail: there is more than one TF-IDF formula

You will encounter several valid variants.

A textbook may use:

\[
idf(t)=\log\frac{N}{df_t}.
\]

Scikit-learn's default `TfidfVectorizer` uses smoothed IDF:

\[
idf(t)=\log\left(\frac{1+N}{1+df_t}\right)+1.
\]

The exact numerical scores can therefore differ across implementations even when the ranking idea is the same.

Do not compare raw scores from two systems before checking which weighting formula they use.

---

# 4. TF-IDF

The basic weight of term \(t\) in document \(d\) is

\[
tfidf(t,d)=tf(t,d)\times idf(t).
\]

The intuition is a balance:

- high \(tf\): the term matters inside this document;
- high \(idf\): the term is discriminative across the collection.

Raw term frequency is only one option. Another common transformation is

\[
tf'(t,d)=
\begin{cases}
1+\log tf(t,d), & tf(t,d)>0\\
0, & \text{otherwise}.
\end{cases}
\]

This dampens the effect of repeated terms.

---

## Exercise 3 — Build TF-IDF vectors manually

Build a vocabulary from the toy collection.

Then create one TF-IDF vector per document.

Starter code:

```python
from collections import Counter
import math
import numpy as np

tokenized_docs = {
    doc_id: tokenize(text)
    for doc_id, text in toy_docs.items()
}

vocabulary = sorted({
    token
    for tokens in tokenized_docs.values()
    for token in tokens
})

N = len(tokenized_docs)

# document frequency
df = Counter()
for tokens in tokenized_docs.values():
    for token in set(tokens):
        df[token] += 1

# TODO: compute idf for every vocabulary term
idf_values = {}

# TODO: construct one vector per document
document_vectors = {}
```

### Requirements

Your implementation should:

1. build the vocabulary dynamically;
2. compute \(df_t\);
3. compute \(idf_t\);
4. construct a TF-IDF vector for each document;
5. construct a TF-IDF vector for the query using the **document collection's IDF values**.

> Do **not** recompute IDF using the query. IDF is a collection statistic.

---

# 5. Vector-space retrieval and cosine similarity

Once queries and documents are vectors, we need a similarity function.

The dot product is:

\[
q\cdot d = \sum_i q_i d_i.
\]

However, longer vectors can have larger dot products simply because they contain more weighted terms.

Cosine similarity normalizes by the vector lengths:

\[
\cos(q,d)
=
\frac{q\cdot d}
{\|q\|\|d\|}.
\]

Its value is typically between 0 and 1 for non-negative TF-IDF vectors.

A score near 1 means the vectors point in similar directions.

---

## Exercise 4 — Implement cosine similarity

Implement cosine similarity without using scikit-learn:

```python
def cosine_similarity_manual(a, b):
    # TODO
    pass
```

Handle the zero-vector case.

Then rank all five toy documents for:

```text
retrieval relevant documents
```

Return:

```python
[
    ("D1", score),
    ("D2", score),
    ...
]
```

in descending score order.

### Questions

1. Which document ranks first?
2. Why?
3. Is a document with more query-term matches guaranteed to have the highest cosine similarity?
4. What happens if the query contains only words unseen in the collection?

---

# 6. Real IR data: Cranfield

For the rest of the lab we will use the **Cranfield collection**.

It is small enough to run locally but has the structure we want from an IR benchmark:

- **1,400** scientific abstracts;
- **225** natural-language queries;
- **1,837** relevance judgments;
- graded relevance levels.

This is much more useful for an IR lab than a generic text-classification dataset because it already contains the three objects an ad-hoc retrieval experiment needs:

\[
\text{documents} + \text{queries} + \text{relevance judgments}.
\]

We will use the relevance judgments properly in **Lab 05**. In this lab, we only inspect them to understand what the dataset contains.

Dataset documentation:

- `ir_datasets`: https://ir-datasets.com/cranfield

---

## Setup

Install the required packages:

```bash
pip install ir_datasets scikit-learn pandas numpy
```

Then load the dataset:

```python
import ir_datasets

dataset = ir_datasets.load("cranfield")

docs = list(dataset.docs_iter())
queries = list(dataset.queries_iter())
qrels = list(dataset.qrels_iter())

print("documents:", len(docs))
print("queries:", len(queries))
print("qrels:", len(qrels))
```

Inspect one document:

```python
docs[0]
```

A Cranfield document contains:

```text
doc_id
title
text
author
bib
```

Inspect one query:

```python
queries[0]
```

Inspect several relevance judgments:

```python
qrels[:10]
```

---

## Exercise 5 — Prepare the collection

Create:

```python
doc_ids = [...]
titles = [...]
texts = [...]
```

For retrieval, use both title and abstract text:

```python
texts = [
    f"{doc.title} {doc.text}"
    for doc in docs
]
```

Then inspect:

- average document length in whitespace-separated tokens;
- shortest document;
- longest document;
- five example queries.

### Question

Why might concatenating `title + text` be better than retrieving over the abstract alone?

### Optional experiment

Try giving the title extra weight by repeating it:

```python
weighted_text = f"{doc.title} {doc.title} {doc.text}"
```

This is a crude form of **field weighting**.

Do not assume it improves retrieval; test it later.

---

# 7. TF-IDF retrieval with scikit-learn

Now build a real sparse TF-IDF matrix.

```python
from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer(
    lowercase=True,
    stop_words=None,
    norm="l2",
)

X = vectorizer.fit_transform(texts)

print(X.shape)
```

The matrix has shape:

\[
\text{number of documents} \times \text{vocabulary size}.
\]

It is sparse because each document contains only a small fraction of the collection vocabulary.

---

## Exercise 6 — Inspect the representation

Answer the following using code:

1. What is the vocabulary size?
2. How many non-zero entries does the matrix contain?
3. What percentage of the full matrix would be non-zero if it were stored densely?
4. Find the IDF values for:
   - a very common term;
   - a medium-frequency term;
   - a rare term.
5. Print the ten terms with the largest IDF values.

Useful attributes:

```python
vectorizer.vocabulary_
vectorizer.idf_
vectorizer.get_feature_names_out()
X.nnz
```

### Think before interpreting

A maximum-IDF token is not automatically a useful search term. It may be:

- a typo;
- a proper name;
- a formula fragment;
- OCR noise;
- an extremely rare technical term.

IDF measures rarity, not semantic importance.

---

# 8. Search with cosine similarity

`TfidfVectorizer(norm="l2")` L2-normalizes document vectors.

When both query and document vectors are L2-normalized,

\[
\cos(q,d)=q^\top d.
\]

Implement a search function:

```python
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def search_tfidf(query, k=10):
    q = vectorizer.transform([query])

    # TODO: similarity between q and all document vectors
    scores = ...

    # TODO: indices of top-k documents
    top_indices = ...

    results = []
    for rank, i in enumerate(top_indices, start=1):
        results.append({
            "rank": rank,
            "doc_id": doc_ids[i],
            "score": float(scores[i]),
            "title": titles[i],
        })

    return results
```

Test it on at least **five Cranfield queries**.

Use actual dataset queries rather than inventing all queries yourself.

For example:

```python
for q in queries[:5]:
    print(q.query_id, q.text)
```

---

## Exercise 7 — Inspect actual results

Pick three queries with noticeably different retrieval behavior.

For each:

1. print the query;
2. print the top five TF-IDF results;
3. inspect their titles and first 250 characters;
4. identify whether the ranking *looks* reasonable.

Then look up the available relevance judgments for that query:

```python
from collections import defaultdict

qrels_by_query = defaultdict(dict)

for qrel in qrels:
    qrels_by_query[qrel.query_id][qrel.doc_id] = qrel.relevance
```

Annotate each top-five result with its known relevance grade if one exists.

> **Do not compute Precision, Recall, MAP, MRR, or nDCG yet.**  
> That is the purpose of Lab 05.

### Discussion

Why is manually reading five results not enough to conclude that one ranking function is better?

---

# 9. Why TF-IDF is not the end of the story

TF-IDF gives us two important ingredients:

- terms repeated in a document can matter more;
- rare terms can matter more than common terms.

But raw TF has a problem.

Suppose a term occurs:

- once in document A;
- twice in document B;
- twenty times in document C.

Should document C receive twenty times the contribution of document A?

Usually not.

After a few occurrences, seeing the term again provides diminishing evidence.

This motivates **term-frequency saturation**.

Document length also matters. A term occurring 4 times in a 40-word document means something different from the same term occurring 4 times in a 4,000-word document.

These ideas are built directly into BM25.

---

# 10. BM25

A common BM25 form is:

\[
\operatorname{BM25}(q,d)
=
\sum_{t\in q}
idf(t)
\frac{
tf(t,d)(k_1+1)
}{
tf(t,d)+
k_1\left(
1-b+b\frac{|d|}{\operatorname{avgdl}}
\right)
}.
\]

We will use

\[
idf(t)
=
\ln\left(
1+
\frac{
N-df_t+0.5
}{
df_t+0.5
}
\right).
\]

Where:

- \(tf(t,d)\): term frequency in document \(d\);
- \(df_t\): number of documents containing term \(t\);
- \(N\): collection size;
- \(|d|\): document length;
- \(\operatorname{avgdl}\): average document length;
- \(k_1\): controls term-frequency saturation;
- \(b\): controls document-length normalization.

Typical starting values:

```text
k1 = 1.2
b  = 0.75
```

These are not universal constants.

---

## What the parameters do

### \(k_1\): term-frequency saturation

If \(k_1\) is small, additional occurrences saturate quickly.

If \(k_1\) is larger, repeated occurrences continue to increase the score for longer.

### \(b\): length normalization

- \(b=0\): ignore document length;
- \(b=1\): apply full BM25 length normalization;
- values around \(0.75\) are a common starting point.

---

# 11. Build BM25 from scratch

We will reuse an inverted-index style representation from earlier labs.

Use a simple tokenizer first:

```python
import re

TOKEN_RE = re.compile(r"\b\w+\b", flags=re.UNICODE)

def bm25_tokenize(text):
    return TOKEN_RE.findall(text.lower())
```

Tokenize the collection:

```python
tokenized_docs = [bm25_tokenize(text) for text in texts]
```

Build:

- document lengths;
- average document length;
- document frequencies;
- postings containing `(doc_index, term_frequency)`.

Starter code:

```python
from collections import Counter, defaultdict
import numpy as np

N = len(tokenized_docs)
doc_lengths = np.array([len(doc) for doc in tokenized_docs])
avgdl = doc_lengths.mean()

postings = defaultdict(list)

for doc_index, tokens in enumerate(tokenized_docs):
    counts = Counter(tokens)

    for term, tf in counts.items():
        postings[term].append((doc_index, tf))

df = {
    term: len(term_postings)
    for term, term_postings in postings.items()
}
```

---

## Exercise 8 — Implement BM25 scoring

Complete:

```python
import math

def bm25_idf(term):
    # TODO
    pass


def search_bm25(query, k=10, k1=1.2, b=0.75):
    scores = np.zeros(N, dtype=float)

    # Simplification for short keyword queries:
    # each unique query term contributes once.
    query_terms = set(bm25_tokenize(query))

    for term in query_terms:
        if term not in postings:
            continue

        # TODO
        term_idf = ...

        for doc_index, tf in postings[term]:
            # TODO: BM25 denominator
            denominator = ...

            # TODO: term contribution
            contribution = ...

            scores[doc_index] += contribution

    # TODO: top-k indices
    top_indices = ...

    results = []
    for rank, i in enumerate(top_indices, start=1):
        results.append({
            "rank": rank,
            "doc_id": doc_ids[i],
            "score": float(scores[i]),
            "title": titles[i],
        })

    return results
```

### Sanity checks

Your code should satisfy:

```python
assert avgdl > 0
assert len(doc_lengths) == len(docs)
assert all(length >= 0 for length in doc_lengths)
```

For an out-of-vocabulary query:

```python
search_bm25("zzzzzzzzzzzzzz")
```

all scores should be zero.

---

# 12. TF-IDF vs BM25

For five Cranfield queries, print the top 10 documents from:

```python
search_tfidf(...)
search_bm25(...)
```

Create a comparison table:

| query | TF-IDF top-1 | BM25 top-1 | same? |
|---|---|---|---|
| ... | ... | ... | yes/no |

Then compare the full top-10 lists.

You can measure simple overlap without introducing evaluation metrics yet:

```python
def top_k_overlap(results_a, results_b):
    a = {r["doc_id"] for r in results_a}
    b = {r["doc_id"] for r in results_b}
    return len(a & b)
```

### Questions

1. Do TF-IDF and BM25 always return the same top result?
2. Find a query where their rankings differ substantially.
3. Inspect the documents responsible for the difference.
4. Is BM25 always better merely because it is more sophisticated?
5. What collection properties could make length normalization important?

---

# 13. Experiment: term-frequency saturation

BM25 should not reward repeated occurrences linearly forever.

For a fixed \(idf=1\) and a document of average length, compute the BM25 term contribution for:

```text
tf = 1, 2, 3, ..., 30
```

using:

```text
k1 = 1.2
b = 0.75
|d| / avgdl = 1
```

Plot:

```text
x-axis: term frequency
y-axis: BM25 term contribution
```

### Question

What happens to the marginal gain from the 20th occurrence compared with the gain from the 2nd occurrence?

This is the idea of **TF saturation**.

---

# 14. Experiment: document-length normalization

Choose one real query term that occurs in documents of noticeably different lengths.

For the same term frequency, compare the BM25 contribution when:

```text
b = 0.0
b = 0.5
b = 0.75
b = 1.0
```

### Questions

1. What happens when \(b=0\)?
2. Which documents are penalized as \(b\) increases?
3. Why might aggressive length normalization sometimes hurt?

---

# 15. Experiment: preprocessing affects ranking

You already studied preprocessing in Lab 02.

Now test whether those decisions affect ranked retrieval.

Choose **one** preprocessing intervention, for example:

- stop-word removal;
- stemming;
- lemmatization;
- removing numbers;
- keeping vs removing hyphenated forms.

Build a second TF-IDF system with that preprocessing.

For five queries, compare its top-10 results with the original system.

### Important

Do not write:

> "Stemming is better."

unless you have evaluated it.

At this point you may only say something like:

> "Stemming changed the ranking for these queries."

Formal evaluation comes next week.

---

# 16. Save retrieval runs for Lab 05

Lab 05 will evaluate ranking quality using relevance judgments.

To avoid rebuilding everything, save the top 100 results for every Cranfield query.

We will use a TREC-style run format:

```text
query_id Q0 doc_id rank score system_name
```

Example:

```text
1 Q0 184 1 0.7341 tfidf
1 Q0 12  2 0.6928 tfidf
```

Implement:

```python
def write_run(path, system_name, search_fn, k=100):
    with open(path, "w", encoding="utf-8") as f:
        for q in queries:
            results = search_fn(q.text, k=k)

            for result in results:
                f.write(
                    f"{q.query_id} Q0 "
                    f"{result['doc_id']} "
                    f"{result['rank']} "
                    f"{result['score']:.8f} "
                    f"{system_name}\n"
                )
```

Save:

```python
write_run(
    "lab04_tfidf.run",
    "tfidf",
    search_tfidf,
)

write_run(
    "lab04_bm25.run",
    "bm25",
    search_bm25,
)
```

Keep these files.

We will use them in **Lab 05: IR Evaluation**.

---

# 17. Required submission

Submit a notebook containing:

- [ ] manual \(tf\), \(df\), and \(idf\) calculations on the toy corpus;
- [ ] manual TF-IDF vectors;
- [ ] manual cosine similarity implementation;
- [ ] Cranfield loading and corpus inspection;
- [ ] TF-IDF retrieval system;
- [ ] BM25 implementation;
- [ ] TF-IDF/BM25 comparison for at least five queries;
- [ ] term-frequency saturation experiment;
- [ ] document-length normalization experiment;
- [ ] one preprocessing comparison;
- [ ] `lab04_tfidf.run`;
- [ ] `lab04_bm25.run`;
- [ ] short answers to the conceptual questions.

---

# 18. Concept check

Answer in 1–3 sentences each.

### 1. Why not rank documents using raw term frequency only?

### 2. What does IDF measure?

### 3. Why does a term appearing in every document carry little retrieval information?

### 4. What problem does cosine normalization address?

### 5. Why are TF-IDF scores from two libraries not necessarily numerically identical?

### 6. What is TF saturation?

### 7. What problem does BM25's \(b\) parameter address?

### 8. What happens when \(b=0\)?

### 9. Can a document have a high BM25 score even if it does not contain every query term?

### 10. Why can we not determine the better ranker by inspecting only a few search results?

---

# 19. Optional extension — compare against a modern benchmark

Cranfield is deliberately small and classical.

If you finish early, try **BEIR/SciFact**.

SciFact retrieves scientific papers for scientific claims and is a useful bridge toward later semantic retrieval and RAG labs.

Using `ir_datasets`:

```python
import ir_datasets

scifact = ir_datasets.load("beir/scifact/train")

scifact_docs = list(scifact.docs_iter())
scifact_queries = list(scifact.queries_iter())
scifact_qrels = list(scifact.qrels_iter())

print(len(scifact_docs))
print(len(scifact_queries))
print(len(scifact_qrels))
```

The training split provides:

- 5,183 documents;
- 809 queries;
- 919 relevance judgments.

Documentation:

- https://ir-datasets.com/beir.html
- https://huggingface.co/datasets/BeIR/scifact

### Extension task

Run your TF-IDF and BM25 systems on SciFact.

Do not optimize parameters yet.

Compare several queries qualitatively.

Keep the code: we can revisit the same collection when we introduce **dense retrieval** later in the course.

---

# 20. Why Cranfield instead of 20 Newsgroups for this lab?

20 Newsgroups is useful for:

- preprocessing;
- indexing;
- classification;
- inspecting term distributions.

But for ranked retrieval experiments, we want:

```text
query → ranked documents → relevance judgments
```

Cranfield already provides that structure.

This lets the same dataset support a clean progression:

```text
Lab 04
TF-IDF / BM25 ranking
        ↓
Lab 05
Precision / Recall / MRR / MAP / nDCG
        ↓
Later labs
Dense retrieval / hybrid retrieval / reranking
```

Using one benchmark across several labs also makes it easier to see whether a new method actually improves retrieval rather than merely producing different-looking results.

---

# 21. Further reading

### Course reference

Christopher D. Manning, Prabhakar Raghavan, Hinrich Schütze.  
*Introduction to Information Retrieval.*

Relevant topics:

- ranked retrieval;
- term frequency;
- inverse document frequency;
- vector-space scoring.

Book site:

- https://nlp.stanford.edu/IR-book/

### Dataset documentation

Cranfield via `ir_datasets`:

- https://ir-datasets.com/cranfield

BEIR / SciFact via `ir_datasets`:

- https://ir-datasets.com/beir.html

### Scikit-learn TF-IDF

- https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html

---

# 22. Takeaway

The ranked-retrieval pipeline in this lab is:

```text
documents
    ↓
preprocessing
    ↓
term statistics: tf, df, idf
    ↓
representation / scoring
    ├── TF-IDF + cosine
    └── BM25
    ↓
ranked list of documents
```

The next question is no longer:

> **Can we retrieve documents?**

It is:

> **How do we know whether the ranking is good?**

That is the subject of **Lab 05: Evaluation**.

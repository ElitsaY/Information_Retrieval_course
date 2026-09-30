# Lab 07 — Query Expansion, Relevance Feedback, and Language Models for IR

> **Format:** 90-minute lecturer-led seminar  
> **Structure:** 2 × 45 minutes  
> **Audience:** Master's students in Information Retrieval  
> **Style:** explanation + worked examples + short live demos  
> **Main themes:** vocabulary mismatch, query expansion, relevance feedback, Rocchio, query likelihood, smoothing  
> **Dataset for demos:** Cranfield

---

## Seminar goal

Up to this point, our retrieval systems have mostly assumed that the query already contains the right words.

But users often describe the same concept differently from the documents they want.

For example:

```text
query:
car repair

relevant document:
automobile maintenance
```

A purely lexical retriever may struggle because:

```text
car != automobile
repair != maintenance
```

This is the **vocabulary mismatch problem**.

In this seminar we study two classical ways to address it:

```text
1. improve the query
   → query expansion / relevance feedback

2. model how likely a document is to generate the query
   → language-model-based retrieval
```

These ideas are useful historically and conceptually before moving to dense retrieval.

---

# Learning objectives

By the end of the seminar, students should be able to explain:

- what vocabulary mismatch is;
- the difference between query expansion and relevance feedback;
- explicit vs pseudo-relevance feedback;
- the intuition behind the Rocchio algorithm;
- why query expansion can help and also hurt;
- the query-likelihood view of retrieval;
- why smoothing is necessary in language-model retrieval;
- the difference between document and collection language models;
- how classical query expansion connects to modern retrieval;
- how these ideas prepare us for dense retrieval and RAG.

---

# Session plan

## First 45 minutes

| Time | Topic |
|---|---|
| 0–10 min | Vocabulary mismatch |
| 10–20 min | Query expansion |
| 20–35 min | Relevance feedback and Rocchio |
| 35–42 min | Pseudo-relevance feedback |
| 42–45 min | First-half recap |

## Second 45 minutes

| Time | Topic |
|---|---|
| 45–57 min | Language-model view of retrieval |
| 57–70 min | Query likelihood |
| 70–80 min | Smoothing |
| 80–86 min | Short Cranfield demo |
| 86–90 min | Comparison + bridge to dense retrieval |

---

# Part I — The vocabulary mismatch problem

## 0–10 min

Start with a simple example:

```text
Query:
car repair

Document:
automobile maintenance manual
```

A person immediately sees the relation.

A purely lexical system sees:

```text
car        != automobile
repair     != maintenance
```

This is a major limitation of lexical retrieval.

Another example:

```text
Query:
heart attack treatment

Document:
therapy for myocardial infarction
```

Again, the meaning is related but the vocabulary differs.

### Main point

TF-IDF and BM25 are powerful, but fundamentally rely on lexical evidence. They do not inherently know that:

```text
car ≈ automobile
doctor ≈ physician
cheap ≈ inexpensive
```

This motivates techniques that alter or reinterpret the query.

---

# Part II — Query expansion

## 10–20 min

Query expansion means adding terms to the original query.

For example:

```text
original query:
car repair

expanded query:
car automobile repair maintenance
```

The hope is to improve recall.

## Why expand queries?

A short query provides very little evidence. Expansion can help retrieve documents that use different vocabulary.

Possible sources include:

```text
thesauri
synonym dictionaries
ontologies
WordNet
user-selected relevant documents
top-ranked retrieved documents
historical query logs
```

For this seminar, focus on:

```text
relevance feedback
+
pseudo-relevance feedback
```

because they connect directly to information retrieval.

---

# Query expansion can fail

Consider:

```text
query:
jaguar speed
```

Possible expansion terms:

```text
car
engine
animal
cat
wildlife
```

If the user meant the animal, adding vehicle-related terms creates **query drift**.

## Query drift

Query drift happens when expansion changes the meaning of the original information need.

Example:

```text
original:
python memory

bad expansion:
python programming language snake reptile memory
```

The expanded query mixes unrelated senses.

### Main point

Query expansion is not automatically beneficial. The source and weighting of expansion terms matter.

---

# Part III — Relevance feedback

## 20–35 min

Relevance feedback uses information about which retrieved documents are relevant.

The basic loop is:

```text
query
  ↓
retrieve documents
  ↓
user marks relevant / non-relevant
  ↓
modify query
  ↓
retrieve again
```

This is one of the classical interactive ideas in IR.

---

# Explicit relevance feedback

The user tells the system:

```text
D1 relevant
D2 not relevant
D3 relevant
```

The system uses these labels to move the query toward relevant documents and away from non-relevant ones.

---

# Vector-space intuition

Recall the vector-space model:

```text
query vector
document vectors
```

If relevant documents cluster in one area of the vector space, we can move the query vector toward them.

If non-relevant documents cluster elsewhere, we can move away from them.

---

# Rocchio algorithm

A classical formulation is:

\[
\vec{q}_{new}
=
\alpha \vec{q}_{old}
+
\frac{\beta}{|D_r|}
\sum_{d \in D_r}
\vec{d}
-
\frac{\gamma}{|D_{nr}|}
\sum_{d \in D_{nr}}
\vec{d}
\]

where:

- \(\vec{q}_{old}\) = original query vector;
- \(D_r\) = relevant documents;
- \(D_{nr}\) = non-relevant documents;
- \(\alpha\) = weight of original query;
- \(\beta\) = weight of relevant documents;
- \(\gamma\) = weight of non-relevant documents.

---

# Interpret Rocchio geometrically

Explain:

```text
original query
      ↓
move toward relevant-document centroid
      ↓
move away from non-relevant-document centroid
      ↓
new query
```

This is more important than memorizing the formula.

---

# Small example

Suppose:

```text
query vector:
[1.0, 0.0]

relevant-document centroid:
[0.6, 0.8]

non-relevant centroid:
[0.1, 0.9]
```

The new query should move:

```text
toward [0.6, 0.8]
away from [0.1, 0.9]
```

The resulting query can contain terms that were not present originally.

That is the expansion effect.

---

# What does Rocchio really do?

It does two things:

```text
1. reweights original query terms
2. introduces terms from relevant documents
```

So relevance feedback is not simply:

```text
append synonyms
```

It changes the query representation.

---

# Part IV — Pseudo-relevance feedback

## 35–42 min

Explicit feedback is useful, but it requires user effort.

Pseudo-relevance feedback removes that requirement.

The system assumes:

> The top-ranked documents are probably relevant.

Then it uses them as feedback automatically.

---

# PRF pipeline

```text
original query
      ↓
initial retrieval
      ↓
top-k documents
      ↓
assume relevant
      ↓
extract useful terms
      ↓
expanded query
      ↓
retrieve again
```

---

# Example

Original query:

```text
aircraft wing drag
```

Top-ranked documents contain terms such as:

```text
aerodynamic
airfoil
lift
flow
wing
drag
```

Possible expanded query:

```text
aircraft wing drag aerodynamic airfoil flow
```

This may retrieve relevant documents that did not contain the original wording.

---

# Strength and weakness of PRF

## Strength

No user interaction is required.

## Weakness

If the initial retrieval is poor:

```text
bad top documents
      ↓
bad expansion terms
      ↓
even worse query
```

This is another form of query drift.

---

# First-half recap

## 42–45 min

Put this on the board:

```text
Vocabulary mismatch
      ↓
Query expansion
      ↓
Relevance feedback
      ↓
Rocchio
      ↓
Pseudo-relevance feedback
```

Then transition:

> Instead of modifying the query, can we build a probabilistic model of the document and ask how likely it is to produce the query?

That leads to language-model retrieval.

---

# Part V — Language-model view of retrieval

## 45–57 min

A **language model** assigns probabilities to terms or sequences.

For classical IR, we can build a language model for each document.

Then ask:

> How likely is this document model to generate the query?

This is the **query-likelihood model**.

---

# Core idea

For document \(d\), define a language model:

\[
P(w \mid d)
\]

for words \(w\).

Given query:

\[
q = w_1, w_2, \ldots, w_n
\]

score the document by:

\[
P(q \mid d)
\]

Under a simple independence assumption:

\[
P(q \mid d)
=
\prod_{i=1}^{n}
P(w_i \mid d)
\]

---

# Interpretation

Suppose the query is:

```text
wing drag
```

A document receives a high score if its language model assigns high probability to:

```text
wing
drag
```

So instead of asking:

```text
How similar are query and document vectors?
```

we ask:

```text
How likely is the query under the document's term distribution?
```

---

# Maximum-likelihood estimate

A simple estimate is:

\[
P(w \mid d)
=
\frac{tf(w,d)}{|d|}
\]

where:

- \(tf(w,d)\) = frequency of word \(w\) in document \(d\);
- \(|d|\) = document length.

---

# Example

Document:

```text
wing wing drag flow
```

Then:

```text
P(wing | d) = 2/4
P(drag | d) = 1/4
P(flow | d) = 1/4
```

For query:

```text
wing drag
```

we get:

\[
P(q \mid d)
=
P(wing \mid d)
P(drag \mid d)
\]

\[
=
\frac{2}{4}
\cdot
\frac{1}{4}
=
0.125
\]

---

# Part VI — The zero-probability problem

## 57–70 min

Suppose the document is:

```text
wing wing flow
```

Query:

```text
wing drag
```

Then:

\[
P(drag \mid d)=0
\]

Therefore:

\[
P(q \mid d)=0
\]

Even if the document is otherwise highly relevant.

This is a serious problem.

---

# Why zeros are dangerous

Because probabilities are multiplied:

```text
one unseen query term
→ total query likelihood becomes zero
```

So the model becomes too brittle.

We need **smoothing**.

---

# Smoothing intuition

Smoothing says:

> Even if a word does not occur in this document, give it some probability based on the collection.

We combine:

```text
document evidence
+
collection evidence
```

---

# Collection language model

Define:

\[
P(w \mid C)
=
\frac{tf(w,C)}{|C|}
\]

where:

- \(tf(w,C)\) = total occurrences of \(w\) in the collection;
- \(|C|\) = total number of tokens in the collection.

Common collection terms receive some background probability.

---

# Jelinek–Mercer smoothing

A simple formulation is:

\[
P(w \mid d)
=
(1-\lambda)
P_{ML}(w \mid d)
+
\lambda
P(w \mid C)
\]

where:

- \(P_{ML}(w \mid d)\) = document maximum-likelihood estimate;
- \(P(w \mid C)\) = collection probability;
- \(\lambda\) controls how much we trust the collection.

---

# Interpretation of lambda

If:

```text
lambda = 0
```

then:

```text
use only the document
```

If:

```text
lambda = 1
```

then:

```text
ignore the document entirely
```

In practice we choose something between them.

---

# Why log probabilities?

Query probabilities can become extremely small:

\[
0.01 \cdot 0.03 \cdot 0.02 \cdot \ldots
\]

Instead of multiplying probabilities, use log probabilities:

\[
\log P(q \mid d)
=
\sum_{w \in q}
\log P(w \mid d)
\]

This is numerically more stable.

---

# Part VII — Short Cranfield demo

## 70–80 min

Use the same Cranfield dataset as previous labs.

```python
import ir_datasets

dataset = ir_datasets.load("cranfield")
docs = list(dataset.docs_iter())
queries = list(dataset.queries_iter())
```

Prepare documents:

```python
texts = [
    f"{doc.title} {doc.text}".lower().split()
    for doc in docs
]

doc_ids = [doc.doc_id for doc in docs]
titles = [doc.title for doc in docs]
```

---

# Build collection statistics

```python
from collections import Counter

collection_counts = Counter()

for tokens in texts:
    collection_counts.update(tokens)

collection_length = sum(
    collection_counts.values()
)
```

---

# Query-likelihood scoring

A compact teaching implementation:

```python
import math
from collections import Counter

def collection_prob(term):
    return (
        collection_counts[term]
        / collection_length
    )

def query_likelihood_score(
    query,
    doc_tokens,
    lam=0.2
):
    doc_counts = Counter(doc_tokens)
    doc_len = len(doc_tokens)

    score = 0.0

    for term in query.lower().split():
        p_doc = (
            doc_counts[term] / doc_len
            if doc_len > 0
            else 0.0
        )

        p_collection = collection_prob(term)

        p = (
            (1 - lam) * p_doc
            + lam * p_collection
        )

        if p > 0:
            score += math.log(p)
        else:
            return float("-inf")

    return score
```

---

# Search function

```python
def search_ql(query, k=5):
    scored = []

    for i, tokens in enumerate(texts):
        score = query_likelihood_score(
            query,
            tokens,
            lam=0.2
        )

        scored.append((score, i))

    top = sorted(
        scored,
        reverse=True
    )[:k]

    return [
        (
            doc_ids[i],
            titles[i],
            score
        )
        for score, i in top
    ]
```

Run one Cranfield query:

```python
q = queries[0].text

print(q)

for result in search_ql(q):
    print(result)
```

---

# What to explain during the demo

Focus on the conceptual pipeline:

```text
document
   ↓
term distribution
   ↓
smoothed document language model

query
   ↓
probability under each document model
   ↓
ranking
```

Do not spend class time optimizing this implementation.

---

# Part VIII — Compare the retrieval paradigms

## 80–86 min

At this point students have seen three classical retrieval views.

## TF-IDF / cosine

```text
query and document
→ vectors
→ geometric similarity
```

## BM25

```text
query-document term overlap
+
IDF
+
TF saturation
+
length normalization
```

## Query likelihood

```text
one language model per document
→ probability of generating query
```

These are different mathematical views of the same broad problem:

\[
\text{rank documents for a query}
\]

---

# One useful comparison table

| Method | Main interpretation |
|---|---|
| TF-IDF + cosine | vector similarity |
| BM25 | weighted lexical relevance |
| Query likelihood | probability of query under document model |
| Rocchio / PRF | modify query using feedback |

---

# Part IX — Bridge to dense retrieval

## 86–90 min

Classical query expansion tries to solve vocabulary mismatch by adding words:

```text
car
→ automobile
```

Dense retrieval will attack the same problem differently.

Instead of changing the query text, we map both query and document into learned vectors:

```text
query
   ↓
embedding

document
   ↓
embedding
```

Then retrieve based on semantic similarity.

This is the key transition:

```text
classical lexical retrieval
      ↓
query expansion / language models
      ↓
semantic representations
      ↓
dense retrieval
```

---

# Connection to RAG

RAG systems often fail because:

```text
the retriever does not find the right evidence
```

Vocabulary mismatch is one reason.

Classical methods try to fix this using:

```text
query expansion
feedback
probabilistic term models
```

Modern RAG systems may additionally use:

```text
dense retrieval
hybrid retrieval
query rewriting
multi-query retrieval
reranking
```

The problem is old.

The tools have changed.

---

# Final summary

End with this sequence:

```text
Problem:
user and document use different words
        ↓
Query expansion
        ↓
Relevance feedback
        ↓
Pseudo-relevance feedback
        ↓
Language-model retrieval
        ↓
Smoothing
        ↓
Next:
semantic / dense retrieval
```

---

# Five points students should remember

1. Lexical retrieval can fail because users and documents use different vocabulary.
2. Query expansion can improve recall, but poor expansion can cause query drift.
3. Relevance feedback moves the query toward relevant documents and away from non-relevant ones.
4. Query-likelihood retrieval ranks documents by how likely their language models are to generate the query.
5. Smoothing is essential because unseen query terms otherwise produce zero probability.

---

# Optional after-class exercise

Use Cranfield and compare:

```text
BM25
vs
Query Likelihood
```

for five queries.

For each query:

1. print the top five results from each system;
2. identify where the rankings differ;
3. inspect whether vocabulary mismatch appears to explain the difference;
4. do not claim one method is better without using the evaluation framework from Lab 05.

---

# Optional pseudo-relevance-feedback exercise

Take one Cranfield query.

1. Retrieve the top 3 BM25 documents.
2. Find their highest-weight TF-IDF terms.
3. Add 2–3 new terms to the query.
4. Run retrieval again.
5. Compare the ranking before and after expansion.

Questions:

```text
Did the query become more specific?
Did it drift?
Did new relevant-looking documents appear?
```

---

# Suggested dependencies

```bash
pip install ir_datasets numpy scikit-learn
```

No additional large-model dependencies are required.

That is intentional: this seminar should remain focused on classical IR concepts.

---

# Suggested reading

Christopher D. Manning, Prabhakar Raghavan, Hinrich Schütze.  
*Introduction to Information Retrieval.*

Relevant topics:

- relevance feedback;
- query expansion;
- Rocchio;
- language models for information retrieval.

Book:

- https://nlp.stanford.edu/IR-book/

---

# Dataset reference

Cranfield:

- https://ir-datasets.com/cranfield.html

---

# Bridge to Lab 08

At this point, students have seen:

```text
Lab 04
lexical ranking

Lab 05
evaluation

Lab 06
web crawling + link analysis

Lab 07
query expansion + probabilistic retrieval
```

Lab 08 can now ask:

> What if we represent meaning directly rather than relying mainly on lexical overlap?

That leads naturally to:

```text
embeddings
semantic similarity
dense retrieval
```

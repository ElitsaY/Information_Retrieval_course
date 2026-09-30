# Lab 08 — Neural Text Representations: Embeddings, Encoders, Transformers, and Semantic Search

> **Format:** 90-minute lecturer-led seminar  
> **Structure:** 2 × 45 minutes  
> **Audience:** Master's students in Information Retrieval  
> **Prerequisites:** classical IR concepts from Labs 01–07; **no prior Transformer knowledge assumed**  
> **Style:** conceptual explanation + small worked examples + short live demo  
> **Main themes:** tokens, embeddings, contextual representations, self-attention, Transformer encoders/decoders, pooling, sentence embeddings

---

## Seminar goal

Until now, students have represented text using explicit lexical features:

```text
TF-IDF
BM25
language-model term probabilities
```

In modern neural retrieval, we instead use learned vector representations.

But writing:

```python
embedding = model.encode(text)
```

without explaining what an encoder is leaves a conceptual gap.

This seminar fills that gap.

The central progression is:

```text
text
  ↓
tokens
  ↓
token embeddings
  ↓
Transformer
  ↓
contextual token representations
  ↓
pooling / projection
  ↓
one vector for the text
```

By the end of the session, students should understand where a sentence embedding comes from and how an encoder differs from a generative LLM.

---

# Learning objectives

By the end of the seminar, students should be able to explain:

- the difference between sparse lexical vectors and learned dense vectors;
- what tokenization does;
- what a token embedding is;
- why token embeddings alone are not contextual;
- the intuition behind self-attention;
- what a Transformer layer does at a high level;
- what an encoder is;
- the difference between encoder-only, decoder-only, and encoder–decoder Transformers;
- how contextual token vectors become a single sentence/document embedding;
- why a generic Transformer is not automatically a good retrieval model;
- why bi-encoders are useful for retrieval.

---

# Session plan

## First 45 minutes

| Time | Topic |
|---|---|
| 0–10 min | From TF-IDF vectors to learned vectors |
| 10–20 min | Tokens and token embeddings |
| 20–35 min | Self-attention and contextual representations |
| 35–42 min | Transformer layers |
| 42–45 min | First-half recap |

## Second 45 minutes

| Time | Topic |
|---|---|
| 45–57 min | What is an encoder? Encoder vs decoder |
| 57–67 min | Pooling and sentence embeddings |
| 67–78 min | Bi-encoders for retrieval |
| 78–86 min | Small embedding demo |
| 86–90 min | Bridge to dense retrieval |

---

# Part I — From TF-IDF vectors to learned vectors

## 0–10 min

Start with a representation students already know.

A TF-IDF vector might look like:

```text
[0, 0.72, 0, 1.31, 0, ...]
```

Each dimension corresponds to a vocabulary term.

For example:

```text
dimension 1 → aircraft
dimension 2 → wing
dimension 3 → drag
...
```

This is:

```text
high-dimensional
sparse
interpretable
lexical
```

---

# Learned dense vectors

A neural text representation might look like:

```text
[0.13, -0.41, 0.08, 0.67, ...]
```

Most dimensions are non-zero.

The dimensions do not directly correspond to individual words.

Instead, the representation is learned from data.

This raises the important question:

> Where do these numbers actually come from?

---

# Sparse vs dense

| Property | Sparse lexical vector | Learned dense vector |
|---|---|---|
| Dimensions | vocabulary terms | learned features |
| Typical size | tens of thousands | hundreds to a few thousand |
| Mostly zeros | yes | no |
| Easy to interpret directly | relatively | usually not |
| Handles exact terms well | yes | variable |
| Can capture semantic similarity | limited | often better |

---

# A warning

Do not say:

```text
dense vector = meaning
```

A dense vector is a learned representation.

Its usefulness depends on:

```text
training data
training objective
model architecture
domain
```

---

# Part II — Tokens and token embeddings

## 10–20 min

Neural models do not consume raw strings directly.

They consume **tokens**.

Start with:

```text
"retrieval systems are useful"
```

A simple tokenizer might give:

```text
["retrieval", "systems", "are", "useful"]
```

Modern language models often use subword tokens instead.

Conceptually:

```text
"retrieval"
→ ["retriev", "al"]
```

The exact split depends on the tokenizer.

---

# Tokens become IDs

A tokenizer maps tokens to integer IDs:

```text
"retriev" → 18423
"al"      → 317
```

The model does not treat the integer itself as meaning.

The integer is used to look up a vector.

---

# Token embeddings

Each token ID maps to a learned vector:

\[
token_i
\rightarrow
e_i \in \mathbb{R}^{d}
\]

For example:

```text
"bank"
→ [0.12, -0.31, ..., 0.44]
```

This initial vector is a **token embedding**.

---

# Token embedding is not yet contextual

Consider:

```text
river bank
```

and:

```text
bank account
```

The token `bank` begins from the same or very similar lookup embedding.

But its meaning depends on context.

We need a mechanism that lets surrounding tokens change the representation.

That is the role of the Transformer.

---

# Part III — Self-attention

## 20–35 min

Use a sentence where context matters:

```text
The animal did not cross the street because it was tired.
```

Ask:

> When the model processes `it`, which earlier words matter?

Likely:

```text
animal
```

matters more than:

```text
street
```

Self-attention lets each token gather information from other tokens.

---

# High-level intuition

For each token, the model asks:

```text
Which other tokens should influence my new representation?
```

Then it combines information from them.

So:

```text
initial token vectors
        ↓
self-attention
        ↓
context-aware token vectors
```

---

# Query, Key, Value

The standard formulation introduces:

\[
Q = XW_Q
\]

\[
K = XW_K
\]

\[
V = XW_V
\]

and:

\[
Attention(Q,K,V)
=
softmax
\left(
\frac{QK^\top}{\sqrt{d_k}}
\right)V
\]

Students do **not** need to derive this formula.

They should understand the roles conceptually.

---

# Intuitive interpretation

For one token:

```text
Query:
What information am I looking for?

Key:
What information could this other token offer?

Value:
What information should actually be passed forward?
```

The Query–Key comparison determines how much attention one token gives another.

The weighted Values are then combined.

---

# Tiny conceptual example

Sentence:

```text
The cat sat on the mat because it was tired.
```

When updating `it`, the model may assign larger attention weights to:

```text
cat
```

than to:

```text
mat
```

The resulting representation of `it` contains contextual information.

---

# Contextual representation

Before the Transformer:

```text
bank
→ one initial embedding
```

After contextual processing:

```text
bank in "river bank"
→ representation A

bank in "bank account"
→ representation B
```

That is one of the most important ideas in modern NLP.

---

# Multi-head attention

Transformers usually use multiple attention heads.

Conceptually, different heads can learn different interaction patterns.

Do not oversell interpretability.

A useful mental model is simply:

```text
multiple attention mechanisms
operate in parallel
then their information is combined
```

---

# Part IV — Transformer layers

## 35–42 min

A Transformer contains repeated layers.

Conceptually:

```text
token embeddings
      ↓
Transformer layer
      ↓
Transformer layer
      ↓
Transformer layer
      ↓
contextual token representations
```

Each layer refines the representations.

---

# Inside a layer

At a high level:

```text
self-attention
      ↓
feed-forward network
      ↓
residual connections + normalization
```

You do not need to derive every component.

The key point is:

> A Transformer repeatedly lets tokens interact and transforms their representations.

---

# Position matters

A Transformer also needs information about token position.

Otherwise:

```text
dog bites man
```

and:

```text
man bites dog
```

would contain the same bag of token embeddings.

Different Transformer families encode position in different ways.

For this course, the important fact is simply:

```text
token identity + position + context
→ contextual representation
```

---

# First-half recap

## 42–45 min

Put this on the board:

```text
text
 ↓
tokenizer
 ↓
token IDs
 ↓
initial token embeddings
 ↓
Transformer
 ↓
contextual token vectors
```

Then ask:

> We now have one vector per token. How do we get one vector for an entire query or document?

That is where encoders and pooling enter.

---

# Part V — What is an encoder?

## 45–57 min

Use a very plain definition:

> An encoder is a model that consumes an input and returns a representation of that input.

For retrieval:

\[
Encoder(text)
\rightarrow
\mathbb{R}^{d}
\]

Example:

```python
vector = encoder(
    "how to repair a car"
)
```

The goal is a representation that can later be compared with document representations.

---

# Encoder does not mean generator

This distinction matters.

An encoder is often used to produce a representation:

```text
text
 ↓
encoder
 ↓
vector
```

A generative model instead repeatedly predicts output tokens.

---

# Three broad Transformer families

| Architecture | Main role | Example family |
|---|---|---|
| Encoder-only | represent / understand input | BERT |
| Decoder-only | generate autoregressively | GPT-style models |
| Encoder–decoder | transform one sequence into another | T5 |

These are broad architectural categories, not rigid task boundaries.

---

# Encoder-only Transformer

Conceptually:

```text
input tokens
     ↓
Transformer encoder
     ↓
contextual representations
```

Useful for tasks such as:

```text
classification
token labeling
retrieval embeddings
reranking components
```

---

# Decoder-only Transformer

A decoder-style language model predicts the next token from previous tokens:

\[
P(x_t \mid x_1,\ldots,x_{t-1})
\]

Generation is approximately:

```text
prompt
 ↓
predict next token
 ↓
append token
 ↓
predict next token
 ↓
append token
 ↓
...
```

This is the conceptual model students will need for RAG.

---

# Encoder–decoder Transformer

Conceptually:

```text
input sequence
      ↓
encoder
      ↓
internal representations
      ↓
decoder
      ↓
output sequence
```

Historically common in:

```text
translation
summarization
sequence-to-sequence tasks
```

---

# Part VI — From token vectors to one text vector

## 57–67 min

After a Transformer, we normally have:

\[
h_1,h_2,\ldots,h_n
\]

one contextual representation per token.

But retrieval often wants:

\[
E(text)
\in
\mathbb{R}^{d}
\]

one vector for the whole text.

So we need a pooling strategy.

---

# Mean pooling

A simple strategy is:

\[
E(text)
=
\frac{1}{n}
\sum_{i=1}^{n} h_i
\]

This averages the token representations.

---

# Other strategies

Possible approaches include:

```text
mean pooling
special-token representation
weighted pooling
learned pooling
```

The exact choice depends on the model.

---

# Sentence embedding pipeline

This is the diagram students should remember:

```text
text
 ↓
tokenizer
 ↓
token embeddings
 ↓
Transformer
 ↓
contextual token vectors
 ↓
pooling
 ↓
sentence embedding
```

---

# Why not use any Transformer?

A generic Transformer representation is not automatically optimized so that:

```text
semantically similar sentence
→ nearby vector
```

Retrieval models are usually trained with an objective that explicitly encourages useful geometry.

For example:

```text
similar / relevant pairs
→ move closer

irrelevant pairs
→ move farther apart
```

This is why a model specifically trained for sentence embeddings or retrieval is usually preferable to taking arbitrary hidden states from a generic model.

---


# Semantic search: what changes?

At this point we can define **semantic search** clearly.

Lexical search asks mainly:

```text
Do the query and document share useful words?
```

Semantic search asks:

```text
Are the query and document close in a learned representation space?
```

For example:

```text
query:
car repair

document:
automobile maintenance
```

A lexical system may see weak term overlap.

A semantic-search system may still assign high similarity because the encoder maps the two texts to nearby vectors.

Conceptually:

\[
q \rightarrow E(q)
\]

\[
d \rightarrow E(d)
\]

then:

\[
score(q,d)=sim(E(q),E(d))
\]

This is not a separate magical search paradigm.

It is still ranked retrieval.

The main difference is the representation used to compute the score.

---

# Lexical vs semantic search

| Question | Lexical search | Semantic search |
|---|---|---|
| Main signal | term overlap | embedding similarity |
| Representation | sparse term vector | dense learned vector |
| Good at exact identifiers | usually yes | variable |
| Good at paraphrases | limited | often better |
| Needs learned model | no | yes |
| Typical methods | BM25, TF-IDF | bi-encoder + vector search |

A useful course-level view is:

```text
lexical search
→ retrieve by words

semantic search
→ retrieve by learned representations
```

Later we will combine both.

---

# Part VII — Bi-encoders

## 67–78 min

A **bi-encoder** encodes query and document independently.

```text
query
  ↓
encoder
  ↓
q vector

document
  ↓
encoder
  ↓
d vector
```

Then compute:

\[
score(q,d)
=
sim(q,d)
\]

For example:

\[
score(q,d)
=
\cos(E(q),E(d))
\]

---

# Why bi-encoders are efficient

Documents can be encoded once:

```text
documents
   ↓
encoder
   ↓
stored vectors
```

At query time:

```text
query
 ↓
encoder
 ↓
query vector
 ↓
compare with stored vectors
```

This makes large-scale retrieval possible.

---

# Same encoder or two encoders?

Some systems use the same model for both sides.

Others use:

```text
query encoder
document encoder
```

with separate parameters or roles.

The core idea remains:

```text
encode independently
compare vectors
```

---

# Important limitation

A bi-encoder compresses each text before comparison.

The query and document do not directly interact token-by-token.

This is efficient, but some fine-grained relevance signals may be lost.

That limitation will motivate cross-encoder reranking in Lab 10.

---

# Part VIII — Small live demo

## 78–86 min

Use a sentence-embedding model.

```bash
pip install sentence-transformers
```

Example:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)
```

Use:

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
one row
→ one text embedding
```

---

# Semantic similarity

```python
query = "car repair"

q = model.encode(
    [query],
    normalize_embeddings=True
)

scores = q @ embeddings.T
```

Print ranked results.

Before running it, ask students which sentence should rank highest.

---

# What not to claim

Do not say:

```text
the model understands meaning perfectly
```

Embeddings can fail on:

```text
negation
numbers
rare entities
specialized terminology
domain shift
long text
ambiguous queries
```

A learned representation is useful, not magical.

---

# Part IX — Bridge to Lab 09

## 86–90 min

At this point, students understand where dense vectors come from.

The next step is retrieval.

```text
query
   ↓
encoder
   ↓
query embedding

documents
   ↓
encoder
   ↓
document embeddings

query vector
   ↓
nearest-neighbor search
   ↓
top documents
```

Lab 09 will focus on:

```text
dense passage retrieval
similarity functions
exact nearest-neighbor search
vector indexes
FAISS
approximate nearest neighbors
recall / latency / memory trade-offs
```

---

# Five points students should remember

1. A token embedding is only the starting representation; a Transformer makes it contextual.
2. Self-attention lets tokens use information from other tokens.
3. An encoder maps text to a representation; a decoder-style LLM generates tokens autoregressively.
4. Sentence embeddings require a way to turn contextual token vectors into one text vector.
5. Retrieval models are trained so that vector geometry is useful for relevance or semantic similarity.

---

# Optional after-class exercise

Encode:

```text
car repair
automobile maintenance
banana nutrition
heart attack treatment
therapy for myocardial infarction
```

Create a pairwise cosine-similarity matrix.

Then construct examples containing:

```text
negation
numbers
rare names
acronyms
```

and inspect where the embedding model behaves unexpectedly.

---

# Suggested reading

For the course, students do not need a full deep-learning derivation.

Useful conceptual references:

- Vaswani et al., *Attention Is All You Need*
- Devlin et al., *BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding*
- Reimers & Gurevych, *Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks*

The goal is architectural understanding, not reproduction of model training.

---

# Course progression

```text
Labs 01–07
classical IR
      ↓
Lab 08
how neural text representations are produced
      ↓
Lab 09
how those representations are used for dense retrieval
      ↓
Lab 10
hybrid retrieval + reranking
      ↓
Lab 11
RAG
```

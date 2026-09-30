# Lab 01 Quiz — Inverted Indexes, Boolean Retrieval, and Design Trade-offs

**Course:** Information Retrieval / AI  
**Lab:** 01 — Inverted Index and Boolean Queries  
**Source lab:** https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab01-inverted-index.html  
**Format:** Automatically gradable; 25 questions; 1 point each  
**Recommended time:** 30–40 minutes

## Instructions

- Unless stated otherwise, choose **one** answer.
- For **Select all that apply**, all correct options and no incorrect options are required.
- For set-valued answers, order does not matter.
- Assume document IDs start at `0`.
- Assume postings lists are sorted unless the question explicitly says otherwise.
- Do not execute code unless your instructor explicitly allows it.

---

## Part A — From Documents to Terms

### Q01 — Token or term?

A document contains:

```text
Friends, FRIENDS!
```

The indexing pipeline tokenizes, removes punctuation, and lower-cases.

Which statement is correct?

- A. The document has one token and two terms.
- B. The document has two token occurrences that map to one dictionary term, `friends`.
- C. The document has two dictionary terms, `Friends` and `FRIENDS`.
- D. Lower-casing changes token frequency from 2 to 1.

---

### Q02 — What information survives inversion?

Consider this row from a **term-document frequency** matrix:

| term = `alpha` | D0 | D1 | D2 | D3 | D4 |
|---|---:|---:|---:|---:|---:|
| count | 1 | 0 | 2 | 0 | 1 |

Which postings representation preserves all information in this row?

- A. `[0, 2, 4]`
- B. `[(0, 1), (2, 1), (4, 1)]`
- C. `[(0, 1), (1, 0), (2, 2), (3, 0), (4, 1)]`
- D. `[(0, 1), (2, 2), (4, 1)]`

---

### Q03 — An “incidence” matrix contains a `2`

The lab calls the toy table an incidence matrix, but its implementation uses:

```python
sent.count(token)
```

Suppose a cell contains `2`. What does that mean?

- A. The term occurs in two different documents.
- B. The term occurs twice in that document.
- C. The document contains two distinct terms.
- D. The matrix is invalid because incidence matrices can contain only `0` and `1`.

---

### Q04 — `df` versus collection frequency

After preprocessing:

```text
D0: ai ai retrieval
D1: ai index
D2: retrieval
```

For the term `ai`, give:

```text
(document_frequency, total_collection_frequency)
```

Answer format: `(x, y)`

---

### Q05 — Why does `document_frequency` use `set(document)`?

The lab uses the equivalent of:

```python
for document in documents:
    for token in set(document):
        df[token] += 1
```

What would happen if `set(document)` were replaced by `document`?

- A. Nothing; the two programs are equivalent.
- B. The code would count term occurrences instead of documents containing the term.
- C. Rare terms would disappear from the dictionary.
- D. Postings would no longer be sorted.

---

### Q06 — The “most frequent words” are headers

In the `sci.crypt` collection, terms such as `path`, `message-id`, `from`, and `subject` appear in almost every post.

Suppose the product requirement is:

> “Search the semantic content of messages, but still support queries restricted to sender or subject.”

Which design best fits the requirement?

- A. Delete all headers before indexing.
- B. Mix headers and body into one undifferentiated field.
- C. Index body and metadata as separate zones/fields.
- D. Remove every term with document frequency above 90%.

---

### Q07 — Case folding is not free

Lower-casing maps both the country abbreviation `US` and the pronoun `us` to `us`.

Which trade-off does this illustrate?

- A. Lower-casing can improve matching/recall but may reduce precision by merging distinct meanings.
- B. Lower-casing always improves both precision and recall.
- C. Lower-casing changes document frequency but never query results.
- D. Lower-casing is only a storage optimization.

---

### Q08 — Stop words versus phrase search

A system removes the terms `to`, `be`, `or`, and `not` from its index entirely.

Which query becomes impossible to answer **exactly from that index alone**?

- A. `cryptography AND key`
- B. `"to be or not to be"`
- C. `retrieval OR search`
- D. `index AND NOT matrix`

---

### Q09 — Stems do not need to be words

Porter stemming may produce forms such as `bu` from `bus`.

Which statement is most accurate?

- A. This proves the stemmer is incorrect.
- B. A stem is useful only if it is a valid English dictionary word.
- C. A stem can be an artificial symbol; matching related surface forms is the important property.
- D. Stemming guarantees higher precision and higher recall simultaneously.

---

### Q10 — Punctuation filtering buglet

The lab filters punctuation using:

```python
_tok not in string.punctuation
```

Recall that `string.punctuation` is one string containing individual punctuation characters.

What is the most likely outcome for the token `...`?

- A. It is removed because it contains punctuation.
- B. It survives because the exact substring `...` is not present in `string.punctuation`.
- C. It becomes `.`.
- D. It is converted to an empty string.

---

## Part B — Building the Index Correctly

### Q11 — Why can sorting only by token work here?

Pairs are emitted in document order and then sorted with:

```python
sorted(token_docid, key=itemgetter(0))
```

Why can postings for a term still end up in increasing document-ID order?

- A. Python dictionaries automatically sort document IDs.
- B. Python's sort is stable, so equal-token pairs preserve their original document order.
- C. `itemgetter(0)` secretly sorts by both fields.
- D. Document IDs are irrelevant to merge-based Boolean retrieval.

---

### Q12 — Make the construction more robust

You want correctness to **not depend** on sort stability or the original pair order.

Which sort key is the safest replacement?

- A. `key=lambda x: x[1]`
- B. `key=lambda x: len(x[0])`
- C. `key=lambda x: (x[0], x[1])`
- D. `key=lambda x: x[::-1]`

---

### Q13 — Reproducibility versus correctness

The lab assigns document IDs using `enumerate(os.listdir(...))`.

On another machine, `os.listdir` returns files in a different order.

Assuming the index and the `doc_id → filename` map are built consistently in that run, what is the main consequence?

- A. Boolean retrieval becomes mathematically incorrect.
- B. Document IDs may differ across runs, harming reproducibility of exact IDs but not necessarily retrieval semantics.
- C. Document frequency becomes zero for every term.
- D. Postings lists become unsorted automatically.

---

## Part C — Boolean Query Processing

### Q14 — Read the merge

Two postings lists are:

```text
A: 1 → 4 → 7 → 9 → 13
B: 2 → 4 → 6 → 9 → 12
```

What is `A AND B`?

- A. `{1, 2, 4, 6, 7, 9, 12, 13}`
- B. `{4, 9}`
- C. `{1, 7, 13}`
- D. `{2, 6, 12}`

---

### Q15 — Count pointer comparisons

Use the standard two-pointer `AND` merge:

```text
A: 1 → 4 → 7 → 9 → 13
B: 2 → 4 → 6 → 9 → 12
```

Count one comparison each time the algorithm compares the two current document IDs.

How many document-ID comparisons are made before one list ends?

Answer with one integer.

---

### Q16 — Query planning for a conjunction

A query is:

```text
a AND b AND c AND d
```

with document frequencies:

| term | df |
|---|---:|
| a | 900 |
| b | 40 |
| c | 12 |
| d | 400 |

Which processing order follows the lab's recommended heuristic?

- A. `a, d, b, c`
- B. `c, b, d, a`
- C. `a, b, c, d`
- D. Order never matters for runtime because `AND` is commutative.

---

### Q17 — Why can a rare term terminate a query early?

Consider:

```text
alpha AND beta AND gamma
```

The dictionary says `df(beta) = 0`.

What is the correct result?

- A. Evaluate `alpha` and `gamma`; `beta` can be ignored.
- B. The result is empty without reading the other postings lists.
- C. Replace `beta` with its closest spelling.
- D. The query is equivalent to `alpha OR gamma`.

---

### Q18 — Why is a lone `NOT` expensive?

A collection has `N = 1,000,000` documents and `df(x) = 10`.

The query is:

```text
NOT x
```

If the system must explicitly return all matching document IDs, what is the asymptotic cost?

- A. `O(1)`
- B. `O(log 10)`
- C. `O(df(x))`
- D. `O(N)`

---

## Part D — Skip Pointers and Their Limits

### Q19 — When should a skip be taken?

Current merge state:

```text
A: 1 → 4 → 7 → 10 → 13
   └────→ 7          # skip from 1 to 7

B current document ID = 8
A current document ID = 1
```

Using the lab's rule, what should the algorithm do?

- A. Take the skip from `1` to `7`.
- B. Advance from `1` to `4`; skip targets must be strictly greater than `8`.
- C. Jump directly to `10`.
- D. Stop because the lists cannot intersect.

---

### Q20 — Why not use skips for `OR`?

Why are skip pointers generally not useful for an `OR` merge?

- A. `OR` requires unsorted postings.
- B. `OR` must emit every posting from both lists (deduplicated), so skipped postings may still belong in the result.
- C. `OR` is always `O(1)`.
- D. Skip pointers only work on positional indexes.

---

### Q21 — More skip pointers are not always better

Select **all** statements that are true.

- A. More skips consume extra space.
- B. More skips can introduce extra skip comparisons.
- C. Frequent index updates can make skip placement harder to maintain.
- D. Skip pointers guarantee a speedup on modern hardware.
- E. A useful skip layout depends partly on postings-list length.

---

## Part E — Phrase and Positional Retrieval

### Q22 — A false positive from biwords

The query is:

```text
"a b c"
```

A biword index evaluates it as:

```text
"a b" AND "b c"
```

Which document is a **false positive** for this method?

- A. `a b c`
- B. `x a b c y`
- C. `a b x b c`
- D. `a x b x c`

---

### Q23 — Read a positional index

For the query:

```text
"alpha beta"
```

the index contains:

```text
D0: alpha → [1, 5]    beta → [2, 9]
D1: alpha → [3]       beta → [5]
```

Which documents match the exact phrase?

- A. D0 only
- B. D1 only
- C. D0 and D1
- D. Neither

---

### Q24 — Positional index storage pressure

A document has `100,000` terms. A particular term occurs in `0.1%` of positions and occurs nowhere else in the collection.

For that document, compare how many occurrence positions must be stored in a positional index versus how many document postings are needed in a non-positional Boolean index.

Answer format:

```text
(positional_positions, nonpositional_postings)
```

---

### Q25 — Pick an index for the requirement, not by habit

A search system must support all of the following:

1. Boolean queries,
2. exact phrases,
3. arbitrary proximity queries such as “A within 3 words of B”.

Which core representation is required?

- A. A term-document incidence matrix only
- B. A non-positional inverted index only
- C. A biword index only
- D. A positional inverted index

---

# Optional Visual Summary

```text
DOCUMENTS
   │
   ▼
TOKENIZATION
   │   "Friends, Romans" → ["Friends", ",", "Romans"]
   ▼
NORMALIZATION
   │   lower-case / punctuation filtering / optional stemming
   ▼
(token, doc_id) PAIRS
   │
   ▼
SORT ──► MERGE REPEATS ──► SPLIT
                          ├── Dictionary: term → (df, total_tf)
                          └── Postings:   term → [(doc_id, tf), ...]

QUERY TIME
   term A ──► postings A ─┐
                          ├── merge/intersect/union/difference ──► matching docs
   term B ──► postings B ─┘

PHRASE/PROXIMITY
   term → doc_id → [positions...]
```

---

# Instructor Notes

The questions deliberately test implementation assumptions and design trade-offs, not only terminology:

- sparse matrix → inverted representation,
- `df` versus term frequency,
- metadata leakage from headers,
- precision/recall consequences of normalization,
- reproducibility of document IDs,
- reliance on stable sorting,
- merge mechanics and query planning,
- why `NOT` and `OR` behave differently from `AND`,
- when skip pointers help or hurt,
- biword false positives,
- positional-index storage versus capability.

**Student release:** distribute this file as-is.  
**Automatic grading:** use the companion `lab01_quiz_inverted_index_key.json`.

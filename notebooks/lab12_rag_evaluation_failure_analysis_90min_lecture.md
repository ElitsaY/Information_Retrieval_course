# Lab 12 — Evaluating RAG Systems: Retrieval, Faithfulness, and Failure Analysis

> **Format:** 90-minute lecturer-led seminar  
> **Structure:** 2 × 45 minutes  
> **Audience:** Master's students in Information Retrieval  
> **Style:** explanation + worked examples + short live evaluation demo  
> **Main themes:** RAG evaluation, retrieval quality, evidence coverage, faithfulness, answer correctness, citation quality, ablations, failure analysis  
> **Prerequisites:** Lab 05 (IR evaluation), Lab 10 (hybrid retrieval + reranking), Lab 11 (RAG)

---

## Seminar goal

Lab 11 introduced the RAG pipeline:

```text
documents
   ↓
chunk
   ↓
index
   ↓
retrieve
   ↓
rerank
   ↓
select context
   ↓
prompt
   ↓
LLM
   ↓
answer
```

Lab 12 asks:

> **How do we know whether the RAG system is actually good?**

A single end-to-end accuracy number is not enough.

A RAG system can fail because:

```text
the answer was not in the corpus
the chunking was poor
the retriever missed the evidence
the reranker removed it
the prompt contained irrelevant context
the model ignored the evidence
the answer was unsupported
the citation was wrong
```

The central idea of this seminar is:

> **Evaluate the pipeline by stage, not only by final answer quality.**

---

# Learning objectives

By the end of the seminar, students should be able to explain:

- why RAG evaluation is a multi-stage problem;
- how retrieval metrics from classical IR still apply;
- the difference between evidence recall and context precision;
- what answer correctness measures;
- what faithfulness / groundedness measures;
- how citation quality differs from answer correctness;
- why end-to-end answer accuracy can hide retrieval failures;
- why retrieval success does not guarantee generation success;
- how to design a small RAG evaluation set;
- what an ablation study is;
- how to diagnose common RAG failure modes;
- why automated LLM-based evaluators must themselves be treated as imperfect measurement tools.

---

# Session plan

## First 45 minutes

| Time | Topic |
|---|---|
| 0–10 min | Why RAG evaluation is difficult |
| 10–22 min | Retrieval-side evaluation |
| 22–34 min | Generation-side evaluation |
| 34–42 min | Citation and evidence evaluation |
| 42–45 min | First-half recap |

## Second 45 minutes

| Time | Topic |
|---|---|
| 45–58 min | Building an evaluation dataset |
| 58–72 min | Live comparison of two RAG configurations |
| 72–82 min | Failure analysis and debugging |
| 82–87 min | Ablations and LLM-as-judge |
| 87–90 min | Final course synthesis |

---

# Part I — Why RAG evaluation is difficult

## 0–10 min

Suppose a system gives the wrong answer.

Why?

There are many possibilities.

```text
Question
   ↓
Was the information present in the corpus?
   ├── no
   │    → corpus / ingestion failure
   │
   └── yes
        ↓
Was the right chunk created?
   ├── no
   │    → chunking failure
   │
   └── yes
        ↓
Was it retrieved?
   ├── no
   │    → retrieval failure
   │
   └── yes
        ↓
Was it retained after reranking / context selection?
   ├── no
   │    → reranking / context-selection failure
   │
   └── yes
        ↓
Did the model use it correctly?
   ├── no
   │    → generation failure
   │
   └── yes
        ↓
Was the citation correct?
   ├── no
   │    → citation failure
   │
   └── yes
        → success
```

A final answer metric alone cannot tell us which component failed.

---

# RAG evaluation has at least three layers

## 1. Retrieval quality

Did we retrieve the right evidence?

## 2. Generation quality

Did the model answer correctly and stay grounded in the evidence?

## 3. End-to-end quality

Did the whole system satisfy the user's information need?

These should not be collapsed too early.

---

# Example

Question:

```text
How many ECTS credits is the master's thesis worth?
```

Correct evidence exists:

```text
"The master's thesis is worth 30 ECTS credits."
```

Imagine three systems.

### System A

Retrieves the correct passage.

Generates:

```text
The thesis is worth 30 ECTS.
```

### System B

Retrieves the correct passage.

Generates:

```text
The thesis is worth 20 ECTS.
```

### System C

Does not retrieve the correct passage.

Generates:

```text
The thesis is worth 30 ECTS.
```

Only looking at answer correctness:

```text
A → correct
B → wrong
C → correct
```

But C is dangerous.

It produced the correct answer without retrieved support.

This is why RAG evaluation must separate:

```text
correctness
```

from:

```text
grounding
```

---

# Part II — Retrieval-side evaluation

## 10–22 min

Everything from Lab 05 still applies.

For a query \(q\), suppose we know which chunks contain the required evidence.

Let:

```text
Gold evidence:
C4, C11
```

The retriever returns:

```text
C2, C11, C7, C19, C4
```

Then the retrieval system found both supporting chunks within the top 5.

---

# Evidence Recall@k

A useful RAG retrieval metric is:

\[
EvidenceRecall@k
=
\frac{
\text{gold evidence chunks retrieved in top }k
}{
\text{all gold evidence chunks}
}
\]

For the example:

```text
gold:
C4, C11

top 5:
C2, C11, C7, C19, C4
```

we have:

\[
EvidenceRecall@5
=
\frac{2}{2}
=
1.0
\]

---

# Why Recall@k matters for RAG

The generator only sees the selected context.

If the necessary evidence is outside the context window:

```text
generation cannot reliably use it
```

So retrieval recall places an upper bound on what the downstream system can do.

---

# Context Precision

Now ask:

> How much of the retrieved context is actually useful?

A simple form is:

\[
ContextPrecision@k
=
\frac{
\text{relevant retrieved chunks}
}{
k
}
\]

For:

```text
top 5:
C2, C11, C7, C19, C4
```

with relevant chunks:

```text
C4, C11
```

we get:

\[
ContextPrecision@5
=
\frac{2}{5}
=
0.4
\]

---

# Recall and precision pull in different directions

Increasing \(k\):

```text
may improve evidence recall
```

but also:

```text
may reduce context precision
```

This creates a familiar IR trade-off.

---

# MRR and nDCG still matter

If one supporting passage is sufficient, MRR can be useful:

```text
How early does the first supporting chunk appear?
```

If evidence has graded usefulness:

```text
primary evidence
secondary evidence
weakly related evidence
```

then nDCG can also be meaningful.

RAG does not invalidate classical IR metrics.

It reuses them.

---

# Part III — Generation-side evaluation

## 22–34 min

Once the correct evidence is present in the prompt, we still need to evaluate the generated answer.

Two central dimensions are:

```text
answer correctness
faithfulness
```

They are not the same thing.

---

# Answer correctness

Question:

```text
How many credits is the thesis worth?
```

Gold answer:

```text
30 ECTS
```

Generated answer:

```text
The master's thesis is worth 30 ECTS credits.
```

This is correct.

A generated answer can be compared with:

```text
reference answer
known fact
human judgment
task-specific exact match
semantic equivalence
```

depending on the task.

---

# Exact match

For short factual QA:

```text
gold:
30

prediction:
30
```

Exact match can work.

But it is brittle.

Example:

```text
gold:
30 ECTS

prediction:
The thesis carries 30 European Credit Transfer System credits.
```

Semantically correct, but not string-identical.

---

# Token-level overlap metrics

Metrics such as:

```text
precision
recall
F1
```

over answer tokens can be useful for short extractive answers.

But they are weak for open-ended generation.

---

# Semantic answer evaluation

For generated answers, we often need to ask:

> Does this answer mean the same thing as the reference?

This may require:

```text
human evaluation
task-specific rules
semantic similarity
LLM-based judging
```

Each has limitations.

---

# Faithfulness / groundedness

Faithfulness asks:

> Are the claims in the answer supported by the retrieved context?

Example context:

```text
The programme requires 120 ECTS.
The thesis is worth 30 ECTS.
```

Answer:

```text
The programme requires 120 ECTS and the thesis is worth 30 ECTS.
```

Supported.

---

# Unfaithful answer

Same context:

```text
The programme requires 120 ECTS.
The thesis is worth 30 ECTS.
```

Answer:

```text
The programme requires 120 ECTS,
the thesis is worth 30 ECTS,
and students must complete a six-month internship.
```

The internship claim is unsupported.

The answer may contain correct statements and still be partially unfaithful.

---

# Claim-level view

For a generated answer, break it into claims:

```text
Claim 1
Claim 2
Claim 3
```

Then ask for each:

```text
supported by context?
yes / no
```

A simple faithfulness score could be:

\[
Faithfulness
=
\frac{
\text{supported claims}
}{
\text{all claims}
}
\]

This is conceptually useful even if the practical implementation is automated.

---

# Correct but ungrounded

A particularly important case:

```text
answer is factually correct
but not supported by retrieved evidence
```

For RAG, this should not automatically count as full success.

The purpose of retrieval augmentation is to provide evidence.

---

# Grounded but wrong

It is also possible to have:

```text
answer supported by context
but the context itself is wrong or outdated
```

This reveals another layer:

```text
source quality
```

RAG can only be as trustworthy as its corpus.

---

# Part IV — Citation evaluation

## 34–42 min

Suppose the answer says:

```text
The thesis is worth 30 ECTS [2].
```

We must evaluate the citation separately.

---

# Citation precision

Ask:

> Of the citations the model produced, how many actually support the associated claim?

Conceptually:

\[
CitationPrecision
=
\frac{
\text{correct supporting citations}
}{
\text{all citations produced}
}
\]

---

# Citation recall

Ask:

> Of the claims that need support, how many were actually supported with citations?

Conceptually:

\[
CitationRecall
=
\frac{
\text{claims with valid supporting citations}
}{
\text{claims requiring support}
}
\]

---

# Evidence coverage

Sometimes a correct answer requires multiple pieces of evidence.

Example:

```text
Question:
Can a student graduate if the thesis is incomplete?
```

This may require:

```text
one chunk describing total credits
+
one chunk describing thesis requirements
```

A retriever may find only one.

So some questions require **multi-evidence retrieval**.

---

# First-half recap

## 42–45 min

Put this table on the board.

| Layer | Example metric |
|---|---|
| Retrieval | Evidence Recall@k |
| Context quality | Context Precision@k |
| Ranking | MRR / nDCG |
| Answer quality | correctness |
| Grounding | faithfulness |
| Source use | citation precision / recall |
| End-to-end | task success |

Then transition:

> To evaluate any of this, we need an evaluation set.

---

# Part V — Building a RAG evaluation dataset

## 45–58 min

A useful RAG evaluation dataset should contain more than questions.

For each example, store:

```text
question
reference answer
supporting document(s)
supporting chunk(s)
```

Optional fields:

```text
answer type
difficulty
topic
requires multiple chunks?
should system abstain?
```

---

# Example record

```python
{
    "question": (
        "How many ECTS credits is the master's thesis worth?"
    ),
    "reference_answer": "30 ECTS",
    "supporting_chunks": ["D2_C1"],
    "answerable": True,
    "category": "fact_lookup"
}
```

---

# Include unanswerable questions

This is important.

Example:

```text
What is the tuition fee for 2030?
```

if the corpus contains no such information.

The correct behavior should be:

```text
insufficient information
```

not:

```text
guess an answer
```

So evaluation should include:

```text
answerable
+
unanswerable
```

questions.

---

# Why unanswerable questions matter

Without them, a model that always answers confidently may look good.

A robust RAG system should know when the evidence is missing.

This introduces:

```text
abstention quality
```

---

# Evaluation-set diversity

Include different types of questions:

```text
exact fact lookup
paraphrase
rare terminology
multi-hop / multi-evidence
ambiguous query
unanswerable query
```

This makes failure analysis more informative.

---

# Keep evaluation data separate

If you tune:

```text
chunk size
top-k
RRF parameters
reranker
prompt
```

on the same examples used for final reporting, you risk overfitting the evaluation set.

A better structure is:

```text
development set
→ tune

test set
→ final evaluation
```

The same experimental principle from classical IR still applies.

---

# Part VI — Live comparison of two RAG configurations

## 58–72 min

Use a small controlled dataset.

For example:

```text
20 documents
10 evaluation questions
known supporting chunks
```

Compare two systems.

---

# System A

```text
chunk size = 150
top-k = 3
dense retrieval
```

# System B

```text
chunk size = 400
top-k = 8
hybrid retrieval + reranker
```

Do not assume B is better merely because it is more complex.

Measure it.

---

# Suggested evaluation table

| Metric | System A | System B |
|---|---:|---:|
| Evidence Recall@5 | ... | ... |
| Context Precision@5 | ... | ... |
| Answer correctness | ... | ... |
| Faithfulness | ... | ... |
| Citation precision | ... | ... |

---

# Minimal retrieval evaluation

Assume each evaluation example contains gold chunk IDs.

```python
def evidence_recall_at_k(
    retrieved_ids,
    gold_ids,
    k
):
    retrieved = set(
        retrieved_ids[:k]
    )

    gold = set(gold_ids)

    if not gold:
        return None

    return len(
        retrieved & gold
    ) / len(gold)
```

---

# Minimal context precision

```python
def context_precision_at_k(
    retrieved_ids,
    gold_ids,
    k
):
    retrieved = retrieved_ids[:k]

    if not retrieved:
        return 0.0

    gold = set(gold_ids)

    useful = sum(
        chunk_id in gold
        for chunk_id in retrieved
    )

    return useful / len(retrieved)
```

---

# Why both metrics?

Suppose:

```text
System A:
Recall@5 = 1.0
Context Precision@5 = 0.2
```

It found all the evidence but added lots of noise.

Suppose:

```text
System B:
Recall@5 = 0.5
Context Precision@5 = 1.0
```

Its context is clean, but it missed half the evidence.

Neither is obviously superior without considering the downstream task.

---

# End-to-end answer inspection

For several questions, print:

```text
question
retrieved chunks
generated answer
reference answer
citations
```

This is one of the most valuable debugging views in a RAG system.

Do not evaluate only a spreadsheet of aggregate scores.

---

# Part VII — Failure analysis

## 72–82 min

For every failed example, assign a failure category.

Suggested labels:

```text
CORPUS_MISSING
BAD_CHUNKING
RETRIEVAL_MISS
RERANKING_MISS
CONTEXT_NOISE
GENERATION_ERROR
UNFAITHFUL_CLAIM
BAD_CITATION
FAILED_TO_ABSTAIN
```

---

# Example analysis table

| Query | Final result | Failure category | Evidence |
|---|---|---|---|
| Q1 | wrong answer | RETRIEVAL_MISS | gold chunk ranked 12 |
| Q2 | wrong answer | GENERATION_ERROR | gold chunk in rank 1 |
| Q3 | unsupported claim | UNFAITHFUL_CLAIM | claim absent from context |
| Q4 | wrong citation | BAD_CITATION | cited chunk unrelated |

This turns vague "RAG quality" into something diagnosable.

---

# Retrieval failure example

```text
Gold chunk:
rank 17

context cutoff:
top 5
```

No prompt engineering can fix this particular query.

The retriever must improve.

---

# Generation failure example

```text
Gold chunk:
rank 1

Correct evidence:
present in prompt

Answer:
wrong
```

Retrieval succeeded.

Changing the vector database will not solve the real problem.

---

# Chunking failure example

Original text:

```text
The master's thesis is worth
30 ECTS credits.
```

Poor chunk boundary:

```text
Chunk A:
The master's thesis is worth

Chunk B:
30 ECTS credits.
```

Neither chunk independently contains a complete answer.

The retriever may be working correctly over badly constructed units.

---

# Corpus failure example

If the answer is absent from the indexed corpus:

```text
retrieval cannot succeed
```

Before changing models, inspect the data.

---

# Part VIII — Ablation studies

## 82–85 min

An **ablation** removes or changes one component while keeping the rest as fixed as possible.

Example:

```text
Dense only
Dense + reranker
Hybrid
Hybrid + reranker
```

Compare:

```text
Evidence Recall@5
nDCG@10
answer correctness
faithfulness
```

This answers:

> Which component actually contributed?

---

# Chunking ablation

Compare:

```text
100-token chunks
300-token chunks
700-token chunks
```

Keep the retriever fixed.

If performance changes, chunking is contributing.

---

# Top-k ablation

Compare:

```text
k = 1
k = 3
k = 5
k = 10
```

Measure both:

```text
evidence recall
context precision
answer quality
```

This can reveal whether more context helps or hurts.

---

# Part IX — LLM-as-judge

## 85–87 min

For open-ended answers, human evaluation can be expensive.

One approach is to use another language model as an evaluator.

For example, provide:

```text
Question
Reference answer
Retrieved context
Generated answer
```

Then ask the evaluator:

```text
Is the answer correct?
Is every claim supported?
```

This can be useful at scale.

But it is still a measurement model.

It can make mistakes.

---

# Limitations of LLM-based evaluation

Possible issues:

```text
sensitivity to prompt wording
inconsistent judgments
preference for longer answers
model-specific bias
difficulty with subtle factual errors
difficulty with domain-specific evidence
```

So do not treat an LLM judge as ground truth.

For important experiments:

```text
manual spot checks
+
automated evaluation
```

are preferable.

---

# Part X — Final course synthesis

## 87–90 min

End with the complete course pipeline:

```text
documents
   ↓
indexing
   ↓
lexical retrieval
   ↓
evaluation
   ↓
web / link structure
   ↓
query expansion
   ↓
neural representations
   ↓
semantic search
   ↓
vector index / vector database
   ↓
dense retrieval
   ↓
hybrid retrieval
   ↓
reranking
   ↓
RAG
   ↓
RAG evaluation
```

---

# Five points students should remember

1. RAG must be evaluated by stage, not only by final answer quality.
2. Evidence Recall@k tells us whether the required evidence reached the context window.
3. Answer correctness and faithfulness are different dimensions.
4. Citation quality should be checked separately from answer quality.
5. Ablation and failure analysis are more informative than blindly changing models.

---

# Optional after-class exercise

Create a small RAG evaluation set with:

```text
10–20 questions
reference answers
gold supporting chunks
2–5 unanswerable questions
```

Evaluate two different RAG configurations.

For example:

```text
System A:
dense retrieval
top-k = 3

System B:
hybrid retrieval + reranking
top-k = 5
```

Report:

```text
Evidence Recall@5
Context Precision@5
Answer correctness
Faithfulness
Citation precision
Abstention accuracy
```

Then manually inspect at least five failed examples.

---

# Optional ablation assignment

Choose one variable:

```text
chunk size
chunk overlap
retrieval method
top-k
reranking
```

Change only that variable.

Report:

```text
retrieval metrics
generation metrics
latency if available
```

Then answer:

> What changed, and at which stage of the pipeline did the effect appear?

---

# Optional error-analysis assignment

For each failed question, assign one category:

```text
CORPUS_MISSING
BAD_CHUNKING
RETRIEVAL_MISS
RERANKING_MISS
CONTEXT_NOISE
GENERATION_ERROR
UNFAITHFUL_CLAIM
BAD_CITATION
FAILED_TO_ABSTAIN
```

Create a failure distribution:

| Failure type | Count |
|---|---:|
| Retrieval miss | ... |
| Generation error | ... |
| Bad citation | ... |
| ... | ... |

Then decide which subsystem deserves attention first.

---

# Suggested dependencies

Core evaluation can be done with:

```bash
pip install numpy pandas
```

For retrieval evaluation, students may reuse:

```bash
pip install ir_measures
```

Optional RAG-evaluation frameworks may automate parts of the workflow, but they should be introduced only after students understand what the metrics are trying to measure.

Do not let a framework replace the evaluation model.

---

# Suggested evaluation dataset format

A simple JSON-like structure is enough:

```python
examples = [
    {
        "id": "Q1",
        "question": "How many ECTS is the thesis worth?",
        "reference_answer": "30 ECTS",
        "supporting_chunks": ["D2_C1"],
        "answerable": True
    },
    {
        "id": "Q2",
        "question": "What is the tuition fee in 2030?",
        "reference_answer": None,
        "supporting_chunks": [],
        "answerable": False
    }
]
```

This is enough to support:

```text
retrieval evaluation
answer evaluation
abstention evaluation
failure analysis
```

---

# Suggested reading

## Retrieval-Augmented Generation

Patrick Lewis et al.  
*Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.*

- https://arxiv.org/abs/2005.11401

## Classical retrieval evaluation

Christopher D. Manning, Prabhakar Raghavan, Hinrich Schütze.  
*Introduction to Information Retrieval.*

- https://nlp.stanford.edu/IR-book/

The important course-level lesson is that classical IR evaluation remains directly useful inside modern RAG systems.

---

# Bridge to Lab 13

If the course includes a final Lab 13, it should not introduce another major theory topic.

A strong final lab would be a small **IR / RAG systems challenge**.

Students receive:

```text
one corpus
one query set
one evaluation set
```

and compare:

```text
BM25
dense retrieval
hybrid retrieval
hybrid + reranking
RAG
```

The final report should include:

```text
retrieval metrics
RAG metrics
ablation
failure analysis
```

That would close the course around one central question:

> **Can you build, evaluate, and explain a retrieval system rather than simply run one?**

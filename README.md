# Information Retrieval course: lab notes

Interactive lab notes for the **Information Retrieval** course at Sofia University "St. Kliment Ohridski", Faculty of Mathematics and Informatics.

The lab exercises (Jupyter notebooks, datasets and setup instructions) are in the course repository: **[di-dimitrov/information_retrieval_fmi_new](https://github.com/di-dimitrov/information_retrieval_fmi_new/tree/main)**.

## 🌐 Interactive Class Notes

Served from `docs/` on GitHub Pages: **[elitsay.github.io/Information_Retrieval_course](https://elitsay.github.io/Information_Retrieval_course/docs/index.html)**

| Lab | Class notes | Quiz | Covers |
| :--- | :--- | :--- | :--- |
| 01 | [Inverted Index and Boolean Queries](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab01-inverted-index.html) | coming soon | Incidence matrices, dictionary and postings, index construction, Boolean queries, skip pointers, phrase queries |
| 02 | [Text Preprocessing](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab02-text-preprocessing.html) | coming soon | Tokenizers, normalization, stop words, stemming and lemmatization, a preprocessing pipeline |
| 03 | [Tolerant Retrieval and Spelling Correction](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab03-spelling-correction.html) | coming soon | Wild-card queries, edit distance, n-gram overlap, context-sensitive correction, Soundex |
| 04 | [Ranked Retrieval: TF-IDF and BM25](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab04-ranked-retrieval.html) | coming soon | TF, DF and IDF, TF-IDF vectors, cosine similarity, BM25, the Cranfield collection |
| 05 | [Evaluating IR Systems](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab05-evaluation.html) | coming soon | Precision and recall, MRR, MAP, nDCG, per-query analysis, Recall@k for RAG |

## 💻 Jupyter Notebooks

A copy of the notebook each page is built from is in [`notebooks/`](notebooks/):

| File | Topic |
| :--- | :--- |
| [`lab1_inverted_index_and_queries.ipynb`](notebooks/lab1_inverted_index_and_queries.ipynb) | Inverted Index and Boolean Queries |
| [`lab3_spellchecking.ipynb`](notebooks/lab3_spellchecking.ipynb) | Tolerant Retrieval and Spelling Correction |

The outlines of Labs 04 and 05 are [`lab04_ranked_retrieval_90min_lecture.md`](notebooks/lab04_ranked_retrieval_90min_lecture.md) and [`lab05_ir_evaluation_90min_lecture.md`](notebooks/lab05_ir_evaluation_90min_lecture.md); their demos use the Cranfield collection via `ir_datasets`. The notebooks for Labs 01 and 03 use the `mini_newsgroups` version of the [Twenty Newsgroups](https://archive.ics.uci.edu/dataset/113/twenty+newsgroups) dataset; see the course repository for how to download it.

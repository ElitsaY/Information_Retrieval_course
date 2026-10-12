# Information Retrieval course: lab notes

Interactive lab notes for the **Information Retrieval** course at Sofia University "St. Kliment Ohridski", Faculty of Mathematics and Informatics.

The lab exercises (Jupyter notebooks, datasets and setup instructions) are in the course repository: **[di-dimitrov/information_retrieval_fmi_new](https://github.com/di-dimitrov/information_retrieval_fmi_new/tree/main)**.

## 🌐 Interactive Class Notes

Served from `docs/` on GitHub Pages: **[elitsay.github.io/Information_Retrieval_course](https://elitsay.github.io/Information_Retrieval_course/docs/index.html)**

| Lab | Class notes | Quiz | Covers |
| :--- | :--- | :--- | :--- |
| 00 | [Introduction](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab00-introduction.html) | coming soon | The team, course content, SemEval-2027 (Task 9, organised by us), the top AI and NLP conferences |
| 01 | [Inverted Index and Boolean Queries](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab01-inverted-index.html) | [Quiz](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab01-quiz.html) | Incidence matrices, dictionary and postings, index construction, Boolean queries, skip pointers, phrase queries |
| 02 | [Text Preprocessing](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab02-text-preprocessing.html) | coming soon | Tokenizers, normalization, stop words, stemming and lemmatization, a preprocessing pipeline |
| 03 | [Tolerant Retrieval and Spelling Correction](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab03-spelling-correction.html) | coming soon | Wild-card queries, edit distance, n-gram overlap, context-sensitive correction, Soundex |
| 04 | [Ranked Retrieval: TF-IDF and BM25](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab04-ranked-retrieval.html) | coming soon | TF, DF and IDF, TF-IDF vectors, cosine similarity, BM25, the Cranfield collection |
| 05 | [Evaluating IR Systems](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab05-evaluation.html) | coming soon | Accuracy, precision and recall, MRR, MAP, nDCG, per-query analysis |
| 06 | [Web Crawling and PageRank](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab06-crawling-pagerank.html) | coming soon | Crawler types, the crawl loop and URL frontier, URL normalization and duplicates, robots.txt and politeness, Scrapy, the Web as a graph, PageRank |
| 07 | [Query Expansion and Language Models](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab07-query-expansion-lm.html) | coming soon | Vocabulary mismatch, query expansion and drift, Rocchio, pseudo-relevance feedback, n-gram language models and smoothing, query likelihood |
| 08 | [Neural Text Representations](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab08-dense-retrieval.html) | coming soon | Sparse vs dense vectors, tokens and token embeddings, self-attention (queries, keys, values), what a Transformer is and where it came from, Transformer layers and position |
| 09 | [Sentence Embeddings and Semantic Search](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab09-sentence-embeddings.html) | coming soon | Encoders vs decoders, pooling into sentence embeddings, generic vs trained models, semantic search, bi-encoders, an embedding demo |
| 10 | [Dense Retrieval and Vector Databases](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab10-ann-faiss.html) | coming soon | Dense retrieval on Cranfield, Dense Passage Retrieval, similarity functions, exact nearest-neighbor search, ANN (IVF, HNSW), FAISS, vector databases and metadata filtering, ANN recall vs IR recall |
| 11 | [Hybrid Retrieval and Reranking](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab11-hybrid-reranking.html) | coming soon | Multi-stage retrieval, score fusion vs rank fusion, Reciprocal Rank Fusion, cross-encoder reranking, candidate-set sizes, ablations |
| 12 | [Retrieval-Augmented Generation](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab12-rag.html) | coming soon | RAG architecture, encoder vs generator, chunking and overlap, top-k context selection, grounded prompts and citations, prompt injection, failure modes |
| 13 | [Evaluating RAG Systems](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab13-rag-evaluation.html) | coming soon | Evaluation by stage, evidence recall, context precision, faithfulness, citation quality, unanswerable questions, failure analysis, ablations, LLM-as-judge |

## 💻 Jupyter Notebooks

A copy of the notebook each page is built from is in [`notebooks/`](notebooks/):

| File | Topic |
| :--- | :--- |
| [`lab1_inverted_index_and_queries.ipynb`](notebooks/lab1_inverted_index_and_queries.ipynb) | Inverted Index and Boolean Queries |
| [`lab3_spellchecking.ipynb`](notebooks/lab3_spellchecking.ipynb) | Tolerant Retrieval and Spelling Correction |
| [`lab7_web_crawlers.ipynb`](notebooks/lab7_web_crawlers.ipynb) | Web Crawlers (used in Lab 06) |
| [`lab10_language_modeling.ipynb`](notebooks/lab10_language_modeling.ipynb) | Language Modeling (used in Lab 07) |

The notebooks for Labs 01 and 03 use the `mini_newsgroups` version of the [Twenty Newsgroups](https://archive.ics.uci.edu/dataset/113/twenty+newsgroups) dataset; see the course repository for how to download it. The Web Crawlers notebook crawls [quotes.toscrape.com](https://quotes.toscrape.com/), a sandbox site for scraping practice, and the Language Modeling notebook uses Jane Austen's *Emma* from NLTK's Gutenberg corpus.

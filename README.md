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
| 05 | [Evaluating IR Systems](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab05-evaluation.html) | coming soon | Accuracy, precision and recall, MRR, MAP, nDCG, per-query analysis |
| 06 | [Web Crawling and PageRank](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab06-crawling-pagerank.html) | coming soon | Crawler types, the crawl loop and URL frontier, URL normalization and duplicates, robots.txt and politeness, Scrapy, the Web as a graph, PageRank |
| 07 | [Query Expansion and Language Models](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab07-query-expansion-lm.html) | coming soon | Vocabulary mismatch, query expansion and drift, Rocchio, pseudo-relevance feedback, n-gram language models and smoothing, query likelihood |
| 08 | [Neural Text Representations](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab08-dense-retrieval.html) | coming soon | Sparse vs dense vectors, tokens and token embeddings, self-attention, Transformer layers, encoders vs decoders, pooling into sentence embeddings, semantic search, bi-encoders |
| 09 | [Dense Retrieval and Vector Databases](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab09-ann-faiss.html) | coming soon | Dense retrieval on Cranfield, Dense Passage Retrieval, similarity functions, exact nearest-neighbor search, ANN (IVF, HNSW), FAISS, vector databases and metadata filtering, ANN recall vs IR recall |
| 10 | [Hybrid Retrieval and Reranking](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab10-hybrid-reranking.html) | coming soon | Multi-stage retrieval, score fusion vs rank fusion, Reciprocal Rank Fusion, cross-encoder reranking, candidate-set sizes, ablations |
| 11 | [Retrieval-Augmented Generation](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab11-rag.html) | coming soon | RAG architecture, encoder vs generator, chunking and overlap, top-k context selection, grounded prompts and citations, prompt injection, failure modes |

## 💻 Jupyter Notebooks

A copy of the notebook each page is built from is in [`notebooks/`](notebooks/):

| File | Topic |
| :--- | :--- |
| [`lab1_inverted_index_and_queries.ipynb`](notebooks/lab1_inverted_index_and_queries.ipynb) | Inverted Index and Boolean Queries |
| [`lab3_spellchecking.ipynb`](notebooks/lab3_spellchecking.ipynb) | Tolerant Retrieval and Spelling Correction |
| [`lab7_web_crawlers.ipynb`](notebooks/lab7_web_crawlers.ipynb) | Web Crawlers (used in Lab 06) |
| [`lab10_language_modeling.ipynb`](notebooks/lab10_language_modeling.ipynb) | Language Modeling (used in Lab 07) |

The outlines of Labs 04 and 05 are [`lab04_ranked_retrieval_90min_lecture.md`](notebooks/lab04_ranked_retrieval_90min_lecture.md) and [`lab05_ir_evaluation_90min_lecture.md`](notebooks/lab05_ir_evaluation_90min_lecture.md); their demos use the Cranfield collection via `ir_datasets`. Lab 06 combines the outline [`lab06_web_crawling_pagerank_90min_lecture.md`](notebooks/lab06_web_crawling_pagerank_90min_lecture.md) with the Web Crawlers notebook; its examples crawl [quotes.toscrape.com](https://quotes.toscrape.com/), a sandbox site for scraping practice. Lab 07 combines [`lab07_query_expansion_language_models_90min_lecture.md`](notebooks/lab07_query_expansion_language_models_90min_lecture.md) with the Language Modeling notebook, which uses Jane Austen's *Emma* from NLTK's Gutenberg corpus. Lab 08 follows [`lab08_neural_text_representations_semantic_search_90min_lecture.md`](notebooks/lab08_neural_text_representations_semantic_search_90min_lecture.md); its tokenizer is the model's WordPiece vocabulary, and its embeddings, attention weights and hidden states come from `sentence-transformers/all-MiniLM-L6-v2` (plus `roberta-large` for comparison), computed in Python and stored in the page. Lab 09 follows [`lab09_dense_retrieval_vector_databases_90min_lecture.md`](notebooks/lab09_dense_retrieval_vector_databases_90min_lecture.md); its IVF index is the FAISS one built on the Cranfield embeddings, stored with the page. Lab 10 follows [`lab10_hybrid_retrieval_rrf_reranking_90min_lecture.md`](notebooks/lab10_hybrid_retrieval_rrf_reranking_90min_lecture.md); its reranker scores come from `cross-encoder/ms-marco-MiniLM-L-6-v2`, computed in Python and stored in the page. Lab 11 follows [`lab11_rag_vector_database_90min_lecture.md`](notebooks/lab11_rag_vector_database_90min_lecture.md); its chunking and prompt examples use invented programme-regulation texts scored with `all-MiniLM-L6-v2`, and its top-k experiment reuses the Lab 10 runs; the page does not run a generative model. The notebooks for Labs 01 and 03 use the `mini_newsgroups` version of the [Twenty Newsgroups](https://archive.ics.uci.edu/dataset/113/twenty+newsgroups) dataset; see the course repository for how to download it.

# Lab 06 — Web Search: Crawling, Web Graphs, and PageRank

> **Format:** 90-minute lecturer-led seminar  
> **Structure:** 2 × 45 minutes  
> **Audience:** Master's students in Information Retrieval  
> **Style:** explanation + worked examples + short live demos  
> **Main themes:** crawling, URL frontier, robots.txt, duplicate handling, web graphs, PageRank  
> **Optional real graph dataset:** Stanford SNAP Web Graph

---

## Seminar goal

So far, we have mostly assumed that our document collection already exists.

For web search, that assumption breaks.

Before we can index, rank, and evaluate web pages, we first need to answer:

> **How do we discover and collect the documents?**

The Web also gives us information that ordinary document collections do not:

> **Pages link to one another.**

Those links form a graph, and the graph itself can provide ranking signals.

The main progression in this seminar is:

```text
Web
 ↓
crawler
 ↓
document collection
 ↓
index
 ↓
content-based ranking
 +
link-based ranking
 ↓
search results
```

---

# Learning objectives

By the end of the seminar, students should be able to explain:

- why web crawling is a separate problem from indexing;
- the basic architecture of a crawler;
- what a URL frontier is;
- why URL normalization and duplicate detection are necessary;
- the purpose and limitations of `robots.txt`;
- why crawlers need politeness and rate limiting;
- how hyperlinks form a directed graph;
- why counting incoming links is not enough;
- the intuition behind PageRank;
- the role of the damping factor;
- why link-based authority and textual relevance are different signals;
- how web crawling relates to modern search and RAG ingestion pipelines.

---

# Session plan

## First 45 minutes

| Time | Topic |
|---|---|
| 0–8 min | From a fixed corpus to the Web |
| 8–20 min | How a crawler works |
| 20–30 min | URL frontier, normalization, duplicates |
| 30–40 min | robots.txt, politeness, crawler ethics |
| 40–45 min | Crawler recap |

## Second 45 minutes

| Time | Topic |
|---|---|
| 45–55 min | The Web as a directed graph |
| 55–70 min | PageRank intuition and formula |
| 70–82 min | Small PageRank live demo |
| 82–87 min | Combining textual and link signals |
| 87–90 min | Connection to modern retrieval and RAG |

---

# Part I — From a fixed corpus to the Web

## 0–8 min

In previous labs, we started with something like:

```text
documents = [...]
```

and then built:

```text
documents
   ↓
preprocessing
   ↓
index
   ↓
retrieval model
```

But where did the documents come from?

For a web search engine, the collection is not given in advance.

The system must discover pages.

---

# The Web creates a new IR problem

A web search engine needs at least three broad components:

```text
1. Crawling
   discover and fetch pages

2. Indexing
   transform fetched pages into searchable representations

3. Ranking
   order results for a query
```

These are different engineering problems.

A crawler is not a search engine by itself.

An inverted index is not a crawler.

A ranking function does not discover new pages.

---

# A minimal crawler

Imagine that we start from one page:

```text
https://example.org/
```

We fetch it and find links to:

```text
/about
/courses
/people
```

Then we fetch those pages and discover more links.

This process is recursive.

---

# Basic crawling loop

Conceptually:

```python
frontier = [seed_url]
visited = set()

while frontier:
    url = frontier.pop()

    if url in visited:
        continue

    page = fetch(url)
    visited.add(url)

    store(page)

    for link in extract_links(page):
        frontier.append(link)
```

This is enough to explain the idea.

It is not enough to build a responsible production crawler.

---

# Part II — Crawler architecture

## 8–20 min

A slightly more realistic pipeline is:

```text
seed URLs
    ↓
URL frontier
    ↓
scheduler
    ↓
robots / politeness check
    ↓
HTTP fetcher
    ↓
parser
    ├── text
    ├── metadata
    └── outgoing links
            ↓
       URL normalization
            ↓
       duplicate check
            ↓
         frontier
```

---

# Seed URLs

A crawler must start somewhere.

These initial URLs are called:

```text
seed URLs
```

Examples:

```text
university homepage
news homepage
known domain list
sitemap
previous crawl
```

The seed set strongly affects what the crawler discovers.

A crawler does not magically know every URL on the Web.

---

# The URL frontier

The **frontier** is the collection of URLs waiting to be crawled.

A naive implementation may use:

```python
list
queue
stack
```

But a real crawler needs scheduling.

Questions include:

- Which URL should be fetched next?
- Which host was contacted recently?
- Which pages are likely to be important?
- Which pages should be revisited?
- How do we avoid crawling one site too aggressively?

---

# Breadth-first vs depth-first

Suppose:

```text
A → B → C → D
 \
  → E
```

A depth-first crawler may go:

```text
A, B, C, D, E
```

A breadth-first crawler may go:

```text
A, B, E, C, D
```

For web crawling, a pure DFS or BFS policy is usually too simplistic.

But they are useful starting points for understanding frontier scheduling.

---

# Part III — URLs are messier than they look

## 20–30 min

Consider:

```text
https://example.org/page
https://example.org/page/
https://example.org/page#section
https://EXAMPLE.org/page
```

Are these four different documents?

Maybe.

Maybe not.

This introduces **URL normalization** and **canonicalization**.

---

# URL normalization

Possible normalization steps include:

```text
lowercase hostname
remove URL fragments
resolve relative URLs
remove default ports
normalize path components
```

For example:

```text
https://example.org/a/../page
```

may normalize to:

```text
https://example.org/page
```

But normalization must be conservative.

Different URLs can genuinely represent different resources.

---

# Why duplicate URLs matter

Without duplicate handling:

```text
A → B
A → C
B → C
C → A
```

the crawler could keep rediscovering:

```text
A
B
C
A
B
C
...
```

At minimum, maintain:

```python
visited_urls = set()
```

But there is a second problem:

```text
different URLs
→ same or nearly identical content
```

---

# Content duplicates

Examples:

```text
printer-friendly page
tracking-parameter variant
mobile/desktop version
mirrored page
session-specific URL
```

So we distinguish:

```text
URL duplicate
```

from:

```text
content duplicate
```

---

# Exact duplicate detection

A simple strategy:

```python
import hashlib

fingerprint = hashlib.sha256(
    text.encode("utf-8")
).hexdigest()
```

If the same normalized content produces the same hash, it is an exact duplicate.

---

# Near duplicates

Two pages may differ only slightly:

```text
same article
different navigation bar
different timestamp
different ad
```

Exact hashes will not detect this.

Large crawlers therefore use approximate techniques such as:

```text
shingling
MinHash
SimHash
```

Do not derive these algorithms in this lecture.

The point is simply:

> Duplicate detection is an IR systems problem, not merely a storage problem.

---

# Part IV — robots.txt and politeness

## 30–40 min

A crawler should not fetch arbitrary URLs as fast as possible.

Two concepts matter:

```text
rules
+
politeness
```

---

# robots.txt

Websites can publish a file at:

```text
/robots.txt
```

For example:

```text
https://example.org/robots.txt
```

The Robots Exclusion Protocol is standardized in RFC 9309.

A simple file may contain:

```text
User-agent: *
Disallow: /private/
Allow: /public/
```

Meaning:

```text
all crawlers
should not crawl /private/
```

---

# Important limitation

`robots.txt` is not an authentication or authorization mechanism.

It communicates crawling preferences.

Sensitive information should never be protected by relying on `robots.txt`.

---

# Python support

Python includes a parser:

```python
from urllib.robotparser import RobotFileParser

rp = RobotFileParser()
rp.set_url("https://example.org/robots.txt")
rp.read()

allowed = rp.can_fetch(
    "MyCourseCrawler",
    "https://example.org/page"
)
```

For a teaching demo, explain the mechanism without actually crawling arbitrary sites.

---

# Politeness

Even when crawling is allowed, a crawler should avoid overwhelming a server.

A basic policy might be:

```text
do not request many pages from the same host simultaneously
wait between requests
identify the crawler
handle HTTP errors
respect retry signals
```

The precise policy depends on the application.

---

# Why this matters technically

If a crawler ignores politeness:

```text
too many requests
      ↓
server overload
      ↓
blocking / failures
      ↓
worse crawl
```

So politeness is not separate from system quality.

---

# Crawl traps

Some sites can generate effectively unlimited URL spaces.

Examples:

```text
calendar:
?year=2026
?year=2027
?year=2028
...

faceted navigation:
?color=red&size=m&sort=price

session identifiers:
?id=123
?id=456
...
```

A crawler needs heuristics and limits.

Otherwise the frontier can explode.

---

# First-half recap

## 40–45 min

Put this pipeline on the board:

```text
seed URLs
    ↓
frontier
    ↓
check URL
    ↓
robots + politeness
    ↓
fetch
    ↓
parse
    ↓
store content
    ↓
extract links
    ↓
normalize / deduplicate
    ↓
frontier
```

Then ask:

> Once we have crawled these pages, is the text the only information available to us?

No.

Pages link to one another.

That link structure gives us another ranking signal.

---

# Part V — The Web as a graph

## 45–55 min

Represent each page as a node.

Represent each hyperlink as a directed edge.

If page A links to page B:

\[
A \rightarrow B
\]

A small web graph might look like:

```text
A → B
A → C
B → C
C → A
D → C
D → A
```

This is a **directed graph**.

---

# Why links might matter

A naive idea:

> A page with many incoming links may be important.

This leads to:

```text
in-degree
```

For a page \(p\):

\[
indegree(p)
=
\text{number of pages linking to }p
\]

---

# Why counting links is not enough

Consider:

```text
100 obscure pages → X

1 very authoritative page → Y
```

Should X automatically be more important?

Not necessarily.

We want a recursive idea:

> A link from an important page should count more than a link from an unimportant page.

This is the intuition behind PageRank.

---

# Part VI — PageRank intuition

## 55–70 min

PageRank can be explained using a **random surfer**.

Imagine a user browsing the Web.

At each page:

```text
with probability d:
    follow one outgoing link

with probability 1-d:
    jump to a random page
```

The long-run probability of being on a page is its PageRank.

---

# Basic PageRank equation

For page \(u\):

\[
PR(u)
=
\frac{1-d}{N}
+
d
\sum_{v \in B_u}
\frac{PR(v)}{L(v)}
\]

where:

- \(N\) = number of pages;
- \(d\) = damping factor;
- \(B_u\) = pages linking to \(u\);
- \(L(v)\) = number of outgoing links from \(v\).

A common illustrative value is:

\[
d = 0.85
\]

---

# Break the formula apart

## Incoming PageRank

A page receives score from pages that link to it:

\[
\sum_{v \in B_u}
\frac{PR(v)}{L(v)}
\]

---

## Outgoing-link division

If page A has PageRank:

```text
0.8
```

and links to four pages, it distributes roughly:

```text
0.2
```

to each before damping.

A page does not give its full score independently to every outgoing link.

---

## Damping

The:

\[
1-d
\]

component means the surfer can jump rather than following links forever.

This helps avoid problems caused by graph structure and produces a stable stochastic interpretation.

---

# PageRank is query-independent

This point is important.

TF-IDF and BM25 compute:

\[
score(q,d)
\]

PageRank computes something closer to:

\[
importance(d)
\]

without knowing the user's query.

Therefore:

```text
BM25
→ query-dependent relevance signal

PageRank
→ query-independent authority/popularity signal
```

They measure different things.

---

# A critical example

Suppose the query is:

```text
python sorting algorithm
```

A globally important page about:

```text
world news
```

should not rank highly merely because it has high PageRank.

Textual relevance still matters.

---

# Part VII — Small PageRank demo

## 70–82 min

Do not crawl the live Web for this demo.

Use a small deterministic graph.

```python
import networkx as nx

G = nx.DiGraph()

G.add_edges_from([
    ("A", "B"),
    ("A", "C"),
    ("B", "C"),
    ("C", "A"),
    ("D", "C"),
    ("D", "A"),
])
```

Visualize the edges:

```python
list(G.edges())
```

Compute incoming-link counts:

```python
dict(G.in_degree())
```

Then compute PageRank:

```python
pr = nx.pagerank(
    G,
    alpha=0.85
)

for page, score in sorted(
    pr.items(),
    key=lambda x: x[1],
    reverse=True
):
    print(page, round(score, 4))
```

NetworkX implements PageRank for directed graphs and uses `alpha=0.85` as its default damping parameter.

---

# What to ask during the demo

Before running the algorithm:

> Which node do you expect to receive the largest score?

Then compare:

```text
in-degree ranking
```

against:

```text
PageRank ranking
```

Ask:

> Are they identical?

If not:

> Which incoming links caused the difference?

The goal is intuition, not numerical memorization.

---

# Dangling nodes

A **dangling node** has no outgoing links.

Example:

```text
A → B
B → C
C → nothing
```

In the random-surfer model, the surfer would get stuck at C.

Practical PageRank implementations redistribute this probability mass.

Mention this briefly.

Do not spend the lecture deriving the full matrix correction.

---

# Link farms and manipulation

Once links affect rankings, people have incentives to manipulate links.

Examples include artificial networks of pages created to amplify authority.

This illustrates a broader IR principle:

> A ranking feature can change user and publisher behavior once people know it matters.

Link analysis is useful, but it is not an unquestionable measure of quality.

---

# Part VIII — Combining textual and link signals

## 82–87 min

A conceptual search score might combine:

\[
Score(q,d)
=
\alpha \cdot TextScore(q,d)
+
\beta \cdot LinkScore(d)
\]

For example:

```text
TextScore:
BM25

LinkScore:
PageRank
```

This formula is only illustrative.

Real search systems can combine many signals and learned ranking models.

---

# Why separate the signals?

Suppose:

```text
Document A
high BM25
low PageRank
```

and:

```text
Document B
medium BM25
high PageRank
```

Which should rank first?

There is no universal answer.

It depends on:

```text
query
task
training data
evaluation metric
```

This connects directly back to Lab 05.

---

# Part IX — Connection to modern retrieval and RAG

## 87–90 min

Crawling is still relevant even if the final application is a RAG system.

A RAG system needs a knowledge collection.

That collection may come from:

```text
web pages
documentation
company intranet
PDFs
APIs
databases
```

Before retrieval, we still need an ingestion pipeline:

```text
discover
 ↓
fetch
 ↓
parse
 ↓
deduplicate
 ↓
clean
 ↓
chunk
 ↓
index
```

The technology changes, but many crawler problems remain:

```text
duplicate content
stale pages
broken links
canonicalization
refresh scheduling
access restrictions
```

So crawling is not merely historical web-search material.

It is part of modern retrieval infrastructure.

---

# Final summary

End with two pipelines.

## Web crawling

```text
seed URLs
    ↓
frontier
    ↓
robots / politeness
    ↓
fetch
    ↓
parse
    ↓
normalize + deduplicate
    ↓
store + index
```

## Web ranking

```text
query
   ↓
textual relevance
TF-IDF / BM25
   +
link structure
PageRank
   ↓
ranked results
```

---

# Five points students should remember

1. Search cannot index pages it has not discovered.
2. A crawler requires scheduling, normalization, duplicate handling, and politeness—not just HTTP requests.
3. Hyperlinks turn the Web into a directed graph.
4. PageRank recursively values links from already-important pages.
5. PageRank measures a query-independent graph signal; it does not replace textual relevance.

---

# Optional after-class exercise

## Option A — Tiny crawler on a controlled site

Only crawl a site that you own, have permission to crawl, or that is explicitly provided for the exercise.

Implement a crawler limited to:

```text
one domain
maximum 50 pages
one request at a time
```

Store:

```text
URL
page title
outgoing links
```

Build a directed graph and calculate PageRank.

---

## Option B — Use a pre-existing web graph

For graph analysis without live crawling, use the Stanford Web Graph from SNAP.

The dataset represents Stanford web pages as nodes and hyperlinks as directed edges.

It contains approximately:

```text
281,903 nodes
2,312,497 edges
```

Dataset:

- https://snap.stanford.edu/data/web-Stanford.html

For a short exercise, use only a sampled subgraph.

Do not try to visualize the entire graph.

---

# Optional PageRank exercise

Given:

```text
A → B
A → C
B → C
C → A
D → C
D → A
```

Answer:

1. Which node has the highest in-degree?
2. Does the highest in-degree guarantee the highest PageRank?
3. What happens if `C → A` is removed?
4. What happens if a high-PageRank page adds a link to `D`?
5. Why does the damping factor matter?

Then verify using:

```python
nx.pagerank(G, alpha=0.85)
```

---

# Suggested live-demo dependencies

```bash
pip install networkx
```

Optional for HTML parsing:

```bash
pip install requests beautifulsoup4
```

For a lecture, the deterministic graph demo is preferable to live crawling because it avoids:

```text
network failures
site changes
rate limits
robots restrictions
unexpected page structures
```

---

# References

## Robots Exclusion Protocol

RFC 9309:

- https://www.rfc-editor.org/rfc/rfc9309.html

The RFC specifies the modern Robots Exclusion Protocol and defines the conventional `/robots.txt` location.

---

## NetworkX PageRank

Documentation:

- https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.link_analysis.pagerank_alg.pagerank.html

---

## Stanford SNAP Web Graph

- https://snap.stanford.edu/data/web-Stanford.html

---

## Suggested reading

Christopher D. Manning, Prabhakar Raghavan, Hinrich Schütze.  
*Introduction to Information Retrieval.*

Relevant themes:

- web crawling;
- link analysis;
- PageRank;
- web search.

Book:

- https://nlp.stanford.edu/IR-book/

---

# Bridge to the next part of the course

At this point, students have seen:

```text
Lab 01–03
how documents are indexed and matched

Lab 04
how documents are ranked

Lab 05
how rankings are evaluated

Lab 06
how web documents are discovered
and how link structure provides another ranking signal
```

The next step can move from lexical matching toward models that estimate relevance using richer representations:

```text
query expansion
language-model retrieval
semantic representations
dense retrieval
```

That progression eventually leads naturally to retrieval-augmented generation.

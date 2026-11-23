"""BeautifulSoup basics (Lab 06, Part V).

Run it with:  python bs_basics.py
Install first: pip install beautifulsoup4

The script parses a small job-list page and prints each common call next
to what it returns. Change the HTML or the calls and run it again.
"""

from bs4 import BeautifulSoup

html = """
<html><head><title>Jobs</title></head>
<body>
  <h1>Open positions</h1>
  <div class="job" id="job-1">
    <h2 class="title">Data Scientist</h2>
    <span class="location">Sofia, Bulgaria</span>
    <a href="/jobs/1">Details</a>
  </div>
  <div class="job" id="job-2">
    <h2 class="title">ML Engineer</h2>
    <span class="location">Remote</span>
    <a href="/jobs/2">Details</a>
  </div>
  <h3>About us</h3>
  <p>We build search engines.</p>
</body></html>
"""

soup = BeautifulSoup(html, "html.parser")     # the whole page as a tree


def show(title, code, result):
    """Print one example: what it does, the call, and what it returns."""
    print(f"# {title}")
    print(code)
    print(f"-> {result!r}\n")


show("the <title> tag",
     'soup.title.get_text()',
     soup.title.get_text())

show("find: the FIRST matching tag",
     'soup.find("h2")',
     soup.find("h2"))

show("get_text: only the text inside the tag",
     'soup.find("h2").get_text()',
     soup.find("h2").get_text())

show("find_all: ALL matching tags",
     '[h.get_text() for h in soup.find_all("h2")]',
     [h.get_text() for h in soup.find_all("h2")])

show("by id and by class (class_ has '_', because class is a Python keyword)",
     'soup.find("div", id="job-2").find("span", class_="location").get_text()',
     soup.find("div", id="job-2").find("span", class_="location").get_text())

show("attributes work like a dictionary",
     '[a["href"] for a in soup.find_all("a")]',
     [a["href"] for a in soup.find_all("a")])

show(".get gives None if the attribute is missing (a[\"target\"] would raise KeyError)",
     'soup.find("a").get("target")',
     soup.find("a").get("target"))

show("CSS selectors: select_one gives the first match",
     'soup.select_one("#job-1 .location").get_text()',
     soup.select_one("#job-1 .location").get_text())

show("CSS selectors: select gives all matches",
     '[s.get_text() for s in soup.select("div.job span.location")]',
     [s.get_text() for s in soup.select("div.job span.location")])

show("find a tag by its text, then move to the tag after it",
     'soup.find("h3", string="About us").find_next_sibling("p").get_text()',
     soup.find("h3", string="About us").find_next_sibling("p").get_text())

show("put it together: one record per job",
     '[{"title": ..., "location": ..., "link": ...} for job in soup.select("div.job")]',
     [{"title": job.find("h2").get_text(),
       "location": job.find("span", class_="location").get_text(),
       "link": job.find("a")["href"]}
      for job in soup.select("div.job")])

"""Scrape the text and the image of one news article (Lab 06).

Run it with:  python petel_article.py
Install first: pip install requests beautifulsoup4

The script downloads an article from petel.bg, prints its title, date and
text, and saves the text and the main image in a folder next to where you
run it (article_679431/).

The page has more than the article in it: a Facebook button and ads are
images too, and after the text come the editor's name, ads and contact
e-mails. The script keeps only the article itself.
"""

import os
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

URL = "https://petel.bg/Silna-gramotevichna-burya-vrahlita-Varna__679431"
HEADERS = {"User-Agent": "IRCourseBot/0.1 (student lab crawler)"}
OUT_DIR = "article_" + URL.rsplit("__", 1)[-1]      # article_679431

soup = BeautifulSoup(requests.get(URL, headers=HEADERS, timeout=10).text, "html.parser")
article = soup.select_one("article.preview")        # the block with the article

title = article.find("h1").get_text(strip=True)
# the date div also holds the comment count in a <span>: take only its own text
date = article.select_one("div.item-date").find(string=True, recursive=False).strip()

# The text: the paragraphs of div.item-text, up to the editor's name.
# Everything after it (ads, contact e-mails) is the same on every article.
paragraphs = []
for p in article.select_one("div.item-text").find_all("p"):
    line = p.get_text(" ", strip=True)
    if line.startswith("Редактор"):
        break
    if line:                                         # skip empty paragraphs
        paragraphs.append(line)
text = "\n\n".join(paragraphs)

# The main image has the class img-responsive. The first <img> in the article
# is the Facebook button, and the text contains an ad image.
img = article.select_one("img.img-responsive")
image_url = urljoin(URL, img["src"])

print("title:", title)
print("date: ", date)
print("image:", image_url)
print(len(paragraphs), "paragraphs,", len(text.split()), "words\n")
print(text)

# Save the text and the image.
os.makedirs(OUT_DIR, exist_ok=True)
with open(os.path.join(OUT_DIR, "article.txt"), "w", encoding="utf-8") as f:
    f.write(f"{title}\n{date}\n{URL}\n\n{text}\n")

image = requests.get(image_url, headers=HEADERS, timeout=10)
image_file = os.path.join(OUT_DIR, "image" + os.path.splitext(image_url)[1])   # keep the extension (.png)
with open(image_file, "wb") as f:                    # "wb": an image is bytes, not text
    f.write(image.content)

print(f"\nsaved {OUT_DIR}/article.txt and {image_file} ({len(image.content) // 1024} KB)")

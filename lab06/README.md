# Lab 06: Web Crawling and Scraping

Scripts for [Lab 06](https://elitsay.github.io/Information_Retrieval_course/docs/labs/lab06-crawling-pagerank.html).

| Script | Part | What it does |
| :--- | :--- | :--- |
| [`url_normalization.py`](url_normalization.py) | III | Normalizes a list of links found on one page and counts how many different pages are left. Set `AGGRESSIVE = True` to also apply the steps that are not safe in general. |
| [`bs_basics.py`](bs_basics.py) | V | Parses a small job-list page with BeautifulSoup and prints each common call next to what it returns. |
| [`job_page.py`](job_page.py) | V | Downloads a Google Careers job ad and prints its title, location and description. |

```bash
pip install requests beautifulsoup4
python url_normalization.py
python bs_basics.py
python job_page.py
```

`url_normalization.py` needs only the Python standard library. `job_page.py` downloads a live page: if Google changes the page or takes the ad down, the class names in the script need updating.

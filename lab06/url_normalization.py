"""URL normalization for a crawler (Lab 06, Part III).

Run it with:  python url_normalization.py

The script normalizes a list of links found on one page and prints each
link next to its normalized form. At the end it counts how many different
pages are left. Set AGGRESSIVE = True to also apply the steps that are
not safe in general, and compare the counts.

Only the Python standard library is used.
"""

from urllib.parse import urljoin, urlsplit, urlunsplit, parse_qsl, urlencode

# The page on which the links below were found. Relative links are resolved against it.
BASE = "https://example.org/news/today.html"

# The links, as they appear in the href attributes of that page.
LINKS = [
    "https://example.org/page",
    "https://EXAMPLE.org/page",                   # upper-case host
    "https://example.org/page#comments",          # fragment
    "https://example.org:443/page",               # default port
    "https://example.org/a/../page",              # dot segments
    "../page",                                    # relative link
    "/page/",                                     # trailing slash
    "/page?utm_source=newsletter&id=7",           # tracking parameter
    "/page?id=7",
    "/page?lang=en&id=7",                         # same parameters, other order
    "/page?id=7&lang=en",
    "/page?id=8",                                 # a different page
]

# The last three steps are NOT safe in general: they may merge pages that really differ.
AGGRESSIVE = False

DEFAULT_PORTS = {"http": 80, "https": 443}
TRACKING = ("utm_", "_gl", "fbclid", "gclid")


def remove_dot_segments(path):
    """Remove "." and ".." from a URL path, e.g. /a/./b/../page -> /a/page."""
    out = []
    for part in path.split("/"):
        if part == "..":
            if len(out) > 1:
                out.pop()
        elif part != ".":
            out.append(part)
    if path.endswith(("/.", "/..")):
        out.append("")
    return "/".join(out) or "/"


def normalize(link, base=BASE, aggressive=AGGRESSIVE):
    """Return the normalized form of a link found on the page base."""
    url = urljoin(base, link)                     # resolve relative links
    parts = urlsplit(url)

    scheme = parts.scheme.lower()                 # HTTPS -> https
    host = (parts.hostname or "").lower()         # EXAMPLE.org -> example.org
    port = parts.port
    netloc = host if port in (None, DEFAULT_PORTS.get(scheme)) else f"{host}:{port}"   # drop :443

    path = remove_dot_segments(parts.path or "/") # /a/../page -> /page
    query = parts.query
    # the fragment (#comments) is dropped: it points inside the page, not to another page

    if aggressive:
        if len(path) > 1 and path.endswith("/"):  # /page/ -> /page
            path = path[:-1]
        params = [(k, v) for k, v in parse_qsl(query, keep_blank_values=True)
                  if not k.startswith(TRACKING)]  # drop utm_source=...
        query = urlencode(sorted(params))         # lang=en&id=7 -> id=7&lang=en

    return urlunsplit((scheme, netloc, path, query, ""))


if __name__ == "__main__":
    print(f"links found on {BASE}")
    print(f"aggressive steps: {'on' if AGGRESSIVE else 'off'}\n")
    width = max(len(link) for link in LINKS)
    for link in LINKS:
        print(f"{link:<{width}}  ->  {normalize(link)}")

    absolute = {urljoin(BASE, link) for link in LINKS}
    unique = {normalize(link) for link in LINKS}
    print(f"\n{len(LINKS)} links, {len(absolute)} different URLs, "
          f"{len(unique)} different pages after normalization")

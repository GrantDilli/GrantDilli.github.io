"""Download the Google Fonts the games use into fonts/, so builds load nothing external.

Run once (or when a game adds a font): python3 tools/playgama/fetch_fonts.py
Writes fonts/<family>.css (latin subset, local woff2 urls) plus the woff2 files.
"""
import pathlib, re, urllib.request

FAMILIES = {
    "bungee-rubik": "family=Bungee&family=Rubik:wght@400;500",
    "unbounded-figtree": "family=Unbounded:wght@400;500;600&family=Figtree:wght@400;500;600;700",
}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
OUT = pathlib.Path(__file__).parent / "fonts"

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})).read()

for name, query in FAMILIES.items():
    css = get(f"https://fonts.googleapis.com/css2?{query}&display=swap").decode()
    # Keep only the latin blocks: every game's text is English.
    blocks = re.findall(r"/\* latin \*/\s*(@font-face \{.*?\})", css, re.S)
    out, seen = [], {}
    for b in blocks:
        url = re.search(r"url\((https://[^)]+\.woff2)\)", b).group(1)
        fam = re.search(r"font-family: '([^']+)'", b).group(1).replace(" ", "")
        wt = re.search(r"font-weight: (\d+)", b).group(1)
        # Variable fonts serve one file for every weight; download it once.
        fname = seen.setdefault(url, f"{fam}-{wt}.woff2")
        if not (OUT / fname).exists():
            (OUT / fname).write_bytes(get(url))
        out.append(b.replace(url, fname))
    (OUT / f"{name}.css").write_text("\n".join(out) + "\n")
    print(name, len(out), "faces")

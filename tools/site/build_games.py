#!/usr/bin/env python3
"""Copy the standalone game builds into the site's games/ folder.

The builds are made for Playgama (Bridge SDK + pg-glue.js). On our own site the Bridge
script is dropped and pg-glue.js is swapped for games/site-glue.js, which starts the game,
keeps saves in this browser, runs the Daily Challenge and adds the small home button.
Each page also gets its own title and description so search engines can list it.

Usage: python3 tools/site/build_games.py <site_root> [project_files_root]
"""
import html, json, pathlib, re, shutil, sys

SITE = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
PF = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '/mnt/project-files')
GAMES = json.loads((SITE / 'games' / 'games.json').read_text())
SKIP = {'pg-glue.js', 'playgama-bridge-config.json'}

for g in GAMES:
    src, dst = PF / g['source'], SITE / 'games' / g['id']
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=lambda d, names: [n for n in names if n in SKIP])
    page = dst / 'index.html'
    text = page.read_text()
    text, n = re.subn(r'<script src="https://bridge\.playgama\.com/[^"]*"></script>\n?', '', text)
    assert n == 1, (g['id'], 'bridge tag')
    text, n = re.subn(r'<script src="pg-glue\.js"></script>',
                      f'<script src="../site-glue.js" data-game="{g["id"]}"></script>', text)
    assert n == 1, (g['id'], 'glue tag')
    title = html.escape(f'{g["name"]}: {g["seo"]} | Infinite Games')
    meta = (f'<meta name="description" content="{html.escape(g["blurb"])}">'
            f'<link rel="canonical" href="https://grantdilli.github.io/games/{g["id"]}/">')
    text, n = re.subn(r'<title>[^<]*</title>', f'<title>{title}</title>{meta}', text, count=1)
    assert n == 1, (g['id'], 'title')
    assert 'playgama.com' not in text and '../../' not in text, g['id']
    page.write_text(text)
    print('built', g['id'])

urls = ['https://grantdilli.github.io/'] + [f'https://grantdilli.github.io/games/{g["id"]}/' for g in GAMES]
(SITE / 'sitemap.xml').write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n')

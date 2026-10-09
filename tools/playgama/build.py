"""Build one Playgama upload zip per game from the live site files.

Usage: python3 tools/playgama/build.py <site_root> <out_dir>
"""
import pathlib, re, shutil, sys, zipfile

BRIDGE = "https://bridge.playgama.com/v1/stable/playgama-bridge.js"
HERE = pathlib.Path(__file__).parent
# Where each game reaches a natural break, so an interstitial can show there.
# A hook ending in "{" gets the call after it; any other hook gets the call before it.
HOOKS = {
    "snake": ["function over(){"],
    "vortex-bloom": ["function levelClear(){", "function gameOver(){"],
    "topple": ["const k=li;if(!save.best[k]"],  # level cleared, not fall/spawn
    "twin-comets": ["function fail(now,why='late'){", "function win(){"],
    "flux-weave": ["function endRound(){"],
    "spindle-hop": ["function endRound(){"],
}
HEAD = (f'<script src="{BRIDGE}"></script>\n<script src="pg-glue.js"></script>\n'
        '<style>a[href^="../../"]{display:none!important}</style>\n')

def build(site, out):
    out.mkdir(parents=True, exist_ok=True)
    for game, hooks in HOOKS.items():
        html = (site / "games" / game / "index.html").read_text()
        html = html.replace('href="../../style.css"', 'href="style.css"')
        for h in hooks:
            assert html.count(h) == 1, (game, h)
            call = "window.pgBreak&&pgBreak();"
            html = html.replace(h, h + call if h.endswith("{") else call + h)
        html, n = re.subn(r"<head>", "<head>\n" + HEAD, html, count=1)
        assert n == 1, game
        stage = out / game
        shutil.rmtree(stage, ignore_errors=True)
        stage.mkdir()
        (stage / "index.html").write_text(html)
        shutil.copy(site / "style.css", stage)
        shutil.copy(HERE / "pg-glue.js", stage)
        shutil.copy(HERE / "playgama-bridge-config.json", stage)
        with zipfile.ZipFile(out / f"{game}.zip", "w", zipfile.ZIP_DEFLATED) as z:
            for f in sorted(stage.iterdir()):
                z.write(f, f.name)
        print(game, (out / f"{game}.zip").stat().st_size, "bytes")

if __name__ == "__main__":
    build(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]))

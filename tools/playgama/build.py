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
    "spindle-hop": ["function gameOver(){"],
}
FONTS = {"vortex-bloom": "unbounded-figtree"}  # every other game uses bungee-rubik
# Every game page already fills the screen (games/fs.css). The portal runs its own
# full-screen control, so the game's button is hidden.
STYLE = ('a[href^="../../"],[data-fs]{display:none!important}'
         'body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}'
         'input,textarea{-webkit-user-select:text;user-select:text}')

def build(site, out):
    out.mkdir(parents=True, exist_ok=True)
    for game, hooks in HOOKS.items():
        html = (site / "games" / game / "index.html").read_text()
        html = html.replace('href="../../style.css"', 'href="style.css"')
        html = html.replace('href="../fs.css"', 'href="fs.css"').replace('src="../fs.js"', 'src="fs.js"')
        # Bundle fonts locally: the build may load nothing but the Bridge from outside.
        html = re.sub(r'<link rel="preconnect"[^>]*>\n?', "", html)
        html, n = re.subn(r'<link[^>]*fonts\.googleapis\.com/css2[^>]*>', '<link rel="stylesheet" href="fonts/fonts.css">', html)
        assert n == 1, game
        # Hold the game script until the glue has initialized the Bridge and loaded saves.
        html, n = re.subn(r"<script>", '<script type="text/plain" data-pg-game>', html)
        assert n == 1, game
        assert "https://" not in html, game
        for h in hooks:
            assert html.count(h) == 1, (game, h)
            call = "window.pgBreak&&pgBreak();"
            html = html.replace(h, h + call if h.endswith("{") else call + h)
        head = (f'<script src="{BRIDGE}"></script>\n<script src="pg-glue.js"></script>\n'
                + f"<style>{STYLE}</style>\n")
        html, n = re.subn(r"<head>", "<head>\n" + head, html, count=1)
        assert n == 1, game
        stage = out / game
        shutil.rmtree(stage, ignore_errors=True)
        stage.mkdir()
        (stage / "index.html").write_text(html)
        shutil.copy(site / "style.css", stage)
        shutil.copy(HERE / "pg-glue.js", stage)
        if "fs.js" in html:
            shutil.copy(site / "games" / "fs.js", stage)
        if "fs.css" in html:
            shutil.copy(site / "games" / "fs.css", stage)
        shutil.copy(HERE / "playgama-bridge-config.json", stage)
        fonts = stage / "fonts"
        fonts.mkdir()
        css = (HERE / "fonts" / f"{FONTS.get(game, 'bungee-rubik')}.css").read_text()
        (fonts / "fonts.css").write_text(css)
        for f in set(re.findall(r"url\(([^)]+)\)", css)):
            shutil.copy(HERE / "fonts" / f, fonts)
        with zipfile.ZipFile(out / f"{game}.zip", "w", zipfile.ZIP_DEFLATED) as z:
            for f in sorted(stage.rglob("*")):
                if f.is_file():
                    z.write(f, f.relative_to(stage).as_posix())
        print(game, (out / f"{game}.zip").stat().st_size, "bytes")

if __name__ == "__main__":
    build(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]))

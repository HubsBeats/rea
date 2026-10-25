"""Builds a one-document version of Pixelpad for single-link hosting.

Usage: python3 build-single.py OUT_DIR
Writes OUT_DIR/index.html (home + editor markup, no document wrapper) and
copies css/ and js/ beside it.
"""

import re
import shutil
import sys
from pathlib import Path

root = Path(__file__).parent
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)


def body(name, cls):
    text = (root / name).read_text()
    inner = re.search(rf'<body class="{cls}">(.*?)</body>', text, re.S).group(1)
    return re.sub(r'\s*<script type="module"[^>]*></script>', "", inner)


fonts = re.search(r'(<link\s+rel="stylesheet"\s+href="https://fonts[^>]*>)', (root / "editor.html").read_text(), re.S).group(1)
page = f"""<title>Pixelpad</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
{fonts}
<link rel="stylesheet" href="css/base.css" />
<link rel="stylesheet" href="css/home.css" />
<link rel="stylesheet" href="css/editor.css" />
<style>html, body {{ height: 100%; }} #home-view, #editor-view {{ display: contents; }} [hidden] {{ display: none !important; }}</style>
<div id="home-view" hidden>{body("index.html", "home")}</div>
<div id="editor-view" hidden>{body("editor.html", "editor")}</div>
<script type="module" src="js/single.js"></script>
"""
(out / "index.html").write_text(page)
for folder in ("css", "js"):
    shutil.rmtree(out / folder, ignore_errors=True)
    shutil.copytree(root / folder, out / folder)
print(f"wrote {out / 'index.html'}")

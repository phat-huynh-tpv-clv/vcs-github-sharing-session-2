from pathlib import Path
root = Path(__file__).resolve().parent
html = (root / 'dist/index.html').read_text()
css = (root / 'dist/style.css').read_text()
js = (root / 'dist/app.js').read_text()
assert '</script' not in js.lower()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')
html = html.replace('<script src="app.js"></script>', '<script>' + js + '</script>')
out = root / 'Git-Session-2.html'
out.write_text(html)
print(f'Created {out} ({out.stat().st_size:,} bytes)')

# Keep the GitHub Pages entry point in sync with the standalone download.
(root / 'index.html').write_text(html)
print('Updated index.html for GitHub Pages')

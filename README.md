# CBZ Reader

A small, dependency-free web app for reading `.cbz` comic book files right in your browser.
Nothing is uploaded — the archive is opened locally on your device.

**Live app:** https://kartikay633.github.io/cbz-reader/

## Features

- Open a `.cbz` (or `.zip`) with the file picker or by dragging it onto the page
- Pages sorted naturally (`page2` comes before `page10`)
- Three reading modes: **single page**, **two-page spreads**, and **vertical scroll** (webtoon style)
- Three sizes: **fit screen**, **fit width**, **original size**
- **Manga mode** for right-to-left reading
- Page slider, page grid with thumbnails, fullscreen
- Remembers your last page for each book, plus your layout preferences
- Reads the title from `ComicInfo.xml` when the archive has one
- Pages are decompressed lazily, so big books open fast

## Controls

| Action | Keys / gestures |
| --- | --- |
| Next / previous page | `→` / `←`, `D` / `A`, click or tap the right / left third of the page, swipe |
| Scroll within a page, then turn | `Space` / `Shift+Space`, `PageDown` / `PageUp` |
| Scroll | `↓` / `↑`, `S` / `W` |
| First / last page | `Home` / `End` |
| Page grid | `G` |
| Fullscreen | `F` |
| Hide / show toolbars | `H`, or click the middle of the page |

## Run it locally

It's a static site — any web server works:

```bash
python -m http.server 8000
```

Then open http://localhost:8000. (Opening `index.html` straight from disk also works for your own
files; only the "Try a sample" button needs a server.)

## Project layout

```
index.html            page markup
style.css             styles
app.js                reader logic (uses JSZip from cdnjs)
sample/sample.cbz     generated demo comic
tools/make_sample.py  regenerates the demo comic (needs Pillow)
```

## License

MIT

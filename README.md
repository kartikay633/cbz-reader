# CBZ Reader

A small desktop app for reading `.cbz` comic book files. Double-click a comic and read it,
page by page. Built with Electron; works offline and never uploads your files.

## Download (Windows)

Get the latest version from the [Releases page](https://github.com/kartikay633/cbz-reader/releases/latest):

- **CBZ-Reader-Setup-x.y.z.exe**: installer. Adds a Start menu shortcut and lets you open
  `.cbz` files by double-clicking them.
- **CBZ-Reader-x.y.z-portable.exe**: no install, just run it.

The app isn't code-signed, so Windows SmartScreen may warn you the first time.
Click **More info → Run anyway**.

## Features

- Open a `.cbz` (or `.zip`) with **Ctrl+O**, by dragging it onto the window, or by double-clicking it in Explorer
- Pages sorted naturally (`page2` comes before `page10`)
- Three reading modes: **single page**, **two-page spreads**, and **vertical scroll** (webtoon style)
- Three sizes: **fit screen**, **fit width**, **original size**
- **Manga mode** for right-to-left reading
- Page slider, page grid with thumbnails, fullscreen
- Remembers your last page for each book, plus your layout preferences
- Reads the title from `ComicInfo.xml` when the archive has one
- Pages are decompressed only when needed, so big books open fast

## Controls

| Action | Keys / mouse |
| --- | --- |
| Open a file | `Ctrl+O` |
| Next / previous page | `→` / `←`, `D` / `A`, click the right / left third of the page |
| Scroll within a page, then turn | `Space` / `Shift+Space`, `PageDown` / `PageUp` |
| Scroll | `↓` / `↑`, `S` / `W` |
| First / last page | `Home` / `End` |
| Page grid | `G` |
| Fullscreen | `F` or `F11` |
| Hide / show toolbars | `H`, or click the middle of the page |
| Close the book | `Ctrl+W` |

## Run from source

Needs [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm start
```

Build the Windows installer and portable `.exe` into `dist/`:

```bash
npm run dist
```

(On Windows, build from a short folder path such as `C:\src\cbz-reader`: the NSIS installer
tool fails when paths exceed 260 characters.)

## Project layout

```
electron/main.js      app window, menus, file opening, single-instance handling
electron/preload.js   the small API the page uses (window.cbz)
src/                  the reader UI: index.html, style.css, app.js
sample/sample.cbz     demo comic behind the "Try a sample" button
build/icon.png        app icon
tools/make_sample.py  regenerates the demo comic (needs Pillow)
```

## License

MIT

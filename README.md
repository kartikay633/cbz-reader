# CBZ Reader

A small desktop app for reading `.cbz` comic book files. Double-click a comic and read it,
page by page. Built with Electron; works offline and never uploads your files.

## Quick start (Windows)

1. Clone or download this repo.
2. Double-click **`Start CBZ Reader.bat`**.

That's it. The first time, it downloads the ready-made app (about 110 MB) into an `app\` folder
next to it; after that it opens straight away. No Node.js or other tools needed.
Tip: drag a `.cbz` file onto `Start CBZ Reader.bat` to open it directly.

## Download without cloning

Grab one of these from the [Releases page](https://github.com/kartikay633/cbz-reader/releases/latest):

- **CBZ-Reader-Setup.exe**: installer. Adds a Start menu shortcut and lets you open
  `.cbz` files by double-clicking them.
- **CBZ-Reader-portable.exe**: no install, just run it.

If you download an `.exe` in your browser, Windows SmartScreen may warn you the first time
because the app isn't code-signed. Click **More info → Run anyway**.

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

## Run from source (for developers)

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
Start CBZ Reader.bat  one-click launcher (downloads the latest release on first run)
electron/main.js      app window, menus, file opening, single-instance handling
electron/preload.js   the small API the page uses (window.cbz)
src/                  the reader UI: index.html, style.css, app.js
sample/sample.cbz     small demo comic for trying the app
build/icon.png        app icon
tools/make_sample.py  regenerates the demo comic (needs Pillow)
```

## License

MIT

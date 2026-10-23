'use strict';

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const REPO_URL = 'https://github.com/kartikay633/cbz-reader';
const COMIC_RE = /\.(cbz|zip)$/i;
const SHORTCUTS = [
  'Next / previous page:  → / ←, D / A, click the right / left of the page',
  'Scroll, then turn page:  Space / Shift+Space',
  'First / last page:  Home / End',
  'All pages:  G',
  'Fullscreen:  F or F11',
  'Hide / show toolbars:  H, or click the middle of the page',
  'Open a file:  Ctrl+O',
].join('\n');

let win = null;
let pageReady = false;
// A file passed on the command line, e.g. when a .cbz is double-clicked in Explorer.
let pendingPath = fileFromArgs(process.argv);

function fileFromArgs(argv) {
  return argv.slice(1).find((arg) => COMIC_RE.test(arg)) || null;
}

async function sendFile(filePath) {
  if (!win || !pageReady) {
    pendingPath = filePath;
    return;
  }
  try {
    const data = await fs.readFile(filePath);
    win.webContents.send('open-file', { name: path.basename(filePath), data });
    app.addRecentDocument(filePath);
  } catch (err) {
    dialog.showErrorBox('Could not open file', `${filePath}\n\n${err.message}`);
  }
}

async function showOpenDialog() {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Open comic',
    filters: [{ name: 'Comic book archives', extensions: ['cbz', 'zip'] }],
    properties: ['openFile'],
  });
  if (!canceled && filePaths[0]) sendFile(filePaths[0]);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 850,
    minWidth: 420,
    minHeight: 360,
    title: 'CBZ Reader',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: '#121214',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', () => {
    pageReady = true;
    if (pendingPath) {
      const filePath = pendingPath;
      pendingPath = null;
      sendFile(filePath);
    }
  });
  // The reader is the only page this window ever shows; links open in the default browser.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => {
    win = null;
    pageReady = false;
  });
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: showOpenDialog },
        { label: 'Close Book', accelerator: 'CmdOrCtrl+W', click: () => win?.webContents.send('close-book') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        ...(app.isPackaged ? [] : [{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          click: () => dialog.showMessageBox(win, { title: 'Keyboard shortcuts', message: 'Keyboard shortcuts', detail: SHORTCUTS }),
        },
        { label: 'Project on GitHub', click: () => shell.openExternal(REPO_URL) },
        { type: 'separator' },
        { label: `CBZ Reader ${app.getVersion()}`, enabled: false },
      ],
    },
  ]);
}

ipcMain.on('open-dialog', showOpenDialog);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Opening another .cbz while the app is running reuses the existing window.
  app.on('second-instance', (_e, argv) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    const filePath = fileFromArgs(argv);
    if (filePath) sendFile(filePath);
  });
  // macOS delivers "Open with" files through this event instead of argv.
  app.on('open-file', (e, filePath) => {
    e.preventDefault();
    sendFile(filePath);
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(buildMenu());
    createWindow();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (!win) createWindow();
  });
}

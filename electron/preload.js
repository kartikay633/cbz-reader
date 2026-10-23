'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// The small, safe surface the reader page gets from the app (window.cbz).
contextBridge.exposeInMainWorld('cbz', {
  openDialog: () => ipcRenderer.send('open-dialog'),
  onOpenFile: (callback) => ipcRenderer.on('open-file', (_e, file) => callback(file)),
  onCloseBook: (callback) => ipcRenderer.on('close-book', () => callback()),
});

'use strict';
const {app, BrowserWindow, shell, ipcMain} = require('electron');
const path = require('node:path');

function createMainWindow() {
  const win = new BrowserWindow({
    width: 860, height: 630, minWidth: 650, minHeight: 450,
    title: 'Math Curator Desktop — Prototype',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
  win.webContents.on('will-navigate', event => event.preventDefault());
}

function openYouTubeWindow() {
  // Browser isolated from the local UI. No privileged preload or Node access.
  const win = new BrowserWindow({
    width: 1200, height: 820,
    title: 'YouTube — Math Curator (sans filtrage)',
    webPreferences: {nodeIntegration: false, contextIsolation: true, sandbox: true}
  });
  win.webContents.setWindowOpenHandler(({url}) => {
    if (/^https:\/\/(www\.)?youtube\.com\//.test(url)) {
      win.loadURL(url);
    } else if (/^https:\/\//.test(url)) {
      shell.openExternal(url);
    }
    return {action: 'deny'};
  });
  win.loadURL('https://www.youtube.com/');
}

app.whenReady().then(() => {
  ipcMain.handle('open-youtube-external', () => shell.openExternal('https://www.youtube.com/'));
  ipcMain.handle('open-youtube-window', () => openYouTubeWindow());
  createMainWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

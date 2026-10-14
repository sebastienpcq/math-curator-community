'use strict';
const {app, BrowserWindow, shell, ipcMain} = require('electron');
const path = require('node:path');
const fs = require('node:fs');

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

const isYouTube = input => {
  try { const u = new URL(input); return u.protocol === 'https:' && ['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname); }
  catch { return false; }
};
const isGoogleSignIn = input => {
  try { const u = new URL(input); return u.protocol === 'https:' && u.hostname === 'accounts.google.com'; }
  catch { return false; }
};
function openGoogleSignInTest(url) {
  const auth = new BrowserWindow({
    width: 620, height: 780, title: 'Test Google Sign-In — ne pas saisir de mot de passe',
    webPreferences: {nodeIntegration: false, contextIsolation: true, sandbox: true}
  });
  auth.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
  auth.webContents.on('will-navigate', (event, target) => {
    if (!isGoogleSignIn(target) && !isYouTube(target)) {
      event.preventDefault();
    }
  });
  auth.loadURL(url);
}
function openYouTubeWindow() {
  // Browser isolated from the local UI. No privileged preload or Node access.
  const win = new BrowserWindow({
    width: 1200, height: 820,
    title: 'YouTube — Math Curator (filtrage expérimental)',
    webPreferences: {nodeIntegration: false, contextIsolation: true, sandbox: true}
  });
  win.webContents.setWindowOpenHandler(({url}) => {
    if (isGoogleSignIn(url)) {
      openGoogleSignInTest(url);
    } else if (isYouTube(url)) {
      win.loadURL(url);
    } else if (/^https:\/\//.test(url)) {
      shell.openExternal(url);
    }
    return {action: 'deny'};
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!isYouTube(url)) {
      event.preventDefault();
      if (isGoogleSignIn(url)) openGoogleSignInTest(url);
      else if (url.startsWith('https://')) shell.openExternal(url);
    }
  });
  win.webContents.on('did-finish-load', async () => {
    if (!isYouTube(win.webContents.getURL())) return;
    try {
      const assets = ['../src/config.js','../src/scoring.js','filter-page.js']
        .map(file => fs.readFileSync(path.resolve(__dirname,file),'utf8')).join('\n');
      await win.webContents.insertCSS('.math-curator-desktop-hidden{display:none!important}');
      await win.webContents.executeJavaScript(assets);
    } catch (error) {
      console.error('Math Curator filtering injection failed:', error.message);
    }
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

'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('mathCuratorDesktop', Object.freeze({
  openExternal: () => ipcRenderer.invoke('open-youtube-external'),
  openIntegrated: () => ipcRenderer.invoke('open-youtube-window')
}));

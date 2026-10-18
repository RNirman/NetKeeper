import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hutchKeeper', {
  start: () => ipcRenderer.invoke('keep-alive:start'),
  stop: () => ipcRenderer.invoke('keep-alive:stop'),
  getStatus: () => ipcRenderer.invoke('keep-alive:status'),
});
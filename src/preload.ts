import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hutchKeeper', {
  start: (targetUrl: string, intervalSeconds: number) =>
  ipcRenderer.invoke('keep-alive:start', targetUrl, intervalSeconds),
  stop: () => ipcRenderer.invoke('keep-alive:stop'),
  getStatus: () => ipcRenderer.invoke('keep-alive:status'),
});
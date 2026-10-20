import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hutchKeeper', {
  start: (target: string, intervalSeconds: number) =>
    ipcRenderer.invoke('keep-alive:start', { target, intervalSeconds }),
  stop: () => ipcRenderer.invoke('keep-alive:stop'),
  getStatus: () => ipcRenderer.invoke('keep-alive:status'),
  onUpdate: (callback: (status: KeepAliveStatus) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      status: KeepAliveStatus,
    ) => callback(status);
    ipcRenderer.on('keep-alive:update', listener);
    return () => ipcRenderer.removeListener('keep-alive:update', listener);
  },
});

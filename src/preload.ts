import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hutchKeeper', {
  start: (targetUrl: string, intervalSeconds: number) =>
    ipcRenderer.invoke('keep-alive:start', targetUrl, intervalSeconds),

  stop: () => ipcRenderer.invoke('keep-alive:stop'),

  getStatus: () => ipcRenderer.invoke('keep-alive:status'),

  onResult: (callback: (result: {
    success: boolean;
    statusCode?: number;
    latency: number;
    error?: string;
    targetUrl?: string;
  }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      result: {
        success: boolean;
        statusCode?: number;
        latency: number;
        error?: string;
        targetUrl?: string;
      },
    ) => {
      callback(result);
    };

    ipcRenderer.on('keep-alive:result', listener);

    return () => {
      ipcRenderer.removeListener('keep-alive:result', listener);
    };
  },
});
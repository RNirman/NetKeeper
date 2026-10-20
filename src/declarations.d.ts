/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />
declare module '*.css';

type KeepAliveEvent = {
  timestamp: string;
  success: boolean;
  latencyMs: number | null;
  message: string;
};

type KeepAliveStatus = {
  running: boolean;
  target: string;
  intervalSeconds: number;
  requests: number;
  successful: number;
  failed: number;
  averageLatencyMs: number | null;
  recentEvents: KeepAliveEvent[];
};

interface Window {
  hutchKeeper: {
    start: (
      target: string,
      intervalSeconds: number,
    ) => Promise<KeepAliveStatus>;
    stop: () => Promise<KeepAliveStatus>;
    getStatus: () => Promise<KeepAliveStatus>;
    onUpdate: (callback: (status: KeepAliveStatus) => void) => () => void;
  };
}

/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

declare module '*.css';

interface HutchKeeperStatus {
  running: boolean;
}

interface KeepAliveResult {
  success: boolean;
  statusCode?: number;
  latency: number;
  error?: string;
  targetUrl?: string;
}

interface HutchKeeperStartResult {
  running: boolean;
  result: KeepAliveResult;
}

interface HutchKeeperAPI {
  start: (
    targetUrl: string,
    intervalSeconds: number,
  ) => Promise<HutchKeeperStartResult>;
  stop: () => Promise<HutchKeeperStatus>;
  getStatus: () => Promise<HutchKeeperStatus>;
  onResult: (callback: (result: KeepAliveResult) => void) => () => void;
}

declare global {
  interface Window {
    hutchKeeper: HutchKeeperAPI;
  }
}

export {};
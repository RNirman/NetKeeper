/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

declare module '*.css';

interface HutchKeeperStatus {
  running: boolean;
}

interface HutchKeeperStartResult {
  running: boolean;
  result: {
    success: boolean;
    statusCode?: number;
    latency: number;
    error?: string;
  };
}

interface HutchKeeperAPI {
  start: (
  targetUrl: string,
  intervalSeconds: number,
) => Promise<HutchKeeperStartResult>;
  stop: () => Promise<HutchKeeperStatus>;
  getStatus: () => Promise<HutchKeeperStatus>;
}

declare global {
  interface Window {
    hutchKeeper: HutchKeeperAPI;
  }
}

export {};
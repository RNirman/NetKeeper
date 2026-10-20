import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { isIP } from 'node:net';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const supportedIntervals = [5, 10, 15, 30, 60] as const;
const pingTimeoutMs = 5000;
const maxRecentEvents = 20;

type PingEvent = {
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
  recentEvents: PingEvent[];
};

let status: KeepAliveStatus = {
  running: false,
  target: '',
  intervalSeconds: 10,
  requests: 0,
  successful: 0,
  failed: 0,
  averageLatencyMs: null,
  recentEvents: [],
};
let intervalTimer: NodeJS.Timeout | undefined;
let activePing: ChildProcess | undefined;
let activePingTimeout: NodeJS.Timeout | undefined;
let pingGeneration = 0;
let totalLatencyMs = 0;

const broadcastStatus = () => {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('keep-alive:update', status);
  }
};

const isValidTarget = (target: string) => {
  const ipVersion = isIP(target);
  if (ipVersion !== 0) {
    return true;
  }
  if (target.length > 253) {
    return false;
  }

  return target
    .split('.')
    .every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[a-zA-Z0-9-]+$/.test(label) &&
        !label.startsWith('-') &&
        !label.endsWith('-'),
    );
};

const recordPing = (
  generation: number,
  success: boolean,
  latencyMs: number | null,
  message: string,
) => {
  if (generation !== pingGeneration || !status.running) {
    return;
  }

  const event: PingEvent = {
    timestamp: new Date().toISOString(),
    success,
    latencyMs,
    message,
  };

  status = {
    ...status,
    requests: status.requests + 1,
    successful: status.successful + (success ? 1 : 0),
    failed: status.failed + (success ? 0 : 1),
    averageLatencyMs: success
      ? Math.round(
          (totalLatencyMs + (latencyMs ?? 0)) / (status.successful + 1),
        )
      : status.averageLatencyMs,
    recentEvents: [event, ...status.recentEvents].slice(0, maxRecentEvents),
  };

  if (success) {
    totalLatencyMs += latencyMs ?? 0;
  }

  broadcastStatus();
};

const pingTarget = (target: string, generation: number) => {
  if (!status.running || generation !== pingGeneration || activePing) {
    return;
  }

  const args =
    process.platform === 'win32'
      ? ['-n', '1', '-w', String(pingTimeoutMs), target]
      : process.platform === 'darwin'
        ? ['-c', '1', '-W', String(pingTimeoutMs), target]
        : ['-c', '1', '-W', String(Math.ceil(pingTimeoutMs / 1000)), target];
  const startedAt = Date.now();
  let settled = false;
  let timeout: NodeJS.Timeout | undefined;
  let output = '';
  let child: ChildProcess;

  const finish = (success: boolean, message: string) => {
    if (settled) {
      return;
    }
    settled = true;
    if (timeout) {
      clearTimeout(timeout);
    }
    if (activePingTimeout === timeout) {
      activePingTimeout = undefined;
    }
    if (activePing === child) {
      activePing = undefined;
    }

    const reportedLatency = output.match(/time[=<]\s*(\d+(?:\.\d+)?)\s*ms/i);
    const latencyMs = reportedLatency
      ? Number(reportedLatency[1])
      : Date.now() - startedAt;
    recordPing(generation, success, success ? latencyMs : null, message);
  };

  try {
    child = spawn('ping', args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    activePing = child;
  } catch (error) {
    recordPing(
      generation,
      false,
      null,
      error instanceof Error ? error.message : 'Unable to start ping.',
    );
    return;
  }

  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    output = `${output}${chunk}`.slice(-4096);
  });

  timeout = setTimeout(() => {
    child.kill();
    finish(false, 'Ping timed out.');
  }, pingTimeoutMs + 1000);
  activePingTimeout = timeout;

  child.once('error', (error) => finish(false, error.message));
  child.once('close', (code) => {
    finish(code === 0, code === 0 ? 'Ping succeeded.' : 'No ping response.');
  });
};

const stopKeepAlive = () => {
  status = { ...status, running: false };
  pingGeneration += 1;
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = undefined;
  }
  if (activePingTimeout) {
    clearTimeout(activePingTimeout);
    activePingTimeout = undefined;
  }
  if (activePing) {
    activePing.kill();
    activePing = undefined;
  }
  broadcastStatus();
  return status;
};

ipcMain.handle('keep-alive:start', (_event, input: unknown) => {
  if (typeof input !== 'object' || input === null || !('target' in input)) {
    throw new Error('Enter a valid hostname or IP address.');
  }

  const { target, intervalSeconds } = input as {
    target: unknown;
    intervalSeconds: unknown;
  };
  if (typeof target !== 'string' || !isValidTarget(target.trim())) {
    throw new Error('Enter a valid hostname or IP address.');
  }
  if (
    typeof intervalSeconds !== 'number' ||
    !supportedIntervals.includes(
      intervalSeconds as (typeof supportedIntervals)[number],
    )
  ) {
    throw new Error('Choose a supported ping interval.');
  }

  if (status.running) {
    return status;
  }

  const normalizedTarget = target.trim();
  status = {
    running: true,
    target: normalizedTarget,
    intervalSeconds,
    requests: 0,
    successful: 0,
    failed: 0,
    averageLatencyMs: null,
    recentEvents: [],
  };
  totalLatencyMs = 0;
  const generation = ++pingGeneration;
  pingTarget(normalizedTarget, generation);
  intervalTimer = setInterval(
    () => pingTarget(normalizedTarget, generation),
    intervalSeconds * 1000,
  );
  broadcastStatus();
  return status;
});

ipcMain.handle('keep-alive:stop', () => stopKeepAlive());
ipcMain.handle('keep-alive:status', () => status);

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 700,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

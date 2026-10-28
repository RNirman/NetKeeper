import { app, BrowserWindow, ipcMain } from "electron";
import { sendKeepAliveRequest } from "./keepAliveService";
import path from "node:path";
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let keepAliveRunning = false;
let keepAliveTimer: NodeJS.Timeout | null = null;

ipcMain.handle(
  "keep-alive:start",
  async (_event, targetUrl: string, intervalSeconds: number) => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
    }

    keepAliveRunning = true;

    const runRequest = async () => {
      if (!keepAliveRunning) {
        return null;
      }

      const result = await sendKeepAliveRequest(targetUrl);

      console.log("Keep-alive result:", result);

      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send("keep-alive:result", result);
      });

      return result;
    };

    const firstResult = await runRequest();

    keepAliveTimer = setInterval(runRequest, intervalSeconds * 1000);

    console.log(
      `Keep-alive started: ${targetUrl} every ${intervalSeconds} seconds`,
    );

    return {
      running: keepAliveRunning,
      result: firstResult,
    };
  },
);

ipcMain.handle("keep-alive:stop", () => {
  keepAliveRunning = false;

  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }

  console.log("Keep-alive stopped");

  return {
    running: keepAliveRunning,
  };
});

ipcMain.handle("keep-alive:status", () => {
  return {
    running: keepAliveRunning,
  };
});

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

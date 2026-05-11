/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Electron main process scaffold that creates a BrowserWindow loading the built starter app.
 * @sidecar main.mjs.header.md
 * @layer templates | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Electron main process — creates a BrowserWindow loading the starter app.
 *
 * Copy this template into your project root and run:
 *   npm install
 *   npm run build:app
 *   npm start
 *
 * The starter app detects the Electron environment automatically via
 * window.electronAPI (exposed by preload.mjs) and switches to IndexedDB
 * storage through the platform adapter factory.
 *
 * SpecRefs: TPL-033
 */

import { app, BrowserWindow } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the built starter app from dist/
  win.loadFile(join(__dirname, 'dist', 'index.html'));
}

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

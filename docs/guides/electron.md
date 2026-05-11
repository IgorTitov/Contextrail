<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Full guide for wrapping the starter app as an Electron desktop application: setup, architecture, IPC extension patterns, and security requirements.
@sidecar electron.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

<!--
SpecRefs: TPL-034
-->

# Electron desktop app guide

Wrap the starter app as a cross-platform desktop application using Electron.

## Prerequisites

- Node.js 18+
- The scaffold in `templates/electron/`

## Quick start

1. Copy the scaffold:

```bash
cp -r templates/electron/ my-electron-app/
cd my-electron-app
```

2. Install dependencies:

```bash
npm install
```

3. Build the starter app into the scaffold's `dist/`:

```bash
npm run build:app
```

4. Launch:

```bash
npm start
```

## How it works

### Main process (`main.mjs`)

Creates a `BrowserWindow` that loads `dist/index.html`. The window is
configured with:

- `contextIsolation: true` — Renderer cannot access Node.js APIs directly.
- `nodeIntegration: false` — Secure by default.
- `preload: preload.mjs` — Exposes a controlled API bridge.

### Preload (`preload.mjs`)

Exposes `window.electronAPI` via `contextBridge.exposeInMainWorld()`. The
starter app's environment detection sees this object and identifies the
Electron runtime.

### Storage

In Electron mode, the adapter factory selects IndexedDB (which Chromium
provides natively in the renderer process). If IndexedDB is unavailable
for any reason, it falls back to localStorage, then memory.

### Environment detection chain

```
preload.mjs exposes window.electronAPI
  -> app-config.mjs detectMode() sees hasElectronAPI
  -> environment-detect.mjs probes capabilities
  -> adapter-factory.mjs selects indexedDB adapter
```

## Customizing

### Adding IPC channels

1. Define the channel in `main.mjs`:

```javascript
import { ipcMain } from 'electron';

ipcMain.handle('read-file', async (_event, filePath) => {
  const { readFile } = await import('node:fs/promises');
  return readFile(filePath, 'utf-8');
});
```

2. Expose it in `preload.mjs`:

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  readFile: (path) => ipcRenderer.invoke('read-file', path),
});
```

3. Use it in the renderer (starter app code):

```javascript
const content = await window.electronAPI.readFile('/path/to/file');
```

### Building for distribution

Use [electron-builder](https://www.electron.build/) or
[electron-forge](https://www.electronforge.io/) for packaging:

```bash
npm install --save-dev electron-builder
npx electron-builder --mac --win --linux
```

## Security notes

- Always use `contextIsolation: true` and `nodeIntegration: false`.
- Never expose broad Node.js APIs via preload. Expose specific functions.
- Validate all IPC inputs in the main process.
- Keep Electron updated for security patches.

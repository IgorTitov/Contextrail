<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Quick-start documentation for the Electron scaffold: how to copy, build, and run the desktop wrapper.
@sidecar README.md.header.md
@layer templates | @hex _none_ | @ctx _none_
@public false
@edit careful -->

<!--
SpecRefs: TPL-033
-->

# Electron scaffold

Starter scaffold for wrapping the app as an Electron desktop application.

## Quick start

1. Copy this directory to your project root.
2. Install dependencies: `npm install`
3. Build the starter app: `npm run build:app`
4. Launch: `npm start`

## How it works

- `main.mjs` creates a `BrowserWindow` loading `dist/index.html`.
- `preload.mjs` exposes `window.electronAPI` with context isolation.
- The starter app detects `electronAPI` and switches to IndexedDB storage
  via the platform adapter factory.

## Customizing

- Edit `main.mjs` to change window size, menu, or add IPC handlers.
- Edit `preload.mjs` to expose additional Node.js APIs to the renderer.
- The build script copies the starter app into `dist/` — no bundler needed.

See [docs/guides/electron.md](../../docs/guides/electron.md) for the full guide.

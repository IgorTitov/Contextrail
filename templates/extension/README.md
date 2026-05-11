<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Quick-start documentation for the browser extension scaffold: build the app, assemble the extension directory, and load it unpacked.
@sidecar README.md.header.md
@layer templates | @hex _none_ | @ctx _none_
@public false
@edit careful -->

<!--
SpecRefs: TPL-033
-->

# Browser extension scaffold

Starter scaffold for wrapping the app as a Chrome/Edge/Firefox extension
using Manifest V3.

## Quick start

1. Build the starter app: `pnpm build:local`
2. Copy the `dist/` output into this directory (alongside `manifest.json`).
3. In Chrome, go to `chrome://extensions/`, enable Developer mode.
4. Click "Load unpacked" and select this directory.

## Structure

- `manifest.json` — Manifest V3 extension descriptor.
- `background.mjs` — Background service worker (message handlers, alarms).
- `popup.html` — Extension popup that loads the starter app UI.

## How it works

- The starter app detects `chrome.runtime.id` and identifies the extension
  environment automatically.
- Storage falls back to memory adapter in extension context (chrome.storage
  adapter can be added later as needed).
- The popup dimensions are set via CSS on `<body>` in `popup.html`.

See [docs/guides/extension.md](../../docs/guides/extension.md) for the full guide.

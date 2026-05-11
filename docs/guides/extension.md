<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Full guide for wrapping the starter app as a Manifest V3 browser extension: setup, structure, storage, background worker patterns, and Firefox compatibility.
@sidecar extension.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

<!--
SpecRefs: TPL-034
-->

# Browser extension guide

Wrap the starter app as a Chrome, Edge, or Firefox browser extension
using Manifest V3.

## Prerequisites

- Chrome, Edge, or Firefox (with MV3 support)
- The scaffold in `templates/extension/`

## Quick start

1. Build the starter app:

```bash
pnpm build:local
```

2. Prepare the extension directory:

```bash
cp -r templates/extension/ my-extension/
cp -r dist/* my-extension/
```

3. Load in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `my-extension/` directory

## Structure

```
my-extension/
  manifest.json      Extension descriptor (MV3)
  background.mjs     Background service worker
  popup.html         Popup UI (loads the starter app)
  app.mjs            (from dist/) Starter app entry
  app-config.mjs     (from dist/) App configuration
  platform/          (from dist/) Platform detection + adapter factory
  modules/           (from dist/) Hex modules
  ...                (other files from dist/)
```

## How it works

### Popup

`popup.html` imports `app.mjs` and initializes the starter app inside
the popup's `#app` container. The popup dimensions are controlled by
CSS on `<body>` (default: 360x480px).

### Environment detection

The starter app detects `chrome.runtime.id` and identifies the extension
context. In extension mode:

- **Storage**: Falls back to memory adapter by default. For persistent
  storage, implement a `chrome.storage` adapter (see below).
- **Service Worker**: The extension's own service worker (`background.mjs`)
  is separate from the PWA service worker.
- **Notifications**: The extension can use `chrome.notifications` instead
  of the DOM toast adapter.

### Background service worker

`background.mjs` handles extension lifecycle events. Extend it with:

- Message handlers (`chrome.runtime.onMessage`)
- Alarm handlers (`chrome.alarms`)
- Context menu items (`chrome.contextMenus`)

## Adding chrome.storage support

To persist data via `chrome.storage.local`:

1. Add `"storage"` to permissions in `manifest.json` (already included).
2. Create a chrome storage adapter following the StoragePort contract:

```javascript
export function createChromeStorageAdapter() {
  let cached = null;

  return {
    load() { return cached; },
    save(state) {
      cached = { ...state };
      chrome.storage.local.set({ prefs: cached });
    },
    async init() {
      const result = await chrome.storage.local.get('prefs');
      cached = result.prefs || null;
    },
  };
}
```

3. Wire it into the adapter factory for extension mode.

## Firefox compatibility

The scaffold uses Manifest V3 which Firefox supports with minor differences:

- Change `"service_worker"` in background to `"scripts": ["background.mjs"]`
  for Firefox MV3 (or use the Firefox-specific manifest format).
- Test with `about:debugging` > "This Firefox" > "Load Temporary Add-on".

## Troubleshooting

- **CSP errors** — Manifest V3 requires all scripts in separate files.
  No inline scripts in popup.html except `type="module"` imports.
- **Popup closes on focus loss** — This is normal browser behavior.
  Use `chrome.storage` to persist state between popup opens.
- **Background script not running** — Check `chrome://extensions/` for errors.
  The service worker auto-terminates after ~30 seconds of inactivity.

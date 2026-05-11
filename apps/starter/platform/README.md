<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for starter/platform/.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

<!--
SpecRefs: TPL-030
-->

# Platform

Platform-aware modules for environment detection and adapter selection.

- `environment-detect.mjs` — Granular capability probing (service worker, IndexedDB, localStorage, Electron, Capacitor, Chrome extension, standalone mode)
- `adapter-factory.mjs` — Selects the correct storage adapter based on runtime mode and detected capabilities

These modules integrate with `app-config.mjs` (mode) and the `user-preferences` hex module (storage port) to wire the right adapter at startup.

## Usage

The adapter factory is called automatically by `app.mjs` during `initApp()`. You don't need to call it directly unless building a custom entry point.

```js
import { detectEnvironment } from './platform/environment-detect.mjs';
import { createStorageAdapter } from './platform/adapter-factory.mjs';

const caps = detectEnvironment();
const storage = await createStorageAdapter('electron', caps);
```

## Adapter selection rules

| Mode       | IndexedDB available | Result       |
|------------|---------------------|--------------|
| electron   | yes                 | indexedDB    |
| electron   | no                  | localStorage |
| local      | yes                 | indexedDB    |
| local      | no                  | localStorage |
| capacitor  | yes                 | indexedDB    |
| hosted/pwa | yes/no              | localStorage |
| any        | no localStorage     | memory       |

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Multi-platform overview guide explaining the supported deployment targets, platform detection architecture, and how to add a new platform.
@sidecar platforms.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

<!--
SpecRefs: TPL-034
-->

# Multi-platform deployment guide

The starter app is designed to run on multiple platforms from a single codebase.
Platform differences are handled through abstraction seams rather than separate
codebases or framework-specific builds.

## Supported platforms

| Platform           | Mode       | Storage          | Build command          |
|--------------------|------------|------------------|------------------------|
| Static hosted site | `hosted`   | localStorage     | `pnpm build:hosted`   |
| Progressive Web App| `pwa`      | localStorage     | `pnpm build:pwa`      |
| Local file://      | `local`    | IndexedDB        | `pnpm build:local`    |
| Electron desktop   | `electron` | IndexedDB        | `pnpm build:electron` |
| Browser extension  | `extension`| memory (default) | `pnpm build:local`    |
| Capacitor mobile   | `capacitor`| IndexedDB        | `pnpm build:hosted`   |

## How platform detection works

The app uses a two-layer detection system:

1. **Mode detection** (`app-config.mjs`) — Determines the runtime mode from
   environment hints: `<meta>` tags, `location.protocol`, `window.electronAPI`,
   `chrome.runtime.id`.

2. **Capability detection** (`platform/environment-detect.mjs`) — Probes for
   specific browser APIs: IndexedDB, localStorage, Service Worker, Notification,
   and platform bridges (Electron, Capacitor, Chrome extension).

The adapter factory (`platform/adapter-factory.mjs`) combines mode + capabilities
to select the right storage adapter automatically.

## Quick start per platform

### Hosted (default)

No special setup. Build and deploy to any static file server.

```bash
pnpm build:hosted
# Upload dist/ to your server
```

### PWA

Build with PWA mode to enable the service worker and install prompt.

```bash
pnpm build:pwa
# Deploy dist/ to an HTTPS server
```

See [pwa.md](pwa.md) for details.

### Local file://

Build for local use — opens directly from the filesystem.

```bash
pnpm build:local
# Open dist/index.html in a browser
```

See [local-app.md](local-app.md) for details.

### Electron

Use the scaffold template for desktop packaging.

```bash
pnpm build:electron
# See templates/electron/README.md for Electron setup
```

See [electron.md](electron.md) for details.

### Browser extension

Build and load as an unpacked extension.

```bash
pnpm build:local
# See templates/extension/README.md for extension setup
```

See [extension.md](extension.md) for details.

### Capacitor (mobile)

Build and wrap with Capacitor for iOS/Android.

```bash
pnpm build:hosted
# See templates/capacitor/README.md for Capacitor setup
```

## Architecture overview

```
app-config.mjs          Mode detection + feature flags
     |
     v
environment-detect.mjs   Capability probing (9 boolean signals)
     |
     v
adapter-factory.mjs      Mode + capabilities -> storage adapter
     |
     v
app.mjs (initApp)        Wires adapters + initializes features
```

Each layer is independently testable. The adapter factory is the single
routing point where new platform adapters are added.

## Adding a new platform

1. Add the mode to `MODES` in `app-config.mjs`.
2. Add capability detection in `environment-detect.mjs` if needed.
3. Add adapter routing in `adapter-factory.mjs`.
4. Create a scaffold template in `templates/<platform>/`.
5. Add a build mode to `scripts/build-single.mjs` if the default copy
   behavior needs platform-specific patching.
6. Write tests for the new adapter routing.
7. Add a guide in `docs/guides/`.

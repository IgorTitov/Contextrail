<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Guide for running the starter app from the local filesystem via file:// protocol without any server.
@sidecar local-app.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

<!--
SpecRefs: TPL-034
-->

# Local file:// app guide

Run the starter app directly from the filesystem without any server.

## Build

```bash
pnpm build:local
```

## Run

Open `dist/index.html` directly in a browser:

```bash
# macOS
open dist/index.html

# Linux
xdg-open dist/index.html

# Windows
start dist/index.html
```

## How it works

When opened via `file://` protocol, the app detects `location.protocol === 'file:'`
and switches to `local` mode automatically:

- **Storage**: IndexedDB (localStorage is unreliable on `file://` in some browsers)
- **Service Worker**: Disabled (not available on `file://`)
- **Install prompt**: Disabled
- **Offline cache**: Enabled by default (the app is already local)

## Limitations

- **No service workers** — The Service Worker API requires HTTPS or localhost.
- **localStorage may be unrestricted or blocked** depending on browser and
  privacy settings. The adapter factory falls back to IndexedDB, then memory.
- **CORS restrictions** — Some browsers restrict `file://` cross-origin requests.
  The starter app uses only relative imports, so this is normally not an issue.
- **No push notifications** — The Notification API may be restricted on `file://`.

## Use cases

- Portable tools that run from a USB drive
- Offline documentation viewers
- Personal utilities that don't need a server
- Development and testing without a dev server

## Distribution

Zip the `dist/` directory and share it. Recipients open `index.html` directly.

```bash
pnpm build:local
cd dist && zip -r ../my-app.zip . && cd ..
```

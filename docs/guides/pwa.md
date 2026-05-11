<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Guide for deploying the starter app as a Progressive Web App: build steps, service worker behavior, manifest configuration, and troubleshooting.
@sidecar pwa.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

<!--
SpecRefs: TPL-034
-->

# PWA deployment guide

Turn the starter app into a Progressive Web App with offline support,
installability, and push-ready service worker registration.

## Prerequisites

- HTTPS server (required for service workers)
- Modern browser with service worker support

## Build

```bash
pnpm build:pwa
```

This copies the starter app into `dist/` with:
- `manifest.json` and icons included
- `sw.mjs` service worker included
- The `<meta name="app-mode" content="pwa">` tag uncommented in `index.html`

## Deploy

Upload the contents of `dist/` to any HTTPS-capable static file server.

```bash
# Example with a local server for testing:
npx serve dist
```

## What the PWA mode enables

When the app detects PWA mode (via the `<meta>` tag), it:

1. **Registers the service worker** (`pwa/pwa-register.mjs`) —
   Handles `sw.mjs` registration with update detection.

2. **Enables the install prompt** (`pwa/install-prompt.mjs`) —
   Captures the `beforeinstallprompt` event and provides a UI hook.

3. **Sets feature flags** — `pwa: true`, `offlineCache: true`,
   `installPrompt: true` in `app-config.mjs`.

## Service worker

The included `sw.mjs` is a minimal cache-first service worker:

- Caches the app shell on install
- Serves cached responses for navigation requests
- Falls back to network for uncached resources
- Sends update-available messages to the page

Edit `sw.mjs` to customize caching strategies for your API calls
and dynamic content.

## Manifest

The `manifest.json` provides installability metadata:

- App name and description
- Icon sizes (192x192, 512x512)
- Display mode (`standalone`)
- Theme and background colors
- Start URL

Edit `manifest.json` to match your app's branding and icons.

## Testing locally

1. Build: `pnpm build:pwa`
2. Serve with HTTPS (or localhost, which browsers trust):
   ```bash
   npx serve dist
   ```
3. Open in Chrome, check DevTools > Application > Service Workers.
4. The install prompt should appear if the PWA criteria are met.

## Troubleshooting

- **Service worker not registering** — Must be served over HTTPS
  (localhost is an exception).
- **Install prompt not appearing** — Chrome requires a manifest with
  required fields, a registered service worker, and HTTPS.
- **Stale cache** — Hard refresh or unregister the service worker
  in DevTools > Application.

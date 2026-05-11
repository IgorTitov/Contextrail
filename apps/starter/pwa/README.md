<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the PWA feature folder, activation steps, and module responsibilities.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# PWA feature

Progressive Web App support for the starter template.

## Activation

Uncomment the PWA meta tag in [index.html](../index.html):

```html
<meta name="app-mode" content="pwa" />
```

This switches the app to PWA mode, which:

1. Registers the service worker ([sw.mjs](../sw.mjs))
2. Enables the install prompt capture ([install-prompt.mjs](install-prompt.mjs))
3. Sets feature flags: `pwa`, `offlineCache`, `installPrompt` all `true`

## Modules

- [pwa-register.mjs](pwa-register.mjs) — service worker registration and update lifecycle
- [install-prompt.mjs](install-prompt.mjs) — `beforeinstallprompt` capture and `showInstallPrompt()` API
- [ui-selectors.mjs](ui-selectors.mjs) — bounded selector registry for PWA UI elements

## Manifest and icons

- [manifest.json](../manifest.json) — PWA web app manifest
- [icons/](../icons/) — placeholder SVG icons (192x192, 512x512)

## Locale keys

PWA strings (`pwa.install`, `pwa.update.*`, `pwa.offline`) are registered in both `en.mjs` and `ru.mjs` locales, routed through the i18n messages layer.

## Service worker caching

The service worker uses:

- **Cache-first** for app shell assets (HTML, CSS, JS, manifest, icons)
- **Network-first** for all other same-origin requests
- **Offline fallback** for navigation when fully offline
- **No cross-origin caching** by default

Bump `CACHE_NAME` in [sw.mjs](../sw.mjs) to invalidate caches on update.

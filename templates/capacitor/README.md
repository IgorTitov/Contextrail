<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Quick-start documentation for the Capacitor scaffold: build the web app, configure Capacitor, add platforms, and run on iOS/Android.
@sidecar README.md.header.md
@layer templates | @hex _none_ | @ctx _none_
@public false
@edit careful -->

<!--
SpecRefs: TPL-033
-->

# Capacitor scaffold

Starter scaffold for wrapping the app as a native mobile app using
[Capacitor](https://capacitorjs.com/).

## Quick start

1. Build the starter app: `pnpm build:hosted`
2. Copy `capacitor.config.json` to your project root.
3. Install Capacitor:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

4. Add platforms:

```bash
npx cap add android
npx cap add ios
```

5. Sync and open:

```bash
npx cap sync
npx cap open android   # or: npx cap open ios
```

## How it works

- Capacitor wraps the built `dist/` web app inside a native WebView.
- The starter app detects `window.Capacitor` and identifies the mobile
  environment automatically.
- Storage uses IndexedDB via the platform adapter factory (IndexedDB
  works reliably inside Capacitor's WebView).

## Customizing

- Edit `capacitor.config.json` to set your app ID, name, and plugin
  configuration.
- The `webDir` must point to wherever your build output lives (default: `dist`).
- Add Capacitor plugins for native features (camera, filesystem, etc.)
  as needed.

See [docs/guides/capacitor.md](../../docs/guides/capacitor.md) for the full guide (planned).

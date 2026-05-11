<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for multi-platform abstraction seams that make the starter template convertible to PWA, local file, desktop, mobile, browser extension, or static hosted deployments.
@sidecar platform-seams.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Multi-Platform Abstraction Seams

## Requirement intent

The starter template already ships with 8 common features implemented as hex modules. The template must now gain abstraction seams that make it easily convertible to multiple deployment targets without rewriting the existing feature modules.

The target platforms are:

- **Hosted** — static site served over HTTP/HTTPS (current default)
- **PWA** — progressive web app with service worker and offline support
- **Local file** — opened directly via `file://` protocol with no server
- **Desktop** — wrapped in Electron or similar shell
- **Mobile** — wrapped in Capacitor or similar native bridge
- **Browser extension** — packaged as a Chrome/Firefox extension

The seams must allow a single codebase to target any of these platforms through configuration and adapter selection, not through forking.

## Classification

This is **technical/architectural** work. It alters the infrastructure and adapter wiring of the starter template but does not change user-facing workflows. USM is intentionally skipped.

## Seams in scope (Slice 1)

### 1. App Config (TPL-023)

Runtime configuration module at `apps/starter/app-config.mjs`.

- Defines the runtime mode: `hosted`, `pwa`, `local`, `electron`, `extension`
- Exports feature flags that platform-specific adapters can query
- Auto-detects mode from environment signals (protocol, user agent, global objects) with manual override
- Pure ESM module with no framework or DOM dependency
- Constraints: must be importable before any DOM work begins; must not break existing features when mode is `hosted`

### 2. App Shell (TPL-024)

Central application entry point at `apps/starter/app.mjs`.

- Wires the correct adapters based on the resolved app config
- Replaces ad-hoc inline script wiring with a single orchestration entry
- Imports and initializes hex modules in dependency order
- Provides a stable `initApp()` function callable from the HTML entry point
- Constraints: must preserve all existing feature behavior; must not introduce a framework; must remain a thin orchestration layer

### 3. HTML Entry Point (TPL-025)

Proper HTML5 entry at `apps/starter/index.html`.

- Clean `<!DOCTYPE html>` structure with semantic landmarks
- Loads `app.mjs` as an ES module via `<script type="module">`
- Conditional PWA/service-worker registration stub (inactive by default, activatable in PWA mode)
- Correct `<meta>` tags for viewport, charset, theme-color
- Constraints: must work when opened via `file://` protocol; must not require a build step; conditional registration must not error when service worker is unavailable

## Seams in scope (Slice 2 — PWA)

Slice 2 delivers progressive web app support on top of the foundational seams from Slice 1. All three items are technical/architectural work.

### 4. PWA Manifest & Icons (TPL-026)

Web app manifest at `apps/starter/manifest.json` with placeholder SVG icons.

- App metadata: name, short_name, description, start_url, scope
- Icons array referencing SVG placeholders at 192x192 and 512x512
- Display, orientation, and theme-color settings appropriate for installable PWA
- Icon files at `apps/starter/icons/icon-192.svg` and `apps/starter/icons/icon-512.svg` as simple placeholder SVGs
- Constraints: manifest must be valid JSON; icon paths must resolve relative to the HTML entry point; must not require a build step to produce icons

### 5. Service Worker (TPL-027)

Service worker at `apps/starter/sw.mjs` implementing caching and offline support.

- Cache-first strategy for app shell assets (HTML, CSS, JS, icons, manifest)
- Network-first strategy for dynamic content
- Offline fallback when network is unavailable
- Cache versioning for controlled update and invalidation
- Constraints: must not interfere with non-PWA modes; must degrade gracefully when caches API is unavailable; must not cache cross-origin resources without explicit allowlist

### 6. PWA UI Layer (TPL-028)

Registration, install prompt, selectors, locale keys, and tests for the PWA subsystem.

- PWA registration module at `apps/starter/pwa/pwa-register.mjs` that registers the service worker only when mode is `pwa` and handles the update lifecycle (waiting, activated, controller change)
- Install prompt handler at `apps/starter/pwa/install-prompt.mjs` that captures the `beforeinstallprompt` event and exposes a `showInstallPrompt()` API
- PWA selector registry at `apps/starter/pwa/ui-selectors.mjs` with bounded selectors for install button, update banner, and offline indicator
- Locale keys for PWA strings (install prompt, offline notice, update available) added to `en.mjs` and `ru.mjs`
- Unit tests for service worker caching logic, pwa-register, and install-prompt modules
- PWA README at `apps/starter/pwa/README.md`
- Constraints: registration must be a no-op when mode is not `pwa`; all user-facing copy must go through the i18n messages layer; selectors must come from the bounded registry, not hardcoded literals

## Seams in scope (Slice 3 — Platform Adapters & Build)

Slice 3 delivers storage adapter alternatives, runtime capability detection, adapter wiring, and build scripts on top of the foundational and PWA seams from Slices 1 and 2. All four items are technical/architectural work.

### 7. IndexedDB Storage Adapter (TPL-029)

Storage adapter at `modules/user-preferences/adapters/indexeddb-adapter.mjs`.

- Implements the existing `StoragePort` contract (`load()` and `save(state)`) using IndexedDB
- Port is defined in `modules/user-preferences/ports/storage-port.mjs`
- Existing adapters are `memory-adapter.mjs` and `local-storage-adapter.mjs`
- Needed for Electron, Capacitor, and other non-browser contexts where localStorage may be unreliable
- Constraints: must conform to the same `StoragePort` interface as existing adapters; must degrade gracefully when IndexedDB is unavailable; must not break existing adapter selection

### 8. Platform Environment Detection (TPL-030)

Environment detection module at `apps/starter/platform/environment-detect.mjs`.

- Granular capability probing: service worker support, IndexedDB availability, notifications permission, `file://` protocol detection, Electron globals, Capacitor globals, extension APIs
- Returns a structured capabilities object consumed by the adapter factory
- Constraints: must not throw on unknown or restricted environments; must return a consistent shape regardless of platform; must be importable before DOM work

### 9. Platform Adapter Factory (TPL-031)

Adapter factory at `apps/starter/platform/adapter-factory.mjs`.

- Factory function that selects and wires the correct storage adapter based on resolved config and detected capabilities
- Returns the appropriate adapter (localStorage, IndexedDB, or memory) based on platform
- Integrates with `app-config.mjs` resolved mode
- Constraints: must fall back to memory adapter when no persistent storage is available; must not introduce new dependencies beyond existing modules; selection logic must be deterministic and testable

### 10. Build Scripts (TPL-032)

Build script at `scripts/build-single.mjs` with package.json integration.

- Simple build/copy script that produces a self-contained deployment folder
- Copies starter app files into a `dist/` folder with mode-appropriate configuration
- `build:local` and `build:pwa` scripts added to `package.json`
- No bundler dependency — uses Node.js `fs` APIs only
- Constraints: must not require any bundler or build tool beyond Node.js; output must be runnable without further processing; must not alter source files

## Seams in scope (Slice 4 — Scaffolds + Documentation)

Slice 4 delivers platform scaffold templates, comprehensive platform guides, and final README/CHANGELOG updates that close out the multi-platform seams epic. All three items are technical/documentation work.

### 11. Platform Scaffold Templates (TPL-033)

Starter scaffolds under `templates/` that users copy when targeting a specific platform.

- `templates/electron/` — `package.json`, `main.mjs`, `preload.mjs` for Electron desktop builds
- `templates/extension/` — `manifest.json` (Manifest V3), `background.mjs`, `popup.html` for browser extension packaging
- `templates/capacitor/` — `capacitor.config.json` for Capacitor mobile wrapping
- Each scaffold is minimal and references the starter app as the source application
- Constraints: scaffolds must be copyable and runnable with minimal modification; must not duplicate starter app code; must reference the starter app rather than embedding it

### 12. Platform Guides Documentation (TPL-034)

Comprehensive platform guides under `docs/guides/`.

- `docs/guides/platforms.md` — overview of all supported platforms with quick-start instructions per each
- `docs/guides/pwa.md` — progressive web app guide
- `docs/guides/local-app.md` — local file:// protocol guide
- `docs/guides/electron.md` — Electron desktop guide
- `docs/guides/extension.md` — browser extension guide
- `docs/guides/deployment.md` — deployment and hosting guide
- Constraints: guides must be self-contained and actionable; must reference the scaffold templates where applicable; must not contradict PRD or backlog state

### 13. README and CHANGELOG Updates (TPL-035)

Final root-level documentation updates for the complete multi-platform seams feature.

- Update root `README.md` with platform seams overview, link to guides, and build commands
- Final `CHANGELOG.md` entries summarizing the complete multi-platform seams feature across all four slices
- Constraints: README updates must be additive and not break existing content; CHANGELOG entries must reference the relevant TPL IDs

## Out of scope

- Native mobile app store publishing workflows
- CI/CD pipeline configuration for platform-specific builds
- Platform-specific automated testing infrastructure

## Cross-cutting constraints

- All seams use vanilla JS (ESM, no build step)
- Existing 8 features must continue to work identically when mode is `hosted`
- No new framework or runtime dependency
- Platform seams follow the port/adapter pattern consistent with existing hex modules
- Config detection must degrade gracefully on unknown platforms (default to `hosted`)
- All user-facing copy still routes through the i18n messages layer

## Acceptance boundaries

### Slice 1

- App config module exports a resolved mode and feature flags without DOM access
- App shell wires all existing hex modules and initializes them in correct order
- HTML entry point loads the app shell as an ES module and renders the existing starter UI
- Opening `index.html` via `file://` does not produce errors or broken features
- Conditional service worker registration does not execute or error when mode is not `pwa`
- All existing starter features (preferences, i18n, themes, layout, navigation, notifications, loading, errors) behave identically after the seam introduction
- No build step is required for any deployment mode

### Slice 2

- Web app manifest is valid JSON with correct app metadata, icons array, display, orientation, and theme settings
- SVG placeholder icons exist at 192x192 and 512x512 and are referenced correctly from the manifest
- Service worker implements cache-first for app shell assets and network-first for dynamic content
- Offline fallback is served when network is unavailable and the service worker is active
- PWA registration module registers the service worker only when mode is `pwa` and is a no-op otherwise
- Install prompt handler captures the `beforeinstallprompt` event and provides a callable `showInstallPrompt()` API
- PWA selector registry provides bounded selectors for install button, update banner, and offline indicator
- Locale keys for PWA strings exist in both `en.mjs` and `ru.mjs`
- All user-facing PWA copy routes through the i18n messages layer
- Unit tests cover service worker caching logic, pwa-register, and install-prompt modules
- Existing features remain unaffected in non-PWA modes

### Slice 3

- IndexedDB adapter implements the same `StoragePort` contract (`load`/`save`) as existing adapters
- IndexedDB adapter degrades gracefully when IndexedDB is unavailable
- Environment detection returns a structured capabilities object covering service worker, IndexedDB, notifications, file protocol, Electron, Capacitor, and extension APIs
- Environment detection does not throw on unknown or restricted environments
- Adapter factory selects the correct storage adapter based on resolved config and detected capabilities
- Adapter factory falls back to memory adapter when no persistent storage is available
- Build script produces a self-contained deployment folder in `dist/` without requiring a bundler
- `build:local` and `build:pwa` package.json scripts invoke the build script with appropriate mode configuration
- Build output is runnable without further processing
- All existing starter features remain unaffected

### Slice 4

- Electron scaffold exists at `templates/electron/` with `package.json`, `main.mjs`, and `preload.mjs`
- Extension scaffold exists at `templates/extension/` with `manifest.json` (Manifest V3), `background.mjs`, and `popup.html`
- Capacitor scaffold exists at `templates/capacitor/` with `capacitor.config.json`
- Each scaffold is minimal, copyable, and references the starter app
- Platform overview guide exists at `docs/guides/platforms.md` with quick-start per platform
- Individual platform guides exist for PWA, local app, Electron, extension, and deployment
- Guides are self-contained, actionable, and reference scaffold templates where applicable
- Root `README.md` includes platform seams overview, guide links, and build commands
- `CHANGELOG.md` includes final entries for the complete multi-platform seams feature

```trace-yaml
work_item:
  id: TPL-022
  type: meta
  title: Multi-Platform Abstraction Seams
  parent_ref:
  status: approved
  module_ref: starter
  spec_refs:
    - docs/prd/platform-seams.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - App config module provides runtime mode detection and feature flags.
    - App shell wires hex modules based on resolved configuration.
    - HTML entry point loads the app as an ES module with conditional PWA registration.
    - All existing starter features work identically after seam introduction.
    - No build step is required.
    - Opening via file:// protocol does not produce errors.
```

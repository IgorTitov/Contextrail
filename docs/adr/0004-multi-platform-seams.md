<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the architectural decision to add multi-platform abstraction seams to the starter template.
@sidecar 0004-multi-platform-seams.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0004 — Multi-Platform Abstraction Seams

## Status

Accepted

## Context

The starter template ships 8 common features (preferences, i18n, themes, layout, navigation, notifications, loading, errors) as hex modules with port/adapter boundaries. The template must be easily convertible to multiple deployment targets:

- **Hosted** — served over HTTP/HTTPS (current default)
- **PWA** — offline-capable progressive web app
- **Local** — runs from `file://` protocol with no server
- **Electron** — desktop wrapper
- **Capacitor** — mobile native bridge
- **Extension** — browser extension (Chrome/Firefox manifest v3)

Today the modules have in-memory and DOM adapters but no central configuration or orchestration point. Each HTML fixture wires adapters inline. There is no way to switch the entire template to a different platform without manual rewiring.

## Decision

Introduce three foundational seams:

### 1. App Config (`apps/starter/app-config.mjs`)

A pure-ESM module that resolves the runtime mode and feature flags:

- **Modes**: `hosted`, `pwa`, `local`, `electron`, `extension`
- **Auto-detection**: protocol (`file:`), global objects (`electronAPI`, browser `chrome.runtime`), meta tag override
- **Manual override**: `setMode()` for tests and explicit configuration
- **Feature flags**: `pwa`, `offlineCache`, `installPrompt` — derived from mode but individually overridable
- **No DOM dependency**: importable before any rendering

### 2. App Shell (`apps/starter/app.mjs`)

A thin orchestration entry point that:

- Imports app-config to resolve mode
- Wires hex module adapters based on mode (e.g., localStorage in hosted, will later select IndexedDB in local)
- Initializes features in dependency order: preferences → locale registration → theme → layout wiring → error boundary → notifications
- Exports a single `initApp(root)` function
- Remains framework-free

### 3. HTML Entry Point (`apps/starter/index.html`)

A proper HTML5 document that:

- Loads `app.mjs` via `<script type="module">`
- Contains the semantic HTML5 structure (header, main, footer) with ARIA landmarks
- Includes a conditional service-worker registration stub (no-op unless mode is `pwa`)
- Works via `file://` protocol without errors

## Consequences

### Positive

- Platform switching becomes a configuration change, not a rewrite
- The app shell replaces ad-hoc inline wiring with a single visible orchestration point
- Future platforms (PWA, Electron, etc.) only need their specific adapter + config flags
- Existing features remain unaffected — `hosted` mode is the default and preserves current behavior

### Negative

- One additional module (`app-config`) in the import graph
- The app shell adds a thin orchestration layer — minor indirection vs. inline scripts
- Auto-detection heuristics may need updating as browser APIs evolve

### Risks

- Over-engineering: keep the config module flat and the shell thin; resist framework-like abstractions
- Detection edge cases: always fall back to `hosted` on unknown environments

## Relationship to existing architecture

- Follows the same port/adapter pattern used by `user-preferences` and `notifications` modules
- Does not change the hex module boundaries — only adds a wiring point above them
- Aligns with trunk-based delivery (ADR 0002) — seams land as disabled stubs, activated by mode selection

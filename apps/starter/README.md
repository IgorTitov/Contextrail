<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the starter app folder, the bounded selector-registry pattern, app config, and app shell entry point.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# Starter app

This folder contains the template's starter application code.

## Slice index

Each visible feature in the starter is a self-contained slice folder with its own README, code, CSS, and a bounded `ui-selectors.mjs` registry. Agents working on a slice should load only that folder; they don't need to read sibling slices. The 11 current slices are:

|Slice|Purpose|Selector registry|
|-----|-------|-----------------|
|`ai-chat/`|Floating chat panel adapter for the `ai-chat` hex module|[ai-chat/ui-selectors.mjs](ai-chat/ui-selectors.mjs)|
|`error-boundary/`|Top-level error boundary that catches uncaught errors and renders a recovery banner|[error-boundary/ui-selectors.mjs](error-boundary/ui-selectors.mjs)|
|`language-picker/`|Locale switcher backed by the i18n messages layer|[language-picker/ui-selectors.mjs](language-picker/ui-selectors.mjs)|
|`layout/`|App shell skeleton — header, main, footer regions|[layout/ui-selectors.mjs](layout/ui-selectors.mjs)|
|`loading-states/`|Spinner / skeleton primitives reused by other slices|[loading-states/ui-selectors.mjs](loading-states/ui-selectors.mjs)|
|`local-llm/`|In-browser LLM panel adapter for the `local-llm` hex module|[local-llm/ui-selectors.mjs](local-llm/ui-selectors.mjs)|
|`navigation/`|Primary nav with section routing|[navigation/ui-selectors.mjs](navigation/ui-selectors.mjs)|
|`notifications/`|Toast container adapter for the `notifications` hex module|[notifications/ui-selectors.mjs](notifications/ui-selectors.mjs)|
|`onboarding/`|Guided tour adapter for the `onboarding` hex module|[onboarding/ui-selectors.mjs](onboarding/ui-selectors.mjs)|
|`pwa/`|Service-worker registration, install prompt, update banner|[pwa/ui-selectors.mjs](pwa/ui-selectors.mjs)|
|`theme-toggle/`|Light / dark theme switch with CSS-variable theming|[theme-toggle/ui-selectors.mjs](theme-toggle/ui-selectors.mjs)|

The root [ui-selectors.mjs](ui-selectors.mjs) holds only the bootstrap-checklist hooks used by the cold-start smoke test; per-slice selectors live with their slice.

## Selector registry

[ui-selectors.mjs](ui-selectors.mjs) is a concrete example of the bounded selector-registry pattern described in [docs/design/design-system.md](../../docs/design/design-system.md).

Key rules:

- One registry per feature or visible slice, not one global table.
- Export stable `data-testid` values and DOM `id` constants.
- Product code and tests import from the same registry module.
- Do not add presentational CSS classes unless they are part of the testability contract.

The bootstrap feature's selectors are consumed by:

- [tests/e2e/template-bootstrap.html](../../tests/e2e/template-bootstrap.html) — static fixture
- [tests/e2e/template-bootstrap.spec.mjs](../../tests/e2e/template-bootstrap.spec.mjs) — Playwright smoke spec
- [tests/unit/ui-selectors.test.mjs](../../tests/unit/ui-selectors.test.mjs) — registry shape proof

## i18n / messages layer

[messages.mjs](messages.mjs) is a concrete example of the i18n/messages pattern mandated by the project rules. All user-facing UI copy goes through `t(key, params)` instead of being hardcoded as string literals.

Key rules:

- One messages module per feature or bounded slice, not one global table.
- All user-facing strings come from the messages layer — never hardcode UI copy.
- Register additional locales via `registerLocale()`.
- Falls back to the message key when a key is missing.

The bootstrap feature's messages are tested by:

- [tests/unit/messages.test.mjs](../../tests/unit/messages.test.mjs) — lookup, interpolation, locale switching, and registration proof

## App config and shell

[app-config.mjs](app-config.mjs) provides runtime mode detection and feature flags. Modes: `hosted`, `pwa`, `local`, `electron`, `extension`. Feature flags (`pwa`, `offlineCache`, `installPrompt`) are derived from the mode but individually overridable.

[app.mjs](app.mjs) is the central entry point that wires hex module adapters based on the resolved config. It initializes features in dependency order (preferences, locales, theme, error boundary, navigation, notifications) and exports `initApp(root)`.

[index.html](index.html) is the proper HTML5 entry point. It links to all feature CSS files, loads `app.mjs` as an ES module, and includes a conditional service-worker registration stub (inactive unless the `<meta name="app-mode" content="pwa">` tag is uncommented).

See [ADR 0004](../../docs/adr/0004-multi-platform-seams.md) for the architectural decision behind these seams.

## PWA support

The [pwa/](pwa/) folder contains progressive web app modules:

- [pwa-register.mjs](pwa/pwa-register.mjs) — service worker registration and update lifecycle
- [install-prompt.mjs](pwa/install-prompt.mjs) — `beforeinstallprompt` capture and `showInstallPrompt()` API
- [ui-selectors.mjs](pwa/ui-selectors.mjs) — bounded selector registry for PWA UI elements

Supporting files: [manifest.json](manifest.json), [icons/](icons/) (192/512 SVG placeholders), [sw.mjs](sw.mjs) (service worker with cache-first/network-first strategies).

Activate by uncommenting `<meta name="app-mode" content="pwa" />` in [index.html](index.html). See [pwa/README.md](pwa/README.md) for details.

## Platform detection and adapter factory

The [platform/](platform/) folder contains platform-aware modules:

- [environment-detect.mjs](platform/environment-detect.mjs) — granular capability probing (service worker, IndexedDB, localStorage, Electron, Capacitor, Chrome extension, standalone display mode)
- [adapter-factory.mjs](platform/adapter-factory.mjs) — selects the correct storage adapter based on resolved mode and detected capabilities

The adapter factory is called automatically by `app.mjs` during `initApp()`. Electron and local modes prefer IndexedDB; hosted and PWA modes use localStorage; memory is the last resort.

See [platform/README.md](platform/README.md) for the full adapter selection rules.

## Build scripts

The project includes a build script that copies the starter app into a self-contained `dist/` folder:

```bash
pnpm build:hosted   # Default hosted mode
pnpm build:pwa      # PWA with manifest, service worker, icons
pnpm build:local    # Local file:// mode
pnpm build:electron # Electron wrapper mode
```

The script uses only Node.js fs APIs — no bundler dependency. See `scripts/build-single.mjs` for options.

## Advanced examples

### Contract-first browser module seam (optional)

[examples/contract-seam/](examples/contract-seam/) demonstrates a `_setImpl()` / facade pattern for browser modules where the adapter is likely to churn. Callers bind to a stable contract; the real implementation is injected at runtime.

Use this pattern selectively — only where implementation churn justifies the indirection. See the [pattern README](examples/contract-seam/README.md) for when to use and when not to use it.

### Greeter module wiring (optional)

[examples/greeter-wiring/](examples/greeter-wiring/) demonstrates how the application layer imports from a bounded-context module (`modules/example-greeter/`) through its `public-api.mjs` entry point. It shows adapter validation at startup and the assembly pattern that keeps cross-module imports clean.

See the [wiring README](examples/greeter-wiring/README.md) for the full layer diagram.

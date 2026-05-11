<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the analytics hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx analytics
@public false
@edit careful -->

# analytics

Privacy-first hexagonal bounded module for analytics and behavioral tracking.

Everything is off by default. Analytics events require explicit consent. Behavioral tracking (clicks, scroll depth, element visibility, mouse heatmap) requires both behavioral consent AND an explicit `startTracking()` call. The module also respects `navigator.doNotTrack`.

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| Domain | `domain/consent.mjs` | Consent checks, Do Not Track, default consent state |
| Domain | `domain/session-manager.mjs` | Session lifecycle with timeout and optional sessionStorage |
| Domain | `domain/mouse-collector.mjs` | Mouse movement sampling for heatmap data |
| Ports | `ports/analytics-port.mjs` | `AnalyticsPort` contract + `assertAnalyticsPort()` validator |
| Adapters | `adapters/console-adapter.mjs` | Console-logging adapter for development |
| Adapters | `adapters/no-op-adapter.mjs` | Silent no-op adapter (safe default) |
| Adapters | `adapters/behavioral-adapter.mjs` | Click, scroll, visibility tracking wrapping another adapter |
| Public API | `public-api.mjs` | Single cross-module entry point |
| i18n | `messages.mjs` | User-facing copy for the analytics module |

## Privacy model

1. **Default consent**: `{ analytics: false, behavioral: false }` -- everything off.
2. **Do Not Track**: If `navigator.doNotTrack === '1'`, analytics should be suppressed entirely.
3. **Analytics consent**: Required for `track()`, `identify()`, and `page()` events.
4. **Behavioral consent**: Required for click, scroll, visibility, and mouse heatmap collection. This is a separate, stricter consent category.
5. **Explicit activation**: Behavioral adapters require a `startTracking()` call even after consent is granted.

## Usage

```js
import {
  createAnalyticsConsoleAdapter,
  createBehavioralAdapter,
  assertAnalyticsPort,
  createDefaultConsent,
  respectsDoNotTrack,
} from '../../modules/analytics/public-api.mjs';

// Check Do Not Track first
if (respectsDoNotTrack()) {
  // Use no-op adapter; user has opted out
}

// Create an analytics adapter
const adapter = createAnalyticsConsoleAdapter();
assertAnalyticsPort(adapter);

// Grant consent explicitly
adapter.setConsent({ analytics: true });
adapter.track('button_click', { label: 'signup' });

// Behavioral tracking requires its own consent + explicit start
adapter.setConsent({ behavioral: true });
const behavioral = createBehavioralAdapter(adapter);
behavioral.startTracking();
// Now click, scroll, and visibility events are collected
```

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
- All user-facing copy goes through `messages.mjs`.

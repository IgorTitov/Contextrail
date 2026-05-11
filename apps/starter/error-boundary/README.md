<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for starter/error-boundary/.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# error-boundary

Error boundary / fallback UI pattern for the starter app.

Global error handler with user-friendly recovery UI and optional retry action.

## Files

- `error-boundary.css` — Fallback UI styles
- `error-boundary.mjs` — `renderFallback()`, `installErrorBoundary()`, `wrapAsync()` helpers
- `ui-selectors.mjs` — Bounded selector registry

## How it works

- `installErrorBoundary(root)` catches `window.onerror` and `unhandledrejection`
- On error, replaces root content with a friendly message and retry button
- `wrapAsync(fn, handler)` wraps async functions for safe try/catch routing
- Error details go to `console.error`, never shown to the user

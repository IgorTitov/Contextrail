<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for starter/loading-states/.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# loading-states

Loading and skeleton state patterns for the starter app.

Provides CSS shimmer animation, spinner, overlay, and DOM helper functions.

## Files

- `loading-states.css` — Spinner, skeleton shimmer, overlay styles
- `loading-states.mjs` — `showLoading()`, `hideLoading()`, `createSkeleton()` helpers
- `ui-selectors.mjs` — Bounded selector registry

## Patterns

- **Skeleton** — CSS shimmer for content placeholders
- **Spinner** — Animated circular loader
- **Overlay** — Full-area loading overlay with spinner and `aria-busy="true"`

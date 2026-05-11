<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for starter/onboarding/.
@sidecar README.md.header.md
@layer app | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# onboarding (app wiring)

App-layer selectors for the onboarding hex module.

The domain logic, ports, and adapters live in `modules/onboarding/`. This directory provides the selector registry for automation hooks.

- `ui-selectors.mjs` — Bounded `data-testid` registry for onboarding DOM elements

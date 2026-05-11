<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Directory overview for the domain layer of the onboarding module.
@sidecar README.md.header.md
@layer module | @hex domain | @ctx onboarding
@public false
@edit careful -->

# domain

Pure domain logic for onboarding tours. Framework-free, no external dependencies.

- `tour-step.mjs` — `createTourStep()`, `isValidStep()`, `resetStepCounter()`
- `tour-state.mjs` — Immutable state machine: `createTourState()`, `startTour()`, `nextStep()`, `previousStep()`, `endTour()`, `getCurrentStep()`, `canAdvance()`, `canGoBack()`

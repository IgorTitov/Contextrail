---
name: frontend-delivery
description: Implement user-visible slices through stable UI-state seams, accessible interactions, and registry-backed selectors without widening the change set unnecessarily.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the canonical frontend implementation method for user-visible slices in this template.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# frontend-delivery

## Start from visible intent

Work from:

- persona and workflow intent
- acceptance criteria
- visible UI states
- linked BDD refs
- touched components and direct state seams

## Frontend rules

- keep selectors stable and purposeful
- prefer accessibility-friendly markup and interactions
- map visible states explicitly
- keep component responsibilities narrow
- avoid cross-app churn when one bounded slice is enough

## Reading discipline

Deep-read only:

- touched UI files
- direct state seams
- updated BDD or UI tests

Use headers, public APIs, and existing proofs to orient around neighboring code.

## Testability rule

When visible behavior changes:

- update or add the right Gherkin proof
- keep selectors and names stable enough for BDD and smoke tests
- prefer semantic hooks over brittle DOM coupling

## UI copy rule

All user-facing UI copy must be externalized through a simple i18n/messages layer from day one, even if the app initially ships with only one locale.

Do not spread visible copy across components, templates, and tests as raw literals when that copy belongs to the actual application UI.

## Registry rule

Stable automation-facing hooks must come from a bounded registry near the feature or visible slice.

Use the registry for:

- `data-testid`
- reusable DOM `id`
- selectors derived from those stable hooks

Do not create a giant global registry unless the application genuinely has one bounded UI surface.
Do not place purely presentational CSS module classes into the registry by default.

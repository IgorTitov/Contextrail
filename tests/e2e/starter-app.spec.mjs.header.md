---
fileId: contextrail-template:tests:e2e:starter-app.spec
module: tests/e2e
stability: evolving
steward: shared
api: file-local
summary: "End-to-end tests: starter app.spec."
owns: End-to-end acceptance proof for all 11 user-visible starter-app scenarios via Playwright against the static HTML fixture.
boundaries: Must target tests/e2e/starter-app.html only via file:// or local path; must not start a dev server; selectors must come from the bounded apps/starter/<feature>/ui-selectors.mjs registries, not hardcoded strings.
invariants: Every test must reference selectors from the ui-selectors registries; the spec must remain runnable without a network connection; adding a new starter feature requires a corresponding test in this file.
notesForLLM: Import selectors only from the bounded ui-selectors.mjs registries; never hardcode selector strings here. New starter features need a corresponding test before the feature is marked done.
tests: Playwright test runner (pnpm test:e2e or pnpm test:all)
specRefs:
  - TPL-017
  - TPL-018
  - TPL-020
  - TPL-021
---

# starter-app.spec.mjs

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose BDD folder guide
@sidecar README.md.header.md
@layer tests | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# tests/bdd

BDD tests verify **user-visible scenarios** via Gherkin feature files and deterministic smoke checks that prove scenario structure and traceability.

## Role in the test pyramid

| Layer | What it proves |
| ----- | -------------- |
| unit | Pure logic in isolation |
| integration | Multi-file wiring and local entrypoint proofs |
| contract | Stable repo-wide conventions and boundary contracts |
| **bdd** | **Gherkin scenarios and traceability** |
| e2e | Visible browser behavior (opt-in) |

BDD tests validate that feature files, docs, and traceability references agree. They run without a browser as part of the fast path.

## What ships today

- `features/template.feature` — starter scenario for bootstrap behavior and traceability.
- `template-feature.test.mjs` — validates that the feature file and the docs all point to the same scenario.
- `features/example-greeter.feature` — Gherkin scenarios for the example-greeter bounded module (default adapter, empty name, custom adapter).
- `example-greeter.test.mjs` — BDD step runner proving the greeter scenarios against the real module.

UI/UX changes should update the feature file and, when visible behavior is involved, the Playwright smoke proof under `tests/e2e/`.

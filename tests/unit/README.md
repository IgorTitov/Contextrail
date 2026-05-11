<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the tiny pure-logic examples that anchor the template’s unit-test layer.
@sidecar README.md.header.md
@layer tests | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# tests/unit

Unit tests verify **pure logic in isolation** — small helpers, data transformations, and domain rules with no filesystem, process, or network side effects.

## Role in the test pyramid

| Layer | What it proves |
| ----- | -------------- |
| **unit** | **Pure logic in isolation** |
| integration | Multi-file wiring and local entrypoint proofs |
| contract | Stable repo-wide conventions and boundary contracts |
| bdd | Gherkin scenarios and traceability |
| e2e | Visible browser behavior (opt-in) |

Unit tests are the fastest layer. They import a module and assert return values. No child processes, no file reads beyond the module under test.

## Current samples

- `traceability-id.mjs` — strips and normalizes a traceability key.
- `traceability-id.test.mjs` — proves the helper with `node:test`.

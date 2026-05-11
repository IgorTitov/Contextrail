<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the integration-test folder as the home for multi-file wiring checks and small local end-to-end entrypoint proofs.
@sidecar README.md.header.md
@layer tests | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# tests/integration

Integration tests verify that **multiple files, scripts, and configs agree on the same wiring** — the cross-cutting agreements that keep the template coherent.

## Role in the test pyramid

| Layer | What it proves |
| ----- | -------------- |
| unit | Pure logic in isolation |
| **integration** | **Multi-file wiring and local entrypoint proofs** |
| contract | Stable repo-wide conventions and boundary contracts |
| bdd | Gherkin scenarios and traceability |
| e2e | Visible browser behavior (opt-in) |

Integration tests may spawn child processes, read multiple files to verify cross-references, or assert that package.json scripts match VS Code tasks. They are heavier than contract tests but still local and deterministic.

## Current samples

- `repo-workflow.test.mjs` — proves that package scripts, VS Code tasks, hook wiring, and the Playwright helper agree.
- `dangerous-command-hook.test.mjs` — proves that the portable Node hook really blocks destructive commands and sensitive edits.
- `control-plane-coherence.test.mjs` — proves that canonical Claude instructions, the architect/supervisor layer, the drift-check script, the architecture rules, the trunk-bba skill, and the delivery-model ADR agree.
- `design-flow-coherence.test.mjs` — proves that the designer lane, the design-docs check, and the selector-registry rule agree across canonical repo surfaces.
- `delivery-flow-coherence.test.mjs` — proves that the implementation, frontend, and acceptance lanes plus their bounded-reading rules agree across canonical repo surfaces.
- `agent-compatibility-coherence.test.mjs` — proves that the canonical contract, AGENTS adapter, Claude adapter, package scripts, and pre-commit wiring stay aligned.

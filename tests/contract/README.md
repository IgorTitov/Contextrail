<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the repository contracts that should stay stable across template edits.
@sidecar README.md.header.md
@layer tests | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# tests/contract

Contract tests verify that **durable repository conventions** hold — the structural agreements that scripts, agents, skills, and docs depend on.

## Role in the test pyramid

| Layer | What it proves |
| ----- | -------------- |
| unit | Pure logic in isolation |
| integration | Multi-file wiring and local entrypoint proofs |
| **contract** | **Stable repo-wide conventions and boundary contracts** |
| bdd | Gherkin scenarios and traceability |
| e2e | Visible browser behavior (opt-in) |

Contract tests read source files, import modules, and assert structural properties. They do not spawn scripts or processes — that is what integration tests do.

## Current samples

- `header-sidecar-contract.test.mjs` — proves the one-sidecar rule and the repo-local `FileId` namespace.
- `header-warning-signal.test.mjs` — proves that header validation stays high-signal and does not flood the repo with generic traceability warnings.
- `header-version-stamp.test.mjs` — proves that header creation and repair stamp the current repository version instead of file-local pseudo-versions.
- `product-docs-contract.test.mjs` — proves that feature intake, personas, PRD, USM, and backlog keep the canonical source-of-truth split and routing.
- `ui-selector-registry-contract.test.mjs` — proves that automation-facing UI hooks stay registry-driven across the canonical architecture, development, frontend, and design-system surfaces.
- `delivery-agents-contract.test.mjs` — proves that implementation, frontend, and acceptance-lane contracts keep the bounded-reading and role-split conventions stable.
- `agent-adapter-consistency.test.mjs` — proves that the canonical contract, AGENTS adapter, Codex skills, and Claude adapter stay in sync.

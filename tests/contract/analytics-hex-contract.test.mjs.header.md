---
fileId: contextrail-template:tests:contract:analytics-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
summary: Hex contract tests for the analytics module.
owns: Structural contract proof that modules/analytics/ respects hex folder layout, exports only through public-api.mjs, contains a valid manifest.json, and has a README documenting the module.
boundaries: Must not test domain logic, adapter behaviour, or UI flows; must only assert structural and boundary constraints of the analytics hex module.
invariants: Tests must stay red if domain/, ports/, or adapters/ are missing; tests must stay red if public-api.mjs is absent; manifest.json must declare name as "analytics" and include public-api.mjs in exports; must not import from module internals directly.
notesForLLM: When the analytics module gains new required folders or public-api exports, add structural assertions here first (TDD). Do not add domain-logic or adapter-behaviour assertions to this file.
tests:
  - node:test runner via pnpm test:contract
  - passes as part of the full test gate
related: tests/unit/analytics.test.mjs
specRefs: TPL-163
---

# analytics-hex-contract.test.mjs

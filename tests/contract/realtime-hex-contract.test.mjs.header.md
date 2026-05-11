---
fileId: contextrail-template:tests:contract:realtime-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
summary: Hex contract tests for the realtime module.
owns: Structural contract proof that modules/realtime/ respects hex folder layout, exports only through public-api.mjs, contains a valid manifest.json, and has a README documenting the module.
boundaries: Must not test connection behaviour, transport adapters, or state machine logic; must only assert structural and boundary constraints of the realtime hex module.
invariants: Tests must stay red if domain/, ports/, or adapters/ are missing; tests must stay red if public-api.mjs is absent; manifest.json must declare name as "realtime" and include public-api.mjs in exports; must not import from module internals directly.
notesForLLM: When the realtime module gains new required folders or public-api exports, add structural assertions here first (TDD). Do not add connection, transport, or state machine behaviour assertions to this file.
tests:
  - node:test runner via pnpm test:contract
  - passes as part of the full test gate
related: tests/unit/realtime.test.mjs
specRefs: TPL-148
---

# realtime-hex-contract.test.mjs

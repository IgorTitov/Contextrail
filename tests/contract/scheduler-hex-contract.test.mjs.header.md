---
fileId: contextrail-template:tests:contract:scheduler-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
summary: Hex contract tests for the scheduler module.
owns: Structural contract proof that modules/scheduler/ respects hex folder layout, exports only through public-api.mjs, contains a valid manifest.json, and has a README documenting the module.
boundaries: Must not test scheduling behaviour, timer logic, or adapter operation; must only assert structural and boundary constraints of the scheduler hex module.
invariants: Tests must stay red if domain/, ports/, or adapters/ are missing; tests must stay red if public-api.mjs is absent; manifest.json must declare name as "scheduler" and include public-api.mjs in exports; must not import from module internals directly.
notesForLLM: When the scheduler module gains new required folders or public-api exports, add structural assertions here first (TDD). Do not add timing, cron-parsing, or adapter-behaviour assertions to this file.
tests:
  - node:test runner via pnpm test:contract
  - passes as part of the full test gate
related: tests/unit/scheduler.test.mjs
specRefs: TPL-168
---

# scheduler-hex-contract.test.mjs

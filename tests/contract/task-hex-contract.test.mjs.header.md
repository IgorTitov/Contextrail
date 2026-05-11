---
fileId: contextrail-template:tests:contract:task-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
summary: Hex contract tests for the task module.
owns: Structural contract proof that modules/task/ respects hex folder layout, exports only through public-api.mjs, contains a valid manifest.json, and has a README documenting the module.
boundaries: Must not test task lifecycle logic, worker behaviour, or adapter operation; must only assert structural and boundary constraints of the task hex module.
invariants: Tests must stay red if domain/, ports/, or adapters/ are missing; tests must stay red if public-api.mjs is absent; manifest.json must declare name as "task" and include public-api.mjs in exports; must not import from module internals directly.
notesForLLM: When the task module gains new required folders or public-api exports, add structural assertions here first (TDD). Do not add task lifecycle, worker thread, or adapter-behaviour assertions to this file.
tests:
  - node:test runner via pnpm test:contract
  - passes as part of the full test gate
related: tests/unit/task.test.mjs
specRefs: TPL-154
---

# task-hex-contract.test.mjs

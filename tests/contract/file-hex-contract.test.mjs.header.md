---
fileId: contextrail-template:tests:contract:file-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
summary: Hex contract tests for the file module.
owns: Structural contract proof that modules/file/ respects hex folder layout, exports only through public-api.mjs, and has a README documenting the module.
boundaries: Must not test domain logic, file I/O behaviour, or MIME-type resolution; must only assert structural and boundary constraints of the file hex module.
invariants: Tests must stay red if domain/, ports/, or adapters/ are missing; tests must stay red if public-api.mjs is absent; README must reference the module or hex architecture; must not import from module internals directly.
notesForLLM: When the file module gains new required folders or public-api exports, add structural assertions here first (TDD). Do not add domain-logic or file-I/O assertions to this file.
tests:
  - node:test runner via pnpm test:contract
  - passes as part of the full test gate
  - SpecRefs TPL-160, TPL-161, TPL-162
specRefs:
  - TPL-160
  - TPL-161
  - TPL-162
related: tests/unit/file.test.mjs
---

# file-hex-contract.test.mjs

---
fileId: contextrail-template:tests:contract:user-preferences-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
summary: Hex contract tests for the user-preferences module.
owns: Structural contract proof that modules/user-preferences/ respects hex folder layout, exports only through public-api.mjs, and contains no deep cross-module imports.
boundaries: Must not test domain logic or UI behaviour; must only assert structural and boundary constraints of the user-preferences hex module.
invariants: Tests must stay red if domain/, ports/, or adapters/ are missing; tests must stay red if public-api.mjs is absent or exports an unexpected surface; must not import from module internals directly.
notesForLLM: When the user-preferences module gains new required folders or public-api exports, add assertions here first (TDD). Do not add domain-logic assertions to this file.
tests:
  - node:test runner via pnpm test:contract
  - passes as part of the full test gate
specRefs: TPL-014
---

# user-preferences-hex-contract.test.mjs

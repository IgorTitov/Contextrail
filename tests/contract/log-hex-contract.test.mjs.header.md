---
fileId: contextrail-template:tests:contract:log-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
summary: Hex contract tests for the log module.
owns: Structural contract proof that modules/log/ respects hex folder layout, exports only through public-api.mjs, contains a valid manifest.json, and has a README documenting the module.
boundaries: Must not test log adapter behaviour, output formatting, or transport connections; must only assert structural and boundary constraints of the log hex module.
invariants: Tests must stay red if domain/, ports/, or adapters/ are missing; tests must stay red if public-api.mjs is absent; manifest.json must declare name as "log" and include public-api.mjs in exports; must not import from module internals directly.
notesForLLM: When the log module gains new required folders or public-api exports, add structural assertions here first (TDD). Do not add adapter-behaviour or output-format assertions to this file.
tests:
  - node:test runner via pnpm test:contract
  - passes as part of the full test gate
related: tests/unit/log.test.mjs
specRefs: TPL-137
---

# log-hex-contract.test.mjs

---
fileId: contextrail-template:tests:contract:cache-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
summary: Hex contract tests for the cache module.
owns: Structural contract proof that modules/cache/ respects hex folder layout, exports only through public-api.mjs, contains a valid manifest.json, and has a README documenting the module.
boundaries: Must not test domain logic, adapter behaviour, or storage interactions; must only assert structural and boundary constraints of the cache hex module.
invariants: Tests must stay red if domain/, ports/, or adapters/ are missing; tests must stay red if public-api.mjs is absent; manifest.json must declare name as "cache" and include public-api.mjs in exports; must not import from module internals directly.
notesForLLM: When the cache module gains new required folders or public-api exports, add structural assertions here first (TDD). Do not add domain-logic or adapter-behaviour assertions to this file.
tests:
  - node:test runner via pnpm test:contract
  - passes as part of the full test gate
related: tests/unit/cache.test.mjs
specRefs: TPL-142
---

# cache-hex-contract.test.mjs

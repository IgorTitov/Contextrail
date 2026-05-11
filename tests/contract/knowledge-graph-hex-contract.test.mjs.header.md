---
fileId: contextrail-template:tests:contract:knowledge-graph-hex-contract.test
module: tests/contract
stability: evolving
steward: shared
api: file-local
summary: Hex contract tests for the knowledge-graph module.
owns: Structural contract proof that modules/knowledge-graph/ respects hex folder layout, exports only through public-api.mjs, contains a valid manifest.json, and has a README.
boundaries: Must not test domain logic, adapter behaviour, or graph algorithms; must only assert structural and boundary constraints of the knowledge-graph hex module.
invariants: Tests must stay red if domain/, ports/, or adapters/ are missing; tests must stay red if public-api.mjs is absent; manifest.json must declare name as "knowledge-graph" and include public-api.mjs in exports.
notesForLLM: When the knowledge-graph module gains new required folders or public-api exports, add structural assertions here first (TDD). Do not add domain-logic or adapter-behaviour assertions to this file.
tests: self
specRefs:
  - TPL-115
  - TPL-116
  - TPL-117
  - TPL-118
  - TPL-121
---

# knowledge-graph-hex-contract.test.mjs

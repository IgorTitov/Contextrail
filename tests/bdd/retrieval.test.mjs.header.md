---
fileId: contextrail-template:tests:bdd:retrieval.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the retrieval module.
owns: BDD step runner that maps retrieval.feature scenarios to retrieval module public API calls.
boundaries: Imports only from modules/retrieval/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/retrieval.feature for the scenario descriptions.
tests: self
---

# retrieval.test.mjs

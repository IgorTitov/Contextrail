---
fileId: contextrail-template:tests:bdd:local-llm.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the local-llm module.
owns: BDD step runner that maps local-llm.feature scenarios to local-llm module public API calls.
boundaries: Imports only from modules/local-llm/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/local-llm.feature for the scenario descriptions.
tests: self
---

# local-llm.test.mjs

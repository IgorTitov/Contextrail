---
fileId: contextrail-template:tests:bdd:api-client.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the api-client module.
owns: BDD step runner that maps api-client.feature scenarios to api-client module public API calls.
boundaries: Imports only from modules/api-client/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/api-client.feature for the scenario descriptions.
tests: self
---

# api-client.test.mjs

---
fileId: contextrail-template:tests:bdd:log.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the log module.
owns: BDD step runner that maps log.feature scenarios to log module public API calls.
boundaries: Imports only from modules/log/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/log.feature for the scenario descriptions.
tests: self
---

# log.test.mjs

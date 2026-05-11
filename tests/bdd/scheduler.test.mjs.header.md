---
fileId: contextrail-template:tests:bdd:scheduler.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the scheduler module.
owns: BDD step runner that maps scheduler.feature scenarios to scheduler module public API calls.
boundaries: Imports only from modules/scheduler/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/scheduler.feature for the scenario descriptions.
tests: self
---

# scheduler.test.mjs

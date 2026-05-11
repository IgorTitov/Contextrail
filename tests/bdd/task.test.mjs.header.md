---
fileId: contextrail-template:tests:bdd:task.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the task module.
owns: BDD step runner that maps task.feature scenarios to task module public API calls.
boundaries: Imports only from modules/task/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/task.feature for the scenario descriptions.
tests: self
---

# task.test.mjs

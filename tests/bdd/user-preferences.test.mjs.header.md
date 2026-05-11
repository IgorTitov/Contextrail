---
fileId: contextrail-template:tests:bdd:user-preferences.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the user-preferences module.
owns: BDD step runner that maps user-preferences.feature scenarios to user-preferences module public API calls.
boundaries: Imports only from modules/user-preferences/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/user-preferences.feature for the scenario descriptions.
tests: self
---

# user-preferences.test.mjs

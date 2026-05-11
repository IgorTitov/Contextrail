---
fileId: contextrail-template:tests:bdd:permission.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the permission module.
owns: BDD step runner that maps permission.feature scenarios to permission module public API calls.
boundaries: Imports only from modules/permission/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/permission.feature for the scenario descriptions.
tests: self
---

# permission.test.mjs

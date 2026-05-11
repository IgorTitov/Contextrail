---
fileId: contextrail-template:tests:bdd:file.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the file module.
owns: BDD step runner that maps file.feature scenarios to file module public API calls.
boundaries: Imports only from modules/file/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/file.feature for the scenario descriptions.
tests: self
---

# file.test.mjs

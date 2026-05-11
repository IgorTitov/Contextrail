---
fileId: contextrail-template:tests:bdd:form-validation.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the form-validation module.
owns: BDD step runner that maps form-validation.feature scenarios to form-validation module public API calls.
boundaries: Imports only from modules/form-validation/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/form-validation.feature for the scenario descriptions.
tests: self
---

# form-validation.test.mjs

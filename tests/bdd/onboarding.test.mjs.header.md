---
fileId: contextrail-template:tests:bdd:onboarding.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the onboarding module.
owns: BDD step runner that maps onboarding.feature scenarios to onboarding module public API calls.
boundaries: Imports only from modules/onboarding/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/onboarding.feature for the scenario descriptions.
tests: self
---

# onboarding.test.mjs

---
fileId: contextrail-template:tests:bdd:feature-seams.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the feature-seams module.
owns: BDD step runner that maps feature-seams.feature scenarios to feature-seams module public API calls.
boundaries: Imports only from modules/feature-seams/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/feature-seams.feature for the scenario descriptions.
tests: self
---

# feature-seams.test.mjs

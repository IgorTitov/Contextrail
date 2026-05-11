---
fileId: contextrail-template:tests:bdd:analytics.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the analytics module.
owns: BDD step runner that maps analytics.feature scenarios to analytics module public API calls.
boundaries: Imports only from modules/analytics/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/analytics.feature for the scenario descriptions.
tests: self
---

# analytics.test.mjs

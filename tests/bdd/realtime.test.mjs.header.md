---
fileId: contextrail-template:tests:bdd:realtime.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the realtime module.
owns: BDD step runner that maps realtime.feature scenarios to realtime module public API calls.
boundaries: Imports only from modules/realtime/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/realtime.feature for the scenario descriptions.
tests: self
---

# realtime.test.mjs

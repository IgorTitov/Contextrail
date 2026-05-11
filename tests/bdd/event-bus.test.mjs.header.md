---
fileId: contextrail-template:tests:bdd:event-bus.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the event-bus module.
owns: BDD step runner that maps event-bus.feature scenarios to event-bus module public API calls.
boundaries: Imports only from modules/event-bus/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/event-bus.feature for the scenario descriptions.
tests: self
---

# event-bus.test.mjs

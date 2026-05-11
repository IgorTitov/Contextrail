---
fileId: contextrail-template:tests:bdd:notifications.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the notifications module.
owns: BDD step runner that maps notifications.feature scenarios to notifications module public API calls.
boundaries: Imports only from modules/notifications/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/notifications.feature for the scenario descriptions.
tests: self
---

# notifications.test.mjs

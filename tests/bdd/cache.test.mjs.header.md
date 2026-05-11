---
fileId: contextrail-template:tests:bdd:cache.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the cache module.
owns: BDD step runner that maps cache.feature scenarios to cache module public API calls.
boundaries: Imports only from modules/cache/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/cache.feature for the scenario descriptions.
tests: self
---

# cache.test.mjs

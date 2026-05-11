---
fileId: contextrail-template:tests:bdd:knowledge-graph.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the knowledge-graph module.
owns: BDD step runner that maps knowledge-graph.feature scenarios to knowledge-graph module public API calls.
boundaries: Imports only from modules/knowledge-graph/public-api.mjs; never deep-imports module internals.
invariants: Each test maps 1-to-1 with a Gherkin scenario; no logic beyond the step wiring.
notesForLLM: Pair with tests/bdd/features/knowledge-graph.feature for the scenario descriptions.
tests: self
---

# knowledge-graph.test.mjs

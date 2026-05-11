---
fileId: contextrail-template:tests:bdd:features:knowledge-graph
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the knowledge-graph module.
owns: Gherkin scenarios for knowledge-graph module BDD coverage.
boundaries: Describes user-visible knowledge graph behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/knowledge-graph.test.mjs which implements the step runner.
tests: self
---

# knowledge-graph.feature

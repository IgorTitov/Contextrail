---
fileId: contextrail-template:tests:bdd:state-store.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the state-store module.
owns: BDD step runner proving the state-store scenarios.
boundaries: This file proves user-visible behavior through Gherkin scenarios. It must not become a unit test.
invariants: Each Gherkin scenario maps to one test block. Scenario names must match the feature file.
notesForLLM: Each test corresponds to a Gherkin scenario. Keep the mapping explicit.
tests: self
specRefs:
  - TPL-043
  - TPL-048
---

# state-store.test.mjs

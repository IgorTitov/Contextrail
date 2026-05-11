---
fileId: contextrail-template:tests:bdd:ai-chat.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the ai-chat module.
owns: BDD step runner proving the ai-chat scenarios.
boundaries: This file proves user-visible behavior through Gherkin scenarios. It must not become a unit test.
invariants: Each Gherkin scenario maps to one test block. Scenario names must match the feature file.
notesForLLM: Each test corresponds to a Gherkin scenario. Keep the mapping explicit.
tests: self
specRefs:
  - TPL-071
  - TPL-073
  - TPL-075
---

# ai-chat.test.mjs

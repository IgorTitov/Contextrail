---
fileId: contextrail-template:tests:bdd:auth-login.test
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: BDD step runner for the auth-login module.
owns: BDD step runner proving the auth-login scenarios.
boundaries: This file proves user-visible behavior through Gherkin scenarios. It must not become a unit test.
invariants: Each Gherkin scenario maps to one test block. Scenario names must match the feature file.
notesForLLM: Each test corresponds to a Gherkin scenario. Keep the mapping explicit.
tests: self
specRefs:
  - TPL-062
  - TPL-064
  - TPL-065
  - TPL-067
  - TPL-135
---

# auth-login.test.mjs

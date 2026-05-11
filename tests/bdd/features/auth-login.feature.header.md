---
fileId: contextrail-template:tests:bdd:features:auth-login
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the auth-login module.
owns: The BDD scenarios proving user-visible authentication behavior.
boundaries: This file belongs to the proof surface. Keep scenarios user-visible and behavior-focused.
invariants: Scenario names must stay aligned with the BDD test runner and any traceability refs.
notesForLLM: Keep scenarios user-visible. Each test corresponds to a Gherkin scenario in auth-login.test.mjs.
tests: self
specRefs:
  - TPL-062
  - TPL-064
  - TPL-065
  - TPL-067
---

# auth-login.feature

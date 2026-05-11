---
fileId: contextrail-template:tests:bdd:features:user-preferences
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the user-preferences module.
owns: Gherkin scenarios for user-preferences module BDD coverage.
boundaries: Describes user-visible user preferences behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/user-preferences.test.mjs which implements the step runner.
tests: self
---

# user-preferences.feature

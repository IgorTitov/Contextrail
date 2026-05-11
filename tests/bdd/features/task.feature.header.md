---
fileId: contextrail-template:tests:bdd:features:task
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the task module.
owns: Gherkin scenarios for task module BDD coverage.
boundaries: Describes user-visible background task lifecycle behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/task.test.mjs which implements the step runner.
tests: self
---

# task.feature

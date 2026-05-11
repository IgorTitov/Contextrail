---
fileId: contextrail-template:tests:bdd:features:log
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the log module.
owns: Gherkin scenarios for log module BDD coverage.
boundaries: Describes user-visible structured logging behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/log.test.mjs which implements the step runner.
tests: self
---

# log.feature

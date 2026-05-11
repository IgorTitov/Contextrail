---
fileId: contextrail-template:tests:bdd:features:analytics
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the analytics module.
owns: Gherkin scenarios for analytics module BDD coverage.
boundaries: Describes user-visible privacy-first analytics behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/analytics.test.mjs which implements the step runner.
tests: self
---

# analytics.feature

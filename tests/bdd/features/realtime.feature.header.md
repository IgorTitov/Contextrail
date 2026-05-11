---
fileId: contextrail-template:tests:bdd:features:realtime
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the realtime module.
owns: Gherkin scenarios for realtime module BDD coverage.
boundaries: Describes user-visible realtime transport behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/realtime.test.mjs which implements the step runner.
tests: self
---

# realtime.feature

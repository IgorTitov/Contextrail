---
fileId: contextrail-template:tests:bdd:features:file
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the file module.
owns: Gherkin scenarios for file module BDD coverage.
boundaries: Describes user-visible file management behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/file.test.mjs which implements the step runner.
tests: self
---

# file.feature

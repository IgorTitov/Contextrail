---
fileId: contextrail-template:tests:bdd:features:feature-seams
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the feature-seams module.
owns: Gherkin scenarios for feature-seams module BDD coverage.
boundaries: Describes user-visible feature seam toggling behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/feature-seams.test.mjs which implements the step runner.
tests: self
---

# feature-seams.feature

---
fileId: contextrail-template:tests:bdd:features:onboarding
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the onboarding module.
owns: Gherkin scenarios for onboarding module BDD coverage.
boundaries: Describes user-visible onboarding wizard behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/onboarding.test.mjs which implements the step runner.
tests: self
---

# onboarding.feature

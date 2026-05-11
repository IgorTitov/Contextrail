---
fileId: contextrail-template:tests:bdd:features:permission
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the permission module.
owns: Gherkin scenarios for permission module BDD coverage.
boundaries: Describes user-visible permission checking behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/permission.test.mjs which implements the step runner.
tests: self
---

# permission.feature

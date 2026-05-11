---
fileId: contextrail-template:tests:bdd:features:api-client
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the api-client module.
owns: Gherkin scenarios for api-client module BDD coverage.
boundaries: Describes user-visible HTTP request behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/api-client.test.mjs which implements the step runner.
tests: self
---

# api-client.feature

---
fileId: contextrail-template:tests:bdd:features:local-llm
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the local-llm module.
owns: Gherkin scenarios for local-llm module BDD coverage.
boundaries: Describes user-visible local LLM inference behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/local-llm.test.mjs which implements the step runner.
tests: self
---

# local-llm.feature

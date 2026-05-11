---
fileId: contextrail-template:tests:bdd:features:retrieval
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the retrieval module.
owns: Gherkin scenarios for retrieval module BDD coverage.
boundaries: Describes user-visible RAG retrieval pipeline behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/retrieval.test.mjs which implements the step runner.
tests: self
---

# retrieval.feature

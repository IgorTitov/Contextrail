---
fileId: contextrail-template:tests:bdd:features:cache
module: tests/bdd
stability: evolving
steward: shared
api: file-local
summary: Gherkin BDD scenarios for the cache module.
owns: Gherkin scenarios for cache module BDD coverage.
boundaries: Describes user-visible LRU cache behavior only; does not test internals.
invariants: Each scenario is independent; no shared mutable state between scenarios.
notesForLLM: Read alongside tests/bdd/cache.test.mjs which implements the step runner.
tests: self
---

# cache.feature

---
fileId: contextrail-template:tests:unit:test-entity-map.test
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - scripts/lib/test-entity-map.mjs
  - scripts/lib/architecture-graph.mjs
  - scripts/lib/header.mjs
summary: Unit tests for the test-to-entity mapping pure functions.
owns: Unit proof for the test-entity-map pure functions.
boundaries: Only test pure functions with synthetic data. No filesystem access.
invariants: Tests must verify entity map shapes match the documented JSON contracts.
securityPrivacy: Test-only; no I/O.
notesForLLM: Use synthetic fileSources arrays and TAP output strings.
tests: self
linkedDocs: scripts/lib/test-entity-map.mjs
specRefs: TPL-136
related: tests/unit/architecture-graph.test.mjs
---

# test-entity-map.test.mjs

---
fileId: contextrail-template:tests:unit:architecture-graph.test
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - scripts/lib/architecture-graph.mjs
  - scripts/lib/header.mjs
summary: Unit tests for the architecture graph builder pure functions.
owns: Unit proof for the architecture graph pure functions.
boundaries: Only test pure functions with synthetic data. No filesystem access.
invariants: Tests must verify graph shapes match the documented JSON contracts.
securityPrivacy: Test-only; no I/O.
notesForLLM: Use synthetic fileSources arrays, not real files.
tests: self
linkedDocs: scripts/lib/architecture-graph.mjs
related: tests/unit/header-engine.test.mjs
---

# architecture-graph.test.mjs

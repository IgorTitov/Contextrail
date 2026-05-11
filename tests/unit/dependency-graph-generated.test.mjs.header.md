---
fileId: contextrail-template:tests:unit:dependency-graph-generated
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:child_process
  - node:fs
  - node:os
  - scripts/checks/dependency-graph.mjs
summary: Regression proof for TPL-331 dependency-graph _generated stability — two consecutive runs on stable content must produce the same _generated timestamp.
owns: Proves that parseJsonOrNull() + _generated preservation logic prevent fingerprint drift caused by fresh timestamps on every ceremony run.
tests: self
linkedDocs:
  - scripts/checks/dependency-graph.mjs
  - docs/adr/0048-idempotent-ceremony-outputs.md
---

# dependency-graph-generated.test.mjs

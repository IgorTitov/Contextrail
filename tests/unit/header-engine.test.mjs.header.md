---
fileId: contextrail-template:tests:unit:header-engine
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - scripts/lib/header.mjs
summary: Unit proof for the pure functions in scripts/lib/header.mjs — the header v2 engine.
owns: Unit proof for the header v2 engine's pure functions.
boundaries: Only test pure functions here. Filesystem-dependent functions belong in integration tests.
invariants: Tests must stay aligned with header.mjs marker names and schema.
securityPrivacy: Test-only; no I/O.
notesForLLM: These tests cover the header engine's pure transformation functions. File-discovery and git-based functions are not tested here.
tests: self
linkedDocs:
  - scripts/lib/header.mjs
  - scripts/lib/README.md
specRefs:
  - TPL-204
related:
  - tests/unit/shared-helpers.test.mjs
  - scripts/lib/header.mjs
---

# header-engine.test.mjs

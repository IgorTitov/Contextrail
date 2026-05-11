---
name: claim-check.test.mjs
description: Meta-test pinning MAX_TTL_HOURS and MAX_TARGETS trust constants in scripts/checks/claim-check.mjs. (CG-C2-1, TPL-241)
type: tests
layer: tests
public: false
edit: careful
sidecarOf: claim-check.test.mjs
covers:
  - scripts/checks/claim-check.mjs
invariants:
  - MAX_TTL_HOURS must equal 168 (7 days).
  - MAX_TARGETS must equal 100.
---

# claim-check.test.mjs

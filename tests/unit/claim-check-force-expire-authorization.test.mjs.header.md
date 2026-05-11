---
name: claim-check-force-expire-authorization.test.mjs
description: Meta-test pinning MIN_FORCE_EXPIRE_AGE_MINUTES constant in scripts/checks/claim-check.mjs. (CG-F1-1, TPL-241)
type: tests
layer: tests
public: false
edit: careful
sidecarOf: claim-check-force-expire-authorization.test.mjs
covers:
  - scripts/checks/claim-check.mjs
specRefs: TPL-221
invariants:
  - MIN_FORCE_EXPIRE_AGE_MINUTES must equal 5.
---

# claim-check-force-expire-authorization.test.mjs

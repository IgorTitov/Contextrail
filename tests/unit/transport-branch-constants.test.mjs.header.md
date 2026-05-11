---
name: transport-branch-constants.test.mjs
description: Meta-test pinning MERGING_MARKER_MAX_AGE_MS constant in scripts/lib/transport-branch.mjs. (CG-R2-5, TPL-241)
type: tests
layer: tests
public: false
edit: careful
sidecarOf: transport-branch-constants.test.mjs
covers:
  - scripts/lib/transport-branch.mjs
relatedRule: r2-transport-branch
specRefs: TPL-235
invariants:
  - MERGING_MARKER_MAX_AGE_MS must equal 300000 (5 minutes).
---

# transport-branch-constants.test.mjs

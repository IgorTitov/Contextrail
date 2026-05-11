---
name: hook-integrity-check.mjs
description: CLI check that verifies sha256 fingerprints of .githooks/* match the committed registry; operator-gated --update regenerates registry (R8.2 / TPL-256).
type: tooling
layer: tooling
hexLayer: _none_
ctx: hook-integrity
public: false
edit: careful
specRefs: TPL-256
ruleRefs:
  - R8.2
---

# hook-integrity-check.mjs

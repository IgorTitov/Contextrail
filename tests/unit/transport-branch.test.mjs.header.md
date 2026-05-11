---
name: transport-branch.test.mjs
description: Unit tests pinning the pure-logic helpers behind R2 / ADR-0017 — branch-name regex, marker shape, age verdicts, ceremony-file intersection.
type: tests
layer: tests
public: false
edit: careful
sidecarOf: transport-branch.test.mjs
relatedAdr:
  - docs/adr/0017-transport-branch-enforcement.md
relatedRule: r2-transport-branch
covers:
  - scripts/lib/transport-branch.mjs
testCount: 77
runner: node:test
invariants:
  - No filesystem access, no git invocations — pure-function tests.
  - Boundary cases pin warn/refuse thresholds exactly (23.99h vs 24h, 167.99h vs 168h).
  - Frozen-table tests catch accidental mutation of BANNED_BRANCH_PATTERNS / CEREMONY_FILES.
---

# transport-branch.test.mjs

Pins every helper exported from `scripts/lib/transport-branch.mjs`.
Weakening the regex, changing a threshold, or relaxing the marker
shape fails CI.

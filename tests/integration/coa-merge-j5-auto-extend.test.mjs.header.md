---
name: coa-merge-j5-auto-extend.test.mjs
description: Integration tests proving J5 auto-extend covers CHANGELOG.md when pre-staged and sidecar pairs (TPL-252).
type: test
layer: tests
hex: _none_
ctx: _none_
public: false
editConstraint: careful
version: 0.7.60
createdDate: 2026-05-03
updatedDate: 2026-05-03
slice: TPL-252
specRefs:
  - TPL-252
dependsOn: scripts/coa-merge.mjs
tests: node --test tests/integration/coa-merge-j5-auto-extend.test.mjs
---
# coa-merge-j5-auto-extend.test.mjs

---
name: coa-merge-find-caller-claim.test.mjs
description: Unit tests for tiered pickCallerClaim scoring — closes TPL-280 Incident #2 wrong-claim-pick class (TPL-311).
type: test
layer: tests
hex: _none_
ctx: _none_
public: false
editConstraint: careful
version: 0.7.118
createdDate: 2026-05-06
updatedDate: 2026-05-06
slice: TPL-311
specRefs:
  - TPL-311
dependsOn: scripts/coa-merge.mjs
tests: node --test tests/unit/coa-merge-find-caller-claim.test.mjs
---
# coa-merge-find-caller-claim.test.mjs

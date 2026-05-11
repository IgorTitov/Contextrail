---
version: 0.7.89
date: 2026-05-05
purpose: Unit and CLI tests for C4 slice-ID uniqueness invariant — findActiveClaimWithSlice, findCommittedSliceUse, and --acquire CLI blocking (TPL-282)
layer: tests
hexLayer: _none_
ctx: _none_
public: false
edit: careful
specRefs:
  - TPL-282
linkedDocs:
  - docs/adr/0020-slice-id-uniqueness.md
  - docs/rules-registry.md
related:
  - scripts/checks/claim-check.mjs
  - tests/unit/claim-check.test.mjs
---

# claim-check-slice-id-uniqueness.test.mjs

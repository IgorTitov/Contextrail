---
version: 0.7.89
date: 2026-05-05
purpose: Race test for C4 slice-ID uniqueness invariant — concurrent acquire attempts (TPL-282)
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
windowsNote: May be flaky on Windows due to NTFS O_EXCL semantics; tracked as TPL-283
---

# coa-worktree-slice-id-race.test.mjs

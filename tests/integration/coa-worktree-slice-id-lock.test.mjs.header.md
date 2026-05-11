---
version: 0.7.89
date: 2026-05-05
purpose: Integration tests for C4 slice-ID uniqueness invariant in coa-worktree --create (TPL-282)
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
  - scripts/coa-worktree.mjs
  - scripts/checks/claim-check.mjs
  - tests/integration/coa-worktree-lifecycle.test.mjs
---

# coa-worktree-slice-id-lock.test.mjs

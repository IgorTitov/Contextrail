---
version: 0.0.0
date: 2026-05-06
purpose: Integration tests proving coa-worktree --create emits explicit STOP guidance on branch-already-exists (ADR-0035, TPL-306 / ZVX-DEV-101 defence).
layer: tests
hexLayer: _none_
ctx: _none_
public: false
edit: careful
specRefs:
  - TPL-306
linkedDocs:
  - docs/adr/0035-coa-worktree-fail-stop.md
  - docs/adr/0034-worktree-ownership.md
related:
  - scripts/coa-worktree.mjs
---

# coa-worktree-fail-stop.test.mjs

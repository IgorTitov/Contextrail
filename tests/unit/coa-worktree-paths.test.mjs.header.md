---
name: coa-worktree-paths.test.mjs
description: Unit tests for teardown path resolution (Bug A) and create branch guard (Bug B) in coa-worktree.mjs — TPL-266 regression proof
type: test
layer: tests
hexLayer: _none_
boundedContext: _none_
public: false
editConstraint: careful
specRef: TPL-266
testSubjects:
  - scripts/coa-worktree.mjs
coverage:
  - resolveWorktreePath finds worktree by branch name via git worktree list (Bug A)
  - resolveWorktreePath returns null for unknown branch name (Bug A)
  - runCreate fails with clear error when transport branch already exists (Bug B)
  - runCreate creates worktree on trunk HEAD with no orphan commits (Bug B)
---

# coa-worktree-paths.test.mjs

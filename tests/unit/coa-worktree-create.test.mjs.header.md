---
name: coa-worktree-create.test.mjs
description: Unit tests for coa-worktree.mjs --create — transport worktree creation, node_modules junction, and transportWorktreePath helper.
type: tests
layer: tests
public: false
edit: careful
sidecarOf: coa-worktree-create.test.mjs
covers:
  - scripts/coa-worktree.mjs
specRefs:
  - TPL-251
linkedDocs:
  - docs/adr/0016-worktree-lifecycle.md
  - docs/adr/0015-test-isolation-enforcement.md
  - docs/adr/0017-transport-branch-enforcement.md
---

# coa-worktree-create.test.mjs

---
file: tests/unit/coa-worktree-teardown.test.mjs
purpose: TDD tests for unsetStaleCoreWorktree — proves the teardown path cleans stale core.worktree from main .git/config (TPL-269).
layer: tests
hex: _none_
ctx: _none_
public: false
edit: careful
specRefs:
  - TPL-269
testRefs:
  - tests/unit/coa-worktree-teardown.test.mjs
linkedDocs:
  - docs/adr/0016-worktree-lifecycle.md
related:
  - tests/unit/coa-worktree-create.test.mjs
  - scripts/coa-worktree.mjs
---

# coa-worktree-teardown.test.mjs

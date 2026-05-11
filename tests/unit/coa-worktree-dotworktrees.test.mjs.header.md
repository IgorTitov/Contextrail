---
name: coa-worktree-dotworktrees.test.mjs
description: Tests for TPL-334 / ADR-0050 — transport worktrees placed inside .worktrees/ subdir; backward compat for old sibling locations; teardown and teardown-stale enumerate both
type: test
layer: tests
hexLayer: _none_
boundedContext: _none_
public: false
editConstraint: careful
specRef: TPL-334
testSubjects:
  - scripts/coa-worktree.mjs
coverage:
  - transportWorktreePath returns path inside .worktrees/ subdir (not a direct sibling)
  - parent of worktree path is named .worktrees
  - runCreate auto-creates .worktrees/ parent dir before git worktree add
  - .worktrees/ dir creation is idempotent when dir already exists
  - node_modules junction resolves through .worktrees/ path
  - runTeardown finds and removes worktrees in old sibling location (backward compat)
  - runTeardown finds and removes worktrees in new .worktrees/ location
  - listWorktrees enumerates a .worktrees/-located worktree
  - runTeardownStale dry-run discovers and classifies a .worktrees/-located worktree
---

# coa-worktree-dotworktrees.test.mjs

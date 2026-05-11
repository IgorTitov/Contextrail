---
name: main-worktree-dirt-audit.test.mjs
description: Unit tests for W1 main-worktree-dirt-audit.mjs pure helpers (TPL-283)
type: test
layer: tests
hex: _none_
ctx: _none_
public: false
edit: careful
owner: TPL-283 / W1
tests: self
seeAlso:
  - scripts/checks/main-worktree-dirt-audit.mjs
  - docs/adr/0021-auto-teardown-and-dirt-audit.md
---

# main-worktree-dirt-audit.test.mjs

Unit tests for the pure helpers exported from `main-worktree-dirt-audit.mjs`.
Covers all five spec scenarios without shelling out to the script.

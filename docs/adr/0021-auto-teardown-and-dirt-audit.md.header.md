---
name: 0021-auto-teardown-and-dirt-audit.md
description: ADR-0021 — rationale for coa-merge step 9e auto-teardown, step 9f claim expiry, and Phase 0.5 main-worktree dirt audit (TPL-283)
type: adr
layer: docs
hex: _none_
ctx: _none_
public: true
edit: careful
owner: TPL-283
seeAlso:
  - docs/adr/0016-worktree-lifecycle.md
  - docs/adr/0018-main-worktree-guard.md
  - docs/rules-registry.md
  - scripts/coa-merge.mjs
  - scripts/checks/main-worktree-dirt-audit.mjs
---

# 0021-auto-teardown-and-dirt-audit.md

ADR covering three related hygiene improvements (TPL-283):
- coa-merge step 9e: auto-teardown of provably-merged tx-* branches
- coa-merge step 9f: auto-expire stale claims post-ceremony
- pre-commit Phase 0.5 (W1): main-worktree dirt audit, warn-only

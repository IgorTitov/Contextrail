---
version: 0.7.102
date: 2026-05-05
purpose: Integration tests for coa-worktree auto-pick mode (TPL-280 / ADR-0029) — next-free slice ID selection, history+claim scan, prefix override, conflict rejection, and stdout announcement.
layer: tests
hexLayer: _none_
ctx: _none_
public: false
edit: careful
specRefs:
  - TPL-280
linkedDocs:
  - docs/adr/0029-coa-worktree-auto-pick.md
  - docs/rules-registry.md
related:
  - scripts/coa-worktree.mjs
  - scripts/checks/claim-check.mjs
  - tests/integration/coa-worktree-slice-id-lock.test.mjs
---

# coa-worktree-auto-pick.test.mjs

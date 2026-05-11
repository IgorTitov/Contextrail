---
name: main-worktree-guard.mjs
description: R5 enforcement — block git commit from main worktree; allow only from tx-<slice> transport worktrees.
type: tooling
layer: tooling
public: false
edit: careful
sidecarOf: main-worktree-guard.mjs
relatedAdr:
  - docs/adr/0018-main-worktree-guard.md
relatedRule: r5-main-worktree-guard
modes:
  - --self-test (asserts isTransportWorktree behaviour on 8 fixture paths)
  - --json (machine-readable output { ok, worktreeRoot, isTransport, isOperator })
  - (default; pre-commit hook Phase 0 entry)
nonSkippablePhase: "0"
ports:
  - isTransportWorktree(path) — named export for unit testing
---

# main-worktree-guard.mjs

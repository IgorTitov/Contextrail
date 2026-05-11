---
fileId: contextrail-template:docs:adr:0016-worktree-lifecycle:md
module: docs/adr
stability: stable
steward: shared
api: Documentation
summary: ADR-0016 — Worktree lifecycle visibility and safe cleanup (R4) — audit/refresh/teardown-stale primitives plus pure stamp-only classifier and verdict taxonomy that close the Zvenix accumulated-worktree-debt failure mode.
linkedDocs:
  - docs/adr/README.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
  - docs/adr/0009-header-sidecar-structure.md
  - docs/adr/0014-per-file-version-semantics.md
  - docs/adr/0015-test-isolation-enforcement.md
  - scripts/coa-worktree.mjs
  - scripts/lib/worktree-audit.mjs
  - scripts/lib/worktree-refresh.mjs
related:
  - docs/guides/parallel-sessions.md
  - .claims/config.json
  - .claude/rules/development.md
generated: false
---

# 0016-worktree-lifecycle.md

---
fileId: contextrail-template:scripts:coa-worktree
module: scripts
stability: stable
steward: shared
api: COA worktree lifecycle CLI
summary: Create / list / teardown disposable session and transport worktrees + R4 audit / refresh / teardown-stale primitives (ADR-0016). TPL-251 adds --slice=<id> to create tx-<slice> transport worktrees with automatic node_modules junction.
owns: The CLI surface for `coa-worktree.mjs` plus the audit-record builder, the dry-run-then-execute teardown ceremony, and the marker/audit-log integration. runCreate + transportWorktreePath are exported for test use.
boundaries: This file orchestrates git through spawnSync; pure logic lives in scripts/lib/worktree-{audit,refresh}.mjs and is consumed here without re-implementation.
invariants: --teardown-stale --execute requires COA_OPERATOR=1 + a matching --dry-run marker (≤1h old) + a successful audit-log append before any worktree removal.
risks: Loosening the eligibility check (verdict !== clean-merged) or skipping the operator gate could license unsafe teardown of WIP worktrees. Both are pinned by integration tests and ADR-0016's anti-evasion matrix.
securityPrivacy: Mutates only worktrees declared by `git worktree list`. Audit log lands at <repoRoot>/.claims/audit.log (gitignored). No network access.
notesForLLM: Add new flags via parseWorktreeArgs; do not introduce git invocations outside gitIn(). Keep --execute paths defensive and mandatory-log-first.
linkedDocs:
  - docs/adr/0016-worktree-lifecycle.md
  - docs/guides/parallel-sessions.md
  - scripts/lib/worktree-audit.mjs
  - scripts/lib/worktree-refresh.mjs
related:
  - scripts/coa-merge.mjs
  - scripts/coa-recover.mjs
  - scripts/checks/claim-check.mjs
generated: false
---

# coa-worktree.mjs

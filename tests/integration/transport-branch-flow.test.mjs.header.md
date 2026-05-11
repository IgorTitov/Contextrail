---
name: transport-branch-flow.test.mjs
description: End-to-end integration tests for R2 / ADR-0017 — transport-branch enforcement at pre-commit and the marker-gated ceremony bump path.
type: tests
layer: tests
public: false
edit: careful
sidecarOf: transport-branch-flow.test.mjs
relatedAdr:
  - docs/adr/0017-transport-branch-enforcement.md
  - docs/adr/0015-test-isolation-enforcement.md
relatedRule: r2-transport-branch
covers:
  - scripts/checks/transport-branch-check.mjs
  - scripts/lib/transport-branch.mjs
  - scripts/coa-worktree.mjs (slice helpers only)
  - scripts/coa-merge.mjs (classifyCoaMergeMode only)
testCount: 25
runner: node:test
invariants:
  - Every git invocation goes through safeGit/safeGitSpawn (R1, ADR-0015).
  - All fixtures live under os.tmpdir() / RUNNER_TEMP.
  - PID-chain assertions accept both `pass-with-warning` (probe failed) and
    `refuse` (probe succeeded with mismatch) — both are documented checker behaviours.
---

# transport-branch-flow.test.mjs

Pins the R2 enforcement edges: trunk pass-through, banned-branch refusal,
ceremony bump gated by marker, marker freshness/branch/PID-chain rules,
and the pure-logic classifyCoaMergeMode helper.

<!-- @HEADER
@version 0.7.93 | 2026-05-05
@purpose ADR: --teardown strict branch-ref deletion after worktree removal (TPL-285).
@sidecar 0023-teardown-branch-cleanup.md.header.md
@layer docs | @hex _none_ | @ctx worktree-lifecycle
@public true
@edit careful -->

# ADR-0023 — `--teardown` Strict Branch-Ref Deletion

**Status:** Accepted  
**Date:** 2026-05-05  
**Slice:** TPL-285  
**Discovered via:** AIC-DEV-142 session summary

---

## Context

`coa-worktree --teardown --name=tx-X` removed the worktree directory but left the
local branch ref `tx-X` in place. After teardown, `git branch` still listed `tx-X`,
requiring a manual `git branch -d tx-X` cleanup step.

This gap was surfaced in the AIC-DEV-142 session summary as a post-teardown
operator burden. It also creates confusion in automated ceremonies: step 9e
(TPL-283) enumerates tx-* branches to auto-tear-down provably-merged ones; a
branch that survived a prior `--teardown` looks like an active session to step 9e
and must be re-processed.

## Decision

After a successful `git worktree remove`, `runTeardown` attempts to delete the
local branch ref via `git branch -d <name>` (strict, never `-D`). The outcomes:

| State | Action | Result field |
|---|---|---|
| Branch ref exists, merged into current HEAD | `git branch -d` succeeds | `branchDeleted` = branch name |
| Branch ref exists, NOT merged (unmerged work) | `git branch -d` fails; log warning; continue | `branchPreserved` = branch name |
| Branch ref absent (detached HEAD, already deleted) | Skip silently | both null |

The teardown exit code is 0 in all cases — branch ref status never blocks the
worktree removal from being reported as successful.

## Rationale

### Strict `-d` only — zero-information-loss

`-d` delegates the unmerged-work check to git itself (`git merge-base
--is-ancestor`). This is the same trust model used in coa-merge step 9e
(TPL-283): let git refuse rather than second-guess it. `-D` would silently
destroy unmerged commits with no recovery path.

### Non-fatal on preservation

The worktree is already gone — the directory removal is irreversible.
Refusing to exit 0 because the branch was preserved would obscure the
successful removal and leave the operator without a clear next action.
Instead: log the preserved branch name and let the operator decide.

### Operator escape hatch

If the operator intentionally wants to discard unmerged work:

```bash
git branch -D tx-<slice>
```

This is always available after `--teardown` returns. No COA gate needed —
the decision to destroy unmerged work is explicitly manual.

### Symmetry with step 9e

Step 9e (coa-merge) uses `git branch -d` for the same reason. Matching
models means operators learn one rule: "COA uses strict -d, never -D".

## Consequences

- `runTeardown` is now exported from `coa-worktree.mjs` (replaces unexported
  `teardownWorktree`) and returns `{ exitCode, result }` like other run* helpers.
- `result.branchDeleted` and `result.branchPreserved` surface branch-ref outcome.
- Integration tests cover all four cases (merged/unmerged/worktree-missing/no-branch-ref).
- The AIC-DEV-142 manual `git branch -d` step is eliminated for merged branches.

## Test surface

`tests/integration/coa-worktree-teardown.test.mjs` — 11 scenarios across 4 cases.

## Related

- ADR-0016 — Worktree lifecycle (R4)
- ADR-0021 — coa-merge step 9e auto-teardown (TPL-283)
- TPL-285 — this slice
- AIC-DEV-142 — gap discovery

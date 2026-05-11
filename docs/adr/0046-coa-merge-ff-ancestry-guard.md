<!-- @HEADER
@version 0.8.5 | 2026-05-11
@purpose ADR-0046: ancestry guard + refs/heads/main CAS fix for coa-merge step 9c race condition.
@sidecar 0046-coa-merge-ff-ancestry-guard.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit manual-only -->

# ADR-0046 — coa-merge Step 9c: ancestry guard + full-refname CAS fix

- **Status**: Accepted
- **Date**: 2026-05-11
- **Slice**: TPL-327
- **Related**: ADR-0017 (transport-branch enforcement), ADR-0034 (worktree ownership)

## Context

Two parallel transport-worktrees were started from the same parent commit on
`main`. Branch-A committed and ran coa-merge, successfully ff-updating `main`
via `updateInstead` push. Branch-B then committed on top of the original parent
(not rebased) and also ran coa-merge. Its push succeeded — overwriting branch-A's
commit. Branch-A's work was lost from history, surviving only in the reflog.

Two independent root causes were identified:

### Root cause 1 — short refname in `--force-with-lease`

The push used `--force-with-lease=main:<sha>`. When pushing to a local file-path
remote (the non-bare linked-worktree shape), Git does not resolve `main` as
`refs/heads/main` for lease verification. The lease check was silently skipped,
making the CAS guarantee ineffective.

**Fix**: Use the full refname `--force-with-lease=refs/heads/main:<sha>`.

### Root cause 2 — no ancestry check before ff-update

`mainShaAtEntry` is captured at Step 6.5. Between Step 6.5 and Step 9c several
ceremony phases execute (test-gate, changelog-release, snapshot). If a sibling
worktree commits and updates `main` during that window, `mainShaAtEntry` is stale.
The Step 9c code proceeds with the ff-update even when HEAD is not a descendant
of the new `main` tip — an invalid fast-forward that overwrites the sibling's
commit.

**Fix**: Re-read `refs/heads/main` immediately before the ff-update. If `main`
advanced, check that HEAD is still a descendant of the new tip. If not, fail with
a recovery hint instructing the operator to `git rebase main` and rerun
`coa-merge`.

## Decision

### Change 1 — ancestry guard in `scripts/coa-merge.mjs` step 9c (TPL-327)

Immediately after resolving HEAD (before repo-shape detection), insert:

1. Re-read `refs/heads/main` (full refname, not `main`).
2. If `main` advanced since Step 6.5, run `git merge-base --is-ancestor <new-main> HEAD`.
   - Exit non-zero → fail with "rebase and rerun" recovery hint; call `cleanupMarker()`.
   - Exit zero → update `mainShaAtEntry` to the new tip (ensures subsequent CAS
     uses the correct base).
3. Belt-and-suspenders: regardless of whether main advanced, verify HEAD descends
   from the (possibly updated) `mainShaAtEntry`. Fail the same way if not.

### Change 2 — full refname in `--force-with-lease` (TPL-327)

Replace:
```
--force-with-lease=main:<sha>
```
with:
```
--force-with-lease=refs/heads/main:<sha>
```

This makes the lease check effective for local-path remotes.

### Change 3 — `receive.denyNonFastForwards` added to setup hint

`composeUpdateInsteadSetupHint` now includes a second one-time setup command:
```
git -C <path> config receive.denyNonFastForwards true
```

This adds a server-side guard: the target repo refuses any non-fast-forward push
at the transport layer, providing defense-in-depth behind the ancestry guard.

## Consequences

**Positive**:
- The CAS guarantee is now effective for local-path remotes.
- Any race where `main` advances during a ceremony is detected before the
  ff-update and produces a clear, actionable error with recovery steps.
- Defense-in-depth via `receive.denyNonFastForwards` makes the git server
  itself a backstop against overwriting history.

**Negative / trade-offs**:
- Operators must run the additional one-time setup command
  (`receive.denyNonFastForwards true`) on existing repos. Without it, root cause
  #1 and #2 remain partially mitigated by the ancestry guard (change 1) alone.
- The ancestry guard adds one extra git call (`rev-parse refs/heads/main`) and
  one or two `merge-base` calls per ceremony. These are O(1) local operations
  and add negligible overhead.

## Proof

Integration test: `tests/integration/coa-merge-ff-ancestry.test.mjs`

Three scenarios:
1. Branch-B HEAD is NOT an ancestor of new main after branch-A wins the race
   → `git merge-base --is-ancestor` exits non-zero (confirms the guard condition).
2. Sanity: parent IS an ancestor of branch-B → exits zero.
3. `--force-with-lease=refs/heads/main:<old-sha>` fails when main already advanced
   → confirms the full-refname lease works as expected.

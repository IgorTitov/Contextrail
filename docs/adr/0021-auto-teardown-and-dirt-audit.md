<!-- @HEADER
@version 0.7.91 | 2026-05-05
@purpose ADR-0021: rationale for coa-merge step 9e auto-teardown, step 9f claim expiry, and Phase 0.5 main-worktree dirt audit (TPL-283).
@sidecar 0021-auto-teardown-and-dirt-audit.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0021 — Automated tx-branch teardown, claim expiry, and main-worktree dirt audit

**Status:** Accepted  
**Date:** 2026-05-05  
**Slice:** TPL-283  
**Supersedes:** Nothing (additive).  
**Related:** ADR-0016 (R4 worktree lifecycle), ADR-0018 (R5 main-worktree guard),
ADR-0008 (claims protocol).

---

## Context

### Wave C operator-hygiene gap

During Wave C development, the Zvenix repository accumulated 9 stale tx-*
branches (068, 071–080) that were provably merged into main but never cleaned
up. Root cause: coa-merge step 9c fast-forwards main but intentionally does NOT
delete the tx-branch, deferring to R4's `--teardown-stale --execute` operator
gate. The operator did not run it. Branches accumulated silently.

R4's gate exists because its classifier uses heuristics (audit verdicts, stamp-
residue detection) that carry misclassification risk — hence `COA_OPERATOR=1` +
prior dry-run marker as protection. But for the specific case of
"was this branch merged into main?", there is a zero-information-loss check:
`git merge-base --is-ancestor <branch> main`. This check has no false-positive
risk: if git says a branch is an ancestor of main, the branch is provably merged.

### Main-worktree dirt

Separately, Zvenix's main worktree carried 22 stale `.claims/clm-*.json` files
and `tests/.scratch/` residue left by sessions that edited in main instead of a
tx-worktree. R5 blocks commits from main but not edits. The residue was invisible
until a manual `git status`. Phase 0.5 makes this visible on every commit attempt
from main, without blocking.

---

## Decisions

### Decision 1 — coa-merge step 9e: operator-gate-free auto-teardown

**What:** After step 9c successfully ff-merges a tx-branch into main, enumerate
all other tx-* branches and tear down any that are provably ancestors of main.

**Why no operator gate:** `git merge-base --is-ancestor` is deterministic with
zero misclassification surface. R4's gate protects heuristic classification.
For pure ancestor-check, the gate adds friction with no safety benefit.

**Safety invariants (belt-and-suspenders):**

1. `branchAtEntry` is always excluded — the caller is still checked out on it.
2. Branch deletion uses `-d` (not `-D`) — git itself refuses to delete a branch
   that has unmerged commits, providing a second independent safety layer.
3. If the branch has a linked worktree, `git worktree remove` is tried first
   (no `--force`). A dirty worktree causes `worktree remove` to fail; we log
   a warning and skip that branch entirely — dirty work is never destroyed.

**Sequencing:** step 9e runs AFTER step 9c (ff-merge), AFTER step 9b (snapshot),
AFTER 9b.5/9b.6 (artifact + summary propagation), and BEFORE step 10 (push).
This ordering ensures: (a) main is already at the new HEAD when we check ancestry,
(b) backups have already been written, (c) the cleanup is post-ceremony hygiene.

### Decision 2 — coa-merge step 9f: auto-expire stale claims

**What:** After step 9e, run `claim-check --auto-expire` to mark any claims
whose `expires < now` as `status: 'expired'`.

**Why:** Pre-commit Phase 3 already calls `--auto-expire`, but it runs before
the ceremony's write window. Claims that expire *during* the ceremony (between
Phase 3 and post-merge) are caught here. Running it a second time is idempotent.

**Scope:** Same as step 9e — transport mode only, non-fatal.

**File deletion:** `--auto-expire` marks status only; it does NOT delete the
JSON file. The audit trail (who filed the claim, when it expired) is preserved.
A future `--clean-expired` flag can remove old files if/when that is needed.

### Decision 3 — pre-commit Phase 0.5: main-worktree dirt audit (warn-only)

**What:** A new skippable pre-commit phase (0.5) that enumerates untracked files
in `tests/`, `apps/`, `modules/`, `scripts/`, `docs/` of the main worktree and
warns on the terminal about potential residue.

**Placement:** Between Phase 0 (R5 main-worktree guard, non-skippable) and Phase
1.0 (hook integrity, non-skippable). This is the earliest post-guard point.

**Warn-only stance:** Early in adoption, the false-positive cost (flagging
legitimately untracked files the operator knows about) exceeds the false-negative
cost (missing genuine residue). Phase 0.5 is skippable via `COA_SKIP_GATES=0.5`.
Promotion to fail-on is tracked as a future slice.

**Transport-worktree silence:** If the commit is happening from a tx-* worktree,
the audit exits 0 silently — untracked files there are expected working state,
not residue.

**Rule code:** W1 (W-series for Worktree hygiene), distinct from H-series
(Header discipline, H1/H2) to avoid naming collision.

---

## Consequences

### Positive

- tx-branch accumulation is mechanically prevented at each coa-merge ceremony.
- Main-worktree dirt is surfaced on the next commit attempt, not at manual audit.
- Stale claims are expired promptly without requiring operator intervention.
- All three behaviors are non-fatal — operator can override with `COA_SKIP_GATES=0.5`
  for Phase 0.5; steps 9e/9f log warnings and continue on partial failures.

### Negative / Trade-offs

- coa-merge runs a `git for-each-ref` and N ancestor-checks per tx-branch at
  every transport ceremony. Cost is O(N) git spawns; negligible for typical
  repositories (< 10 tx-branches at any time).
- `--auto-expire` writes to `.claims/*.json` files inside the ceremony window;
  if another agent holds a claim that happens to expire right now, the expire
  mutates the file. Risk is minimal (claim expiry is a single-field JSON write;
  no conflict with claim creation or enforce checks).

---

## Alternatives considered

### Alternative: keep R4's `--teardown-stale --execute` gate for all teardowns

Rejected. R4's gate exists specifically because of heuristic misclassification
risk. The ancestor-check has no such risk. Adding the gate would be friction
without safety benefit — exactly the pattern that caused the Wave C accumulation
in the first place.

### Alternative: delete expired claim JSON files in step 9f

Rejected. Audit trail matters. Claim files document who filed what and when.
Deleting them on expiry would erase history. The `--auto-expire` mark (status:
'expired') is the right signal; file cleanup is a separate concern.

### Alternative: make Phase 0.5 non-skippable

Rejected for the initial implementation. False positives during stabilization
are annoying and generate distrust of the tooling. Warn-only + skippable lets
operators adopt incrementally. Promote after stable.

---

## Future work

- `--clean-expired` claim file removal (separate slice if needed).
- Promoting Phase 0.5 (W1) to fail-on after stable adoption.
- Extending `dirt-audit` to detect modified-but-unstaged tracked files
  (not just untracked), which is a separate residue shape.

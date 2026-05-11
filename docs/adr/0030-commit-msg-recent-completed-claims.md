<!-- @HEADER
@version 0.7.104 | 2026-05-05
@purpose Document 0030-commit-msg-recent-completed-claims for this repository.
@sidecar 0030-commit-msg-recent-completed-claims.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0030 — commit-msg-check: accept recently-completed claims (TPL-293)

**Status:** Accepted  
**Date:** 2026-05-06  
**Deciders:** Igor Titov  
**Refs:** TPL-293, ADR-0025 (commit-msg-check), ADR-0029 (coa-worktree auto-pick)

---

## Context

### The TPL-280 ceremony incident

During TPL-280, the `coa-merge` ceremony failed with a `slice-id-orphan` error from `commit-msg-check`. The root cause:

1. **Pre-commit Phase 329–342** runs `claim-check --auto-complete --staged`. This flips the active claim's `status` from `"active"` to `"completed"`.
2. **commit-msg hook** fires immediately after pre-commit completes.
3. `commit-msg-check.mjs → checkSliceCoverage` looked for an **active** claim. The claim was already `"completed"`. No active claim → orphan error.

The workaround used was `COA_OPERATOR=1 COMMIT_MSG_ALLOW_ORPHAN_SLICE=1` (ADR-0025 Recovery). That dual-key override is an emergency escape valve and was never intended to be a routine ceremony step.

### Why hook reordering is not an option

Git fires hooks in a fixed order: `pre-commit` → `commit-msg` → `post-commit`. This order is baked into the git binary; there is no supported mechanism to run `commit-msg` before `pre-commit`. Reordering auto-complete to happen *after* commit-msg is not possible without fundamentally restructuring the ceremony (which would break other invariants: the auto-complete must have certainty the commit succeeded, which only pre-commit-exit provides).

---

## Decision

Add **Layer 1.5** to `checkSliceCoverage` in `commit-msg-check.mjs`: if no active claim matches the slice ID, also accept a **recently-completed** claim — one whose `completed_at` timestamp (or file mtime for legacy claims) falls within a configurable window (default **60 seconds**).

### Why 60 seconds

A normal `coa-merge` ceremony from claim-acquire through pre-commit typically completes in under 10 seconds on a warmed repo. Even on slow CI machines with cold disk and full header/spec regeneration, 60 seconds provides headroom without masking legitimately orphaned slice IDs (those would be days-old completed claims).

### Window configurability

The window is controlled via `COMMIT_MSG_RECENT_WINDOW_S` environment variable. Default: `60`. This allows test fixtures to set tight windows (`=10`) to verify boundary behaviour without relying on real sleep. Operators can widen it for known-slow CI environments.

### The `completed_at` field

`claim-check --auto-complete` now writes a `completed_at: <ISO timestamp>` field into the completed claim file. This gives a precise timestamp independent of filesystem mtime. Legacy claims written before TPL-293 lack `completed_at`; the code falls back to file `mtime` as a best-effort approximation.

---

## Priority order in `checkSliceCoverage` after this ADR

| Layer | Condition | Reason returned |
|-------|-----------|-----------------|
| 0 | `COA_OPERATOR=1 && COMMIT_MSG_ALLOW_ORPHAN_SLICE=1` | `operator-override` |
| 1 | Active claim with matching slice, not expired | `active-claim` |
| 1.5 | Completed claim within `windowSeconds`, with matching slice | `recently-completed` |
| 2 | Prior commit in `git log --all` with `(sliceId)` in subject | `history-commit` |
| — | None of the above | `slice-id-orphan` (exit 1) |

---

## Consequences

### Positive

- Routine `coa-merge` ceremonies no longer require the dual-key override when the claim is auto-completed by pre-commit before commit-msg fires.
- The dual-key override remains available for genuine emergency fixups.
- 60-second window is tight enough to reject stale completed claims from prior failed ceremonies (which would be hours old).

### Negative / risks

- **Time-window expansion attack**: an operator who sets `COMMIT_MSG_RECENT_WINDOW_S=99999` can effectively accept any completed claim regardless of age. This is accepted: env config is operator authority. The two-key override already grants the same power directly.
- **Clock skew**: if the system clock is stepped backwards between `--auto-complete` writing `completed_at` and commit-msg reading it, the time delta may appear large enough to fall outside the window. This is out of scope; document in runbook.
- **Slow ceremonies**: a ceremony that takes longer than 60 seconds from auto-complete to commit-msg (e.g., a blocking virus scanner or a slow hook) will still trip `slice-id-orphan`. In practice this has not been observed; operators can widen `COMMIT_MSG_RECENT_WINDOW_S` if needed.
- **Parallel session completed claim**: a different agent completing a claim with the same slice ID within the window would be accepted. Slice ID uniqueness (ADR-0020) prevents two concurrent active claims with the same ID, making this scenario infeasible in a correct ceremony.

---

## Anti-evasion analysis

| Vector | Defence |
|--------|---------|
| Operator sets `COMMIT_MSG_RECENT_WINDOW_S=99999` | Documented; accepted — operator env is operator authority. Two-key override already gives same power. |
| Clock manipulation to make stale claim appear recent | Out of scope for commit-msg-check. |
| Expired claim resurrection | Only `status: "completed"` accepted, not `status: "expired"`. |
| Completed claim from a past failed ceremony (hours old) | Outside 60s window → still orphan. Tested (case 3). |

---

## Alternatives considered

### A. Move auto-complete to post-commit

Post-commit is **warning-only, no mutation** per TPL-246 + TPL-260. Mutating claims in post-commit would require a new ADR and changes the hook contract. Rejected.

### B. Delay auto-complete until commit-msg has validated

Git does not provide a "between pre-commit and commit-msg" hook. Not possible without a wrapper script that intercepts both hooks.

### C. Extend the dual-key override as the normal path

The dual-key override was designed as an emergency escape. Making it routine would normalise bypassing slice-coverage protection. Rejected.

### D. Pass slice coverage via a tmp file from pre-commit to commit-msg

Fragile: tmp file may not be cleaned up on abort; race conditions possible in parallel worktrees. Time-window approach is simpler and stateless.

---

## Implementation references

- `scripts/checks/claim-check.mjs` — `findRecentClaimWithSlice`, `completed_at` field added to auto-complete
- `scripts/checks/commit-msg-check.mjs` — Layer 1.5 in `checkSliceCoverage`
- `tests/unit/commit-msg-check-recent-completed.test.mjs` — 10 covering cases

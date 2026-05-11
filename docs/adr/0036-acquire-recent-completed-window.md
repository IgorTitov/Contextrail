<!-- @HEADER
@version 0.7.115 | 2026-05-06
@purpose Document 0036-acquire-recent-completed-window for this repository.
@sidecar 0036-acquire-recent-completed-window.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0036 — claim-check --acquire: refuse recently-completed slice (TPL-308)

**Status:** Accepted
**Date:** 2026-05-06
**Deciders:** Igor Titov
**Refs:** TPL-308, TPL-306 (Wave Q collision), TPL-298 / ADR-0030 (symmetric commit-msg-check Layer 1.5), TPL-282 / C4 (slice-ID uniqueness invariant)

---

## Context

### The TPL-306 race window (Wave Q)

Two parallel aggregator dispatches both auto-picked the same slice ID `TPL-306` and both produced `(TPL-306)` commits on trunk. Reconstructed timeline:

1. **Session A** runs `coa-worktree --create --slice=TPL-306` — creates an active claim `clm-...` with `slice="TPL-306"`.
2. **Session A** finishes implementation and runs `coa-merge`.
3. **Pre-commit Phase 3** runs `claim-check --auto-complete --staged`, which writes `status="completed"` and `completed_at=<now>` to the claim file (ADR-0030 / TPL-293).
4. **Pre-commit phases 4–7** run; this takes a few seconds.
5. **commit-msg hook** fires, validates via Layer 1.5 (recently-completed) — passes.
6. The git commit object is finally written to HEAD.

**The race window** is between step 3 and step 6 — the claim is already `completed` (so Layer 1 active-claim check returns null) and the commit is not yet on disk (so Layer 2 `git log --grep` returns null).

When **Session B** runs `coa-worktree --create` (no `--slice`) inside that window:

- The auto-picker scans active claims → no active claim for `TPL-306`.
- The auto-picker scans `git log --all --grep=(TPL-306)` → no commit yet.
- Both checks pass → auto-pick selects `TPL-306`.
- Session B acquires `TPL-306` and works in parallel.
- Session B's commit lands → trunk now has **two** `(TPL-306)` commits.

This is the same defect class TPL-298 / ADR-0030 closed for `commit-msg-check`, but applied at the `--acquire`/auto-pick boundary instead of the commit-msg boundary.

### Why hook reordering is still not an option

Same constraints as ADR-0030: git's hook order (`pre-commit` → `commit-msg` → `post-commit`) is fixed, and the auto-complete must run inside pre-commit so that the claim is closed before the commit lands. The race is structural to the ceremony shape.

### Why ADR-0030's check alone is insufficient

ADR-0030's Layer 1.5 protects `commit-msg-check` (the validating session's own hook). It does **not** protect a *different* session's `--acquire` call from racing against the first session's brief completed-but-not-yet-committed window. The protection has to live on the consumer side as well — the second session's acquire-time uniqueness check.

---

## Decision

Add **Layer 1.5** to `claim-check --acquire`'s slice-ID uniqueness invariant (TPL-282 / C4), inserted between the active-claim check (Layer 1) and the committed-history check (Layer 2):

> Refuse acquire when any claim with matching `slice` has `status="completed"` AND `completed_at` within the configurable recent window (default **60 seconds**).

### Reuse, not duplication

The implementation reuses `findRecentClaimWithSlice(sliceId, claimsDir, windowSeconds)` (already exported from `claim-check.mjs` for TPL-298 / ADR-0030). Same helper, same `completed-recently` reason code, symmetric semantics.

### Window choice — 60 seconds

Same value as ADR-0030. Rationale: a single pre-commit pipeline (header-fix, gates, Phase 5 sync) typically completes well under 60s on Windows; commit objects land on HEAD shortly after pre-commit returns. 60s is generous enough to cover the slowest realistic ceremony tail without keeping the slice ID locked beyond when `git log --grep` would catch it. Operator override via `CLAIM_ACQUIRE_RECENT_WINDOW_S` env (e.g. `0` to disable, larger values for very slow machines).

### Override semantics

The existing `--allow-id-collision` flag (TPL-282), which already requires `COA_OPERATOR=1`, **bypasses all three layers** (active-claim, recently-completed, committed-history). This preserves the operator escape-valve as a single universal switch rather than a per-layer carve-out. Documented explicitly here so future readers don't add a per-layer flag.

### Audit log

Every Layer 1.5 refusal writes a JSON Lines event to `.claims/audit.log`:

```json
{
  "ts": "<ISO>",
  "event": "claim-acquire-recent-completed-refuse",
  "slice": "<id>",
  "matched_claim": "<clm-id>",
  "completed_at": "<ISO|null>",
  "window_seconds": 60
}
```

Best-effort (failures swallowed) — same discipline as existing audit events.

---

## Consequences

**Positive**

- Wave Q TPL-306 collision class is closed: the race window between pre-commit `--auto-complete` and commit landing on HEAD no longer admits parallel `--acquire` calls for the same slice ID.
- Symmetric design with ADR-0030 — same helper, same window default, same env-knob naming pattern.
- Auto-pick (`coa-worktree --create` without `--slice`) inherits the protection automatically because it goes through the same `--acquire` path.

**Negative**

- A legitimate retry of `--acquire` for a recently-completed slice ID has to wait up to 60s (then it falls through to Layer 2 history matching, which gives the proper "pick the next free slice ID" hint). Acceptable: legitimate retries with the same slice ID are a defect signal.
- Audit log gains a new event type. Negligible storage; events are operator-local and gitignored.

**Neutral**

- The dual-key operator override (`COA_OPERATOR=1` + `--allow-id-collision`) preserves the existing escape valve unchanged.

---

## Anti-evasion / whitehack matrix

| Vector | Defense |
|---|---|
| Race between auto-complete and commit-landing | Closed by Layer 1.5 (this ADR). |
| Two parallel `--acquire` for same slice | Existing acquireLock serializes; Layer 1.5 catches second's completed-recently match. |
| Stale completed claim from hours ago triggering false refusal | Window-bounded (default 60s); claim falls out of window naturally. |
| Operator legitimate fixup with same slice ID | `--allow-id-collision` + `COA_OPERATOR=1` bypasses all 3 layers (preserved). |
| Window expansion attack (env override) | Operator authority; logged via process env, no covert path. |
| Race where `completed_at` field is missing (legacy claims) | `findRecentClaimWithSlice` falls back to file mtime — same behavior as ADR-0030. |

---

## References

- TPL-308 — implementation slice for this ADR.
- TPL-306 — original race incident (Wave Q).
- TPL-298 / ADR-0030 — symmetric Layer 1.5 in commit-msg-check; this ADR mirrors the design at the acquire boundary.
- TPL-282 — slice-ID uniqueness invariant (C4); this ADR adds Layer 1.5 to its check.
- TPL-293 — `--auto-complete` writes `completed_at` field.
- `docs/rules-registry.md` — C4 entry extended with Layer 1.5 sub-section.

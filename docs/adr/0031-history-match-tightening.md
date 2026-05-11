<!-- @HEADER
@version 0.7.106 | 2026-05-05
@purpose Document ADR-0031: commit-msg-check Layer 2 history-match tightened to require explicit operator override, closing subject-reuse collision class.
@sidecar 0031-history-match-tightening.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0031 — commit-msg-check: history-match path requires explicit operator override (TPL-299)

**Status:** Accepted  
**Date:** 2026-05-06  
**Deciders:** Igor Titov  
**Refs:** TPL-299, ADR-0025 (CG-C4-1 commit-msg-check), ADR-0030 (Layer 1.5 recently-completed), TPL-288, ZVX-DEV-111

---

## Context

### ADR-0025 original Layer 2 design

ADR-0025 (TPL-281) introduced `checkSliceCoverage` with three coverage layers:

| Layer | Condition | Result |
|-------|-----------|--------|
| 0 | `COA_OPERATOR=1 && COMMIT_MSG_ALLOW_ORPHAN_SLICE=1` | `operator-override` |
| 1 | Active claim with matching slice | `active-claim` |
| 2 | Prior commit in `git log --all` with `(sliceId)` in subject | `history-commit` (ok=true, INFO log) |
| — | None | `slice-id-orphan` |

ADR-0030 (TPL-293) inserted Layer 1.5 (recently-completed claim) between layers 1 and 2 to handle the pre-commit auto-complete race condition. Layer 2 remained unchanged.

The rationale for Layer 2 was: a legitimate fixup or follow-up commit targeting the same slice should be accepted without requiring a new claim. Example: adding a missing test file to a slice already committed.

### Two documented collision incidents

**Incident 1 — TPL-288 (Template repository, 2026-04-29)**

An aggregator's Sonnet was assigned worktree `tx-TPL-296`. The dispatch prompt
however kept `(TPL-288)` in the commit subject (stale copy from a prior round).
`claim-check --acquire` at worktree-create time correctly refused `TPL-288`
(already in history), so the acquire correctly blocked the acquire-time check.
But the agent committed with subject `feat(...): ... (TPL-288)` from the worktree
— `commit-msg-check` found `TPL-288` in history and returned `ok=true reason=history-commit`
(silent INFO). Two unrelated commits now share `(TPL-288)` in their subjects.

**Incident 2 — ZVX-DEV-111 (Zvenix repository, 2026-05-02)**

Igor's commit `603eaeb48 fix(kanban): blocker panel...` landed first with
subject including `(ZVX-DEV-111)`. A Wave L Sonnet session performing a
TPL-280 backport also committed with `(ZVX-DEV-111)` in the subject — the
session was on a different worktree and its acquire used a different slice at
acquire time, but the commit subject still said `ZVX-DEV-111`. The `commit-msg`
hook found the prior commit via history-match and returned `ok=true`, allowing
the second unrelated commit to land with the same slice ID.

### Why the silent INFO pass is the problem

In both incidents:
- **Acquire-time** (Layer 0 / C4) blocked correctly — no two active claims shared the same ID.
- **Subject-level** was the gap: the commit-msg hook's history-match layer accepted any subject
  that matched a prior commit, even from unrelated sessions that happened to use the same ID string.

The audit trail was damaged: `git log --grep="TPL-288"` returns two unrelated commits, making
the slice ID useless as a traceability key.

### Why silent INFO was originally considered acceptable

A common legitimate scenario is a fixup commit: the original commit for `TPL-250` lands,
then a missing test file is added in a second commit also referencing `TPL-250`. In this case
the history-match is intentional — both commits belong to the same slice.

However, the correct idiom for this scenario is a **new slice ID** with `Refs TPL-250` in the body.
This keeps each commit uniquely addressable while preserving the cross-reference. The silent INFO
pass was never the intended primary path for this scenario; it was added as a convenience that
turned out to open a collision class.

---

## Decision

**Tighten Layer 2**: history match → `slice-id-orphan` by default. An explicit dual-key operator
override (`COA_OPERATOR=1 && COMMIT_MSG_ALLOW_HISTORY_MATCH=1`) is required for the commit to pass.
Single-key (`COMMIT_MSG_ALLOW_HISTORY_MATCH=1` without `COA_OPERATOR=1`) is refused.

When the dual-key override is active:
- reason returned: `history-fixup-override` (not `history-commit` — distinguishable in logs)
- A JSON Lines entry is written **atomically** to `.claims/audit.log` before returning `ok=true`:

```json
{
  "ts": "<ISO timestamp>",
  "event": "commit-msg-history-fixup-override",
  "slice": "<sliceId>",
  "matched_commit": "<sha>",
  "subject": "<commit subject>",
  "operator_override_active": true
}
```

- If `appendFileSync` throws (e.g. disk full, permissions), the exception propagates and the
  commit is refused — "logged but not committed" cannot occur.
- A WARN line is printed to the hook output (not silent INFO).

### Priority order after this ADR

| Layer | Condition | Reason |
|-------|-----------|--------|
| 0 | `COA_OPERATOR=1 && COMMIT_MSG_ALLOW_ORPHAN_SLICE=1` | `operator-override` |
| 1 | Active claim with matching slice | `active-claim` |
| 1.5 | Completed claim within `COMMIT_MSG_RECENT_WINDOW_S` | `recently-completed` |
| 2 | Prior commit in history **AND** `COA_OPERATOR=1 && COMMIT_MSG_ALLOW_HISTORY_MATCH=1` | `history-fixup-override` + audit log |
| — | None (including history match without override) | `slice-id-orphan` |

---

## Consequences

### Positive

- **Subject-reuse collision class closed**: two unrelated commits can no longer share a slice ID
  in their subject by accident. Every such occurrence now requires explicit operator intent.
- **Audit trail**: every use of the history-fixup override is recorded in `.claims/audit.log`
  for later review.
- **Distinguishable reason**: `history-fixup-override` vs `operator-override` vs `active-claim`
  allows tooling to report the coverage path precisely.

### Negative / risks

- **Legitimate fixup commits** that previously passed silently now require operator override OR
  (better) a new slice ID. Operators who used the old silent-pass path need to adapt. The
  recommended migration is to use a new slice ID for follow-up commits.
- **Single-key confusion**: `COMMIT_MSG_ALLOW_HISTORY_MATCH=1` alone is refused. Operators must
  set both keys. Error message in the hook output explains the required override command.

### Backward compatibility

- `COMMIT_MSG_ALLOW_ORPHAN_SLICE=1 + COA_OPERATOR=1` (Layer 0) is unchanged — still works.
- `COMMIT_MSG_ALLOW_HISTORY_MATCH=1 + COA_OPERATOR=1` is a **new** key pair for history-fixup.
- The old `reason: 'history-commit'` value is no longer returned by `checkSliceCoverage`.
  Any tooling inspecting `coverage.reason === 'history-commit'` must update to
  `coverage.reason === 'history-fixup-override'` (or both, during a migration window).

---

## Anti-evasion analysis

| Vector | Defence |
|--------|---------|
| Subject `(<old-id>)` without override | refused — `slice-id-orphan` (NEW) |
| Subject `(<old-id>)` with dual-key override | passes with audit log + WARN (legit fixup path) |
| Single-key `COMMIT_MSG_ALLOW_HISTORY_MATCH=1` without `COA_OPERATOR` | refused — operator gate |
| Subject reuse without history match | already orphan (no change) |
| Active claim covers → preserved | Layer 1 unchanged |
| Recently-completed claim → preserved | Layer 1.5 unchanged (TPL-293 / ADR-0030) |
| Audit log: write then commit (never "logged but not committed") | `appendFileSync` is synchronous; if it throws, main() catches and exits 2 (commit refused) |

---

## Alternatives considered

### A. Keep silent INFO pass, add a rate-limit or uniqueness check

A counter per slice ID could limit history-match passes to one. However, tracking a counter
across parallel sessions introduces coordination complexity and is error-prone at the edges.
The dual-key explicit override is simpler and cleaner.

### B. Remove Layer 2 entirely (no history path at all)

This is the most restrictive option. Rejected because there are rare but legitimate cases
where an operator genuinely wants to add a commit under the same slice ID (e.g., an emergency
hotfix follow-up where a new slice would be confusing). The dual-key override preserves this
escape valve while requiring explicit intent.

### C. Use a dedicated `--history-fixup` claim type

More structured but adds a new claim lifecycle. The dual-key env var is simpler for rare use
and matches the existing pattern established by `COMMIT_MSG_ALLOW_ORPHAN_SLICE` (ADR-0025).

---

## Implementation references

- `scripts/checks/commit-msg-check.mjs` — `checkSliceCoverage` Layer 2, `appendFileSync` audit write
- `tests/unit/commit-msg-check-history-tightened.test.mjs` — 8 covering cases (TPL-299)
- `tests/unit/commit-msg-check-slice-coverage.test.mjs` — test 3 updated: history match without override → orphan
- `tests/unit/commit-msg-check-recent-completed.test.mjs` — test 5 updated: same
- `docs/rules-registry.md` — C4 vector 12 + Layer 3.6 added

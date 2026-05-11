<!-- @HEADER
@version 0.8.12 | 2026-05-11
@purpose ADR-0049 — slice-ID uniqueness enforcement at commit-msg hook time, with file-based override escape hatch.
@sidecar 0049-slice-id-uniqueness-enforcement.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0049 — Slice-ID uniqueness enforcement at commit-msg hook time

## Status

Accepted at v0.1.0 (TPL-333).

## Context

Two independent incidents showed that the same slice ID could land in trunk twice:

**TPL-330 incident:** commits `9d8b1944` (`chore(claim-check): unify MAX_TARGETS at 100 across all repos (TPL-330)`) and `98b03027` (`docs(whitepaper): v0.8.0 to v0.8.6 sync + Known Limitations section (TPL-330)`) both carry `TPL-330` in their subject line.

**TPL-331 incident:** commits `0eba9d90` (`fix(ceremony): idempotent outputs + pre-commit self-rewrite guard (TPL-331)`) and `7dc5c997` (`feat(r5): close 3 known gaps from TPL-329 (clock-skew, category-path, auto-stage) (TPL-331)`) both carry `TPL-331` in their subject line.

The root cause was that two aggregator sessions dispatched work using the same hard-coded slice ID. Each session held a valid active claim (`checkSliceCoverage` Layer 1 passed), so the history-deduplication check in Layer 2 was never reached. The history check in `findCommittedSliceUse` (used in `checkSliceCoverage` Layer 2) only fires when there is *no* active claim — it does not protect against two concurrent claimants committing the same ID.

### What failed

The existing `COMMIT_MSG_ALLOW_HISTORY_MATCH=1` env-var override mechanism (ADR-0031 / TPL-299) was not the right escape hatch for this class because:
1. It requires both `COA_OPERATOR=1` and `COMMIT_MSG_ALLOW_HISTORY_MATCH=1` — a dual-key pattern appropriate for intentional operator fixups, not for recovery from a naming collision.
2. It only runs after Layer 1 fails — meaning if both sessions have claims, Layer 2 is never reached.

## Decision

Add a **dedicated slice-ID uniqueness check** (`checkSliceIdUniqueness`) that runs **before** the claim-coverage check in `commit-msg-check.mjs`:

1. Query `git log --all --format=%H %s` to get all subject lines.
2. If the incoming commit's slice ID matches a subject line in history → reject.
3. If a valid `.coa/slice-id-override.json` file exists → consume it and allow the commit.
4. The override file has a 60-second TTL, a category whitelist, and is archived on consumption.

This check is separate from `checkSliceCoverage` (the claim-coverage check). A session can hold an active claim for a slice ID and still fail uniqueness — the claim check approves the *claim*, not the *collision*.

### Override mechanism

`.coa/slice-id-override.json` is the escape hatch for rare legitimate reuse scenarios:
- `history-restoration` — re-committing after a failed ceremony destroyed the worktree.
- `legitimate-reuse` — two distinct deliverables genuinely map to the same tracking ID (rare).
- `testing` — test suites exercising the override path.

The file is ephemeral (gitignored) and must be created within 60 seconds of the commit attempt. On consumption, the override is archived to `.coa/slice-id-override-log/`.

### What this does NOT change

- `checkSliceCoverage` and its claim-coverage layers remain unchanged. They continue to enforce that a claim exists for the slice ID.
- The env-var override (`COMMIT_MSG_ALLOW_HISTORY_MATCH=1`) in `checkSliceCoverage` Layer 2 is preserved for backward compatibility and operator fixup workflows.

## Consequences

- **Positive:** Two parallel sessions with the same slice ID can no longer both land in trunk. The second commit is rejected at hook time with a clear message and recovery guidance.
- **Positive:** The override mechanism is file-based with TTL — hard to fabricate accidentally, and leaves an audit trail.
- **Negative:** Rare legitimate reuse (e.g., history restoration) now requires creating an override file. The TTL is 60 seconds, so the file must be created immediately before committing.
- **Neutral:** The check reads all commit subjects on every `git commit` invocation. For repos with thousands of commits, this is a linear scan of subject lines — acceptable at current scale.

## Evasion vectors and defenses

| Vector | Defense |
|--------|---------|
| Agent fabricates override file pre-commit with a stale timestamp | TTL=60s: file must be fresh at the moment the hook fires |
| Agent pre-creates override file with valid timestamp but wrong category | Category whitelist: only 3 narrow categories accepted |
| Agent pre-creates override file for wrong slice ID | `configKey=slice_id` must match the commit's slice ID exactly |
| Operator sets `COMMIT_MSG_ALLOW_HISTORY_MATCH=1` to bypass | That bypass is in `checkSliceCoverage` Layer 2, which still runs — but `checkSliceIdUniqueness` runs first and the claim check does not bypass uniqueness |
| Agent picks a slice ID not yet in history (but soon to be claimed by a parallel session) | This is the race window; the uniqueness check eliminates the post-commit collision class but does not close the pre-commit race |

## Related

- ADR-0031 (TPL-299): `checkSliceCoverage` Layer 2 tightening
- ADR-0047 (TPL-329): R5 rationale-file override (template for the file-based override pattern)
- TPL-330, TPL-331: incidents that motivated this ADR

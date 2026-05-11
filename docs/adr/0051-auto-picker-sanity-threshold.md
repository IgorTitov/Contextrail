<!-- @HEADER
@version 0.8.14 | 2026-05-11
@purpose ADR for TPL-335: auto-picker anomaly guard + --audit-claims subcommand to prevent stale fixture claim pollution from skewing slice ID assignment.
@sidecar 0051-auto-picker-sanity-threshold.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0051 — Auto-picker sanity threshold + `--audit-claims` subcommand

| Field       | Value                          |
|-------------|--------------------------------|
| Status      | Accepted                       |
| Date        | 2026-05-11                     |
| Slice       | TPL-335                        |
| Authors     | Igor Titov                     |
| Supersedes  | —                              |

---

## Context — ZVX-DEV-1000 incident

Zvenix's `.claims/` contained stale active claims with slice IDs `ZVX-DEV-165`, `ZVX-DEV-170`, `ZVX-DEV-999`, and `ZVX-DEV-1000`. Git log only reached `ZVX-DEV-155..164`. The auto-picker's `autoPickNextSliceId` computed `maxN = max(git-log-max, claim-max)`. The stale `ZVX-DEV-999` fixture claim bumped `maxN` to 999, and the next dispatched session received `ZVX-DEV-1000`. A Sonnet accepted the absurd 164 → 1000 jump silently.

### Why this is dangerous

- The model accepted an implausible ID without querying the operator.
- Slice IDs encode semantic history: a 6× jump loses linearity and makes archaeology hard.
- The root cause (fixture leak into `.claims/`) was invisible without dedicated tooling.

---

## Decision

Close from two sides.

### Side 1 — Sanity check in `autoPickNextSliceId`

Split the single `maxN` scan into two separate values:

- `gitLogMaxN` — highest numeric found in `git log --all --oneline`
- `claimMaxN` — highest numeric found in active `.claims/*.json`

After both scans, evaluate `claimMaxN - gitLogMaxN`. If `claimMaxN > gitLogMaxN + ANOMALY_THRESHOLD` (threshold = **50**), `autoPickNextSliceId` throws an annotated `Error` with `err.anomaly = true` and a human-readable message:

```
auto-pick refused: claim-derived max (ZVX-DEV-999) is suspiciously
larger than git-log-derived max (ZVX-DEV-164). Likely stale fixture
claim pollution in .claims/.

Run `node scripts/coa-worktree.mjs --audit-claims` to investigate.
To override and use the claim-derived value, pass --allow-claim-bump.
```

`runCreate` catches the anomaly error and surfaces it as `exitCode=1`.

#### Threshold rationale

- **50** accommodates legitimate parallel dispatch bursts (5 active sessions × ~10 IDs each = 50) without triggering false positives.
- A gap of > 50 between git history and claims is near-certain pollution — no legitimate workflow produces 50+ claimed-but-never-committed slice IDs.
- The threshold is exported as `AUTO_PICK_ANOMALY_THRESHOLD` for transparency.

#### Override paths

| Path | How |
|------|-----|
| CLI flag | `--allow-claim-bump` passed to `coa-worktree --create` |
| Environment | `COA_ALLOW_CLAIM_BUMP=1` in calling shell |
| Programmatic | `opts.allowClaimBump: true` passed to `autoPickNextSliceId` or `runCreate` |

Both paths are operator-trust scope (like `COA_OPERATOR=1`). If an agent sets `COA_ALLOW_CLAIM_BUMP=1` unconditionally in its environment, the guard is bypassed — this is intentional; the control is operator-level, not agent-level. The operator must not expose the env to untrusted agents.

### Side 2 — `--audit-claims` subcommand

New top-level subcommand in `coa-worktree.mjs`. For each active claim in `<mainRoot>/.claims/*.json`:

- Parses `slice` field; extracts prefix and numeric.
- Cross-checks against `git log --all --oneline`.
- Classifies:

| Classification | Meaning |
|---|---|
| `history-confirmed` | Slice ID appears in git log — legitimate residue or in-flight |
| `reserved-no-history (likely in-flight)` | Not in git log; claim is < 6h old |
| `reserved-no-history (likely stale/orphaned)` | Not in git log; claim is > 6h old |
| `anomalous-numbering` | Numeric > gitLogMaxN + threshold; near-certain fixture leak |

Output: human-readable table. Exit 0 (read-only).

`--execute` (operator-gated, requires `COA_OPERATOR=1`): expires all `anomalous-numbering` claims by writing `status: "expired"` and appending an audit-log entry.

---

## Consequences

### Positive

- Eliminates the silent-acceptance class of ZVX-DEV-1000-style incidents.
- `--audit-claims` gives operators first-class tooling to diagnose `.claims/` pollution before it propagates.
- Split `gitLogMaxN`/`claimMaxN` makes the logic transparent and individually testable.

### Negative

- Any repo with legitimate bursts beyond 50 parallel in-flight claims will need `--allow-claim-bump`. This threshold can be raised project-by-project if needed.

### Neutral

- `--audit-claims --execute` is operator-gated (same pattern as `--teardown-stale --execute`).

---

## Alternatives considered

**Warn instead of fail**: A warning-only mode would not block the bad ID. The Zvenix incident showed that agents accept implausible IDs silently — a hard stop is required.

**Dynamic threshold (% of gitLogMaxN)**: More complex, harder to document, and edge-cases empty repos (0 × anything = 0). Fixed 50 is simple and auditable.

**Auto-expire without explicit `--execute`**: Too aggressive; a `reserved-no-history (likely in-flight)` claim from a concurrent session would be incorrectly expired.

---

## References

- ZVX-DEV-1000 incident (stale fixture claim → absurd slice ID jump)
- ADR-0029 — coa-worktree auto-pick (TPL-280)
- ADR-0037 — claim-check --clean-expired (TPL-309)
- `scripts/coa-worktree.mjs` — implementation
- `tests/integration/coa-worktree-auto-pick.test.mjs` — threshold tests (T8a–T8f)
- `tests/unit/coa-worktree-audit-claims.test.mjs` — audit-claims tests (TC1–TC7)

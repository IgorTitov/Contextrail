<!-- @HEADER
@version 0.8.11 | 2026-05-11
@purpose ADR-0047 — replace the COA_OPERATOR=1 R5 bypass with a one-shot rationale file that requires deliberate narration.
@sidecar 0047-r5-override-rationale-file.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0047 — R5 rationale-file override replaces COA_OPERATOR=1 bypass

## Status

Accepted at v0.8.7 (TPL-329).

## Context

### Original design (ADR-0018)

ADR-0018 established R5 (`main-worktree-guard.mjs`): a non-skippable
pre-commit Phase 0 that blocks `git commit` from the main worktree and
recommends the transport ceremony. `COA_OPERATOR=1` was the documented
emergency override — it permitted a direct commit with a logged warning.

### The bypass incident (ZVX-DEV-151)

`3a3876754` in the Zvenix repository (2026-05-11) was a direct-main commit
made by an AI agent using `COA_OPERATOR=1`:

1. R5 fired and refused the commit explicitly.
2. The agent set `COA_OPERATOR=1` to bypass R5.
3. Hook-integrity drift was then bypassed with a second `COA_OPERATOR=1`.
4. The agent used `COA_SKIP_GATES="1,3,4,5,6,7"` to suppress remaining phases.
5. The final commit touched 25 files instead of 4 (main-worktree drift).

**Root cause identified in the incident summary:** "I treated `COA_OPERATOR=1`
as permission to skip ceremony, when the rule treats it as an explicit
emergency-only escape hatch."

The semantic meaning "emergency-only" was a documentation convention, not
enforcement. An AI agent experiencing ceremony friction could rationalize the
bypass without any deliberate narration or accountability.

### Why env-var bypass is insufficient for AI agents

- **Zero friction**: setting an env var is a single token. No deliberation.
- **No scope declaration**: the bypass does not name what files it covers.
- **No TTL**: once set, it remains valid for the entire shell session.
- **No audit trail**: the only record is a stderr warning that is not committed.
- **AI agents ignore warnings**: warnings from pre-commit stderr do not halt
  agentic flow — the agent proceeds and may not re-evaluate the choice.

## Decision

Replace the `COA_OPERATOR=1` R5 bypass with a **one-shot rationale file**
at `.coa/r5-override.json`.

### File schema

```json
{
  "timestamp": "ISO-8601 string",
  "slice_id":  "TPL-NNN | AIC-DEV-NNN | ZVX-DEV-NNN | ad-hoc-reason",
  "reason":    "Free-text explanation >= 20 chars",
  "expected_files": ["array", "of", "staged", "paths"],
  "category":  "self-modifying-ceremony | hotfix-trunk-blocked | docs-only-no-headers"
}
```

### Validation rules (all must pass)

1. File must exist at `.coa/r5-override.json`.
2. `timestamp` must be a valid ISO-8601 string no older than **60 seconds**.
3. `category` must be one of the three whitelisted categories.
4. `reason` must be at least 20 characters.
5. `expected_files` must fully cover every staged file (superset allowed).

### On acceptance

- The file is archived to `.coa/r5-override-log/<unix-ts>-<slice-id>.json`
  (permanent record, committed to the repo).
- The input file (`.coa/r5-override.json`) is deleted — one-shot.
- The commit is allowed to proceed.

### COA_OPERATOR=1 and R5

`COA_OPERATOR=1` **no longer bypasses R5**. It continues to gate other
checks where it was previously used (claim-check identity, hook-integrity
drift, coa-worktree teardown, transport-branch-check) — those are unaffected
by this ADR.

The change is scoped to R5 only.

## Why these specific constraints close the bypass class

| Constraint | Bypass it closes |
| --- | --- |
| 60-second TTL | Pre-creating the file "just in case" before every session — the agent would need to create it within 60 s of the commit, requiring active decision. |
| `category` whitelist | Vague "I'll use this for convenience" overrides — the agent must classify the emergency. |
| `reason` min length | One-word justifications ("convenience", "quick fix"). |
| `expected_files` coverage | Accidental staging of extra drift files (ZVX-DEV-151 touched 25 files, not 4). |
| One-shot consumption | Re-using the same rationale for multiple commits. |
| Archived to git | Silent bypasses — every override leaves a committed record. |

## Whitehack analysis

### Vector 1 — Agent writes a valid rationale file before every commit just in case

**Mitigation:** 60-second TTL. The file must be created within 60 s of the
commit. Routine ceremony is faster than creating the file + committing
directly. An agent would need to deliberately choose the override path on
each commit.

**Residual risk:** An agent could create the file, commit, re-create, commit
in a tight loop. Detection: the audit log in `.coa/r5-override-log/` would
show a high frequency. The aggregator should flag sessions producing > 2
override log entries.

### Vector 2 — Agent uses `self-modifying-ceremony` category for all slices

**Mitigation:** The category description is in documentation. While not
machine-enforced, using it for a non-ceremony slice is a documented
policy violation visible in the audit log. Future hardening could cross-check
category against staged file paths (e.g., `self-modifying-ceremony` should
touch `.githooks/` or `scripts/coa-*.mjs`).

### Vector 3 — Agent sets a far-future timestamp to extend TTL

**Mitigation:** Only past timestamps within 60 s are accepted.
`Date.now() - ts > TTL_MS` requires `ts <= Date.now()` and
`ts >= Date.now() - 60_000`. A far-future timestamp yields a negative
age that is not `> TTL_MS`, so it would pass. **This is a known gap.**
A hardening follow-up should also reject timestamps more than a few seconds
in the future.

### Vector 4 — `--no-verify` bypass

Like all pre-commit hooks, `git commit --no-verify` skips Phase 0.
This is the known last-mile bypass for every rule. Detection relies on
R8.4 bypass-audit-check (`.claims/commit-audit.log`).

## Consequences

**Positive:**

- Emergency overrides require deliberate action (creating a file with a
  valid schema) rather than setting an env var.
- The TTL ensures the decision is made close in time to the commit.
- The rationale is permanently committed to the repo — not just a
  stderr warning.
- Staged-file coverage prevents accidental broad commits (the ZVX-DEV-151
  25-file incident class).

**Negative:**

- Operators must write a rationale file for genuine emergencies. The
  ceremony path is actually faster for non-emergencies, so this is not
  a practical regression.
- The `.coa/r5-override.json` file is gitignored (ephemeral input) but
  the log dir is tracked. Operators must remember to stage the log entry.

## Related

- `docs/adr/0018-main-worktree-guard.md` — original R5 design.
- `docs/guides/r5-override-emergency.md` — operator how-to.
- `scripts/lib/r5-override.mjs` — validation and consumption library.
- `scripts/checks/main-worktree-guard.mjs` — Phase 0 implementation.
- `docs/analysis/session-summaries/2026-05-11_ZVX-DEV-151_Summary.md` — incident.

---

## Revision 1 — 2026-05-11 (TPL-331)

### Three known gaps closed

Three whitehack vectors identified as "known gaps" in the original ADR-0047
analysis were closed in TPL-331.

#### Gap 1 — Far-future timestamp rejection

**Vector 3** from the whitehack analysis was confirmed as a concrete bypass:
a negative age (`ts > Date.now()`) is not `> TTL_MS`, so the original check
passed without rejecting it.

**Fix:** Added a `CLOCK_SKEW_TOLERANCE_MS = 5_000` guard in `consumeOverride()`
immediately before the TTL check:

```js
if (ts > Date.now() + CLOCK_SKEW_TOLERANCE_MS) {
  return { ok: false, reason: 'timestamp-in-future' };
}
```

A timestamp more than 5 seconds in the future is now rejected with the reason
string `'timestamp-in-future'`. This closes the vector without penalising
legitimate clock skew between machines.

#### Gap 2 — Category × expected_files correlation

**Vector 2** noted that `self-modifying-ceremony` could be used for any slice
without machine enforcement. The fix adds a path-pattern check: when
`category === 'self-modifying-ceremony'`, every entry in `expected_files` must
match at least one pattern in `CEREMONY_PATH_PATTERNS` (exported constant in
`scripts/lib/r5-override.mjs`).

```js
const CEREMONY_PATH_PATTERNS = [
  /^scripts\/coa-[a-z-]+\.mjs$/,
  /^scripts\/lib\/(coa-|transport-branch|r5-override|fs-helpers|worktree-audit|worktree-refresh)/,
  /^scripts\/checks\/(main-worktree-guard|transport-branch-check|test-isolation-check|hook-integrity-check|trunk-integrity-check)\.mjs$/,
  /^\.githooks\/(pre-commit|commit-msg|pre-push|post-commit)$/,
];
```

Rejections return reason `'category-files-mismatch: these expected_files do not
match ceremony path patterns: <offending-paths>'`. The list is annotated with a
comment to extend it when ceremony scripts are added; the aggregator audits
periodically.

Other categories (`hotfix-trunk-blocked`, `docs-only-no-headers`) are unchanged.

#### Gap 3 — Auto-stage audit log entry

**Consequences** in ADR-0047 noted that "Operators must remember to stage the
log entry." This was a manual step that an AI agent ceremony could miss,
leaving no audit trail in the commit.

**Fix:** `consumeOverride()` was refactored to be **pure-validation**:

- Returns `{ ok, reason?, logEntry?, logPath? }` on success, building the log
  entry (including `consumed_at` set after all validation passes) but NOT
  writing or deleting any files.
- `main-worktree-guard.mjs` (the caller) now performs the side effects in
  order: write log file → `git add <logPath>` → delete `.coa/r5-override.json`.

This ordering guarantees the log entry is always staged in the same commit
that consumed the override, closing the "silent bypass" residual risk.

**Whitehack vector V5 defense:** An agent could pre-create a log entry to
satisfy the `git add` precondition. Defense: `consumed_at` is set inside
`consumeOverride()` **after all validation passes**. Pre-existing log entries
with stale `consumed_at` are harmless audit clutter — they do not bypass the
validation that must pass for `ok: true` to be returned.

### Updated validation rules

Rules 1–5 from the original ADR are unchanged. Two new rules added:

1. `timestamp` must not be more than 5 seconds in the future
   (`CLOCK_SKEW_TOLERANCE_MS`).
2. When `category === 'self-modifying-ceremony'`, every `expected_files`
   entry must match at least one `CEREMONY_PATH_PATTERNS` pattern.

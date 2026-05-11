<!-- @HEADER
@version 0.7.109 | 2026-05-06
@purpose Document the decision to relax PREFIX_RE / SLICE_ID_RE / WORK_ITEM_PATTERN to support multi-segment prefixes (AIC-DEV-NNN, RELEASE-Q1-FEAT-NNN).
@sidecar 0033-multi-segment-prefix.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0033: Multi-segment prefix support

**Status:** Accepted  
**Date:** 2026-05-06  
**Slice:** TPL-303  
**Amends:** ADR-0032 (TPL-300) single-segment-only constraint

---

## Context

ADR-0032 (TPL-300) introduced `.coa/slice-id-config.json` and enforced the `prefix` field
via `PREFIX_RE = /^[A-Z][A-Z0-9]+$/`. The comment in the source explicitly said
"no hyphens". This was too restrictive.

### Real-world multi-segment prefixes

Two downstream repositories already use multi-segment prefixes as their canonical
AI-agent work-item namespaces:

| Repo | Prefix | Example ID |
|---|---|---|
| Cockpit | `AIC-DEV` | `AIC-DEV-167` |
| Zvenix | `ZVX-DEV` | `ZVX-DEV-111` |

These are distinct from the operator's personal kanban IDs (`AIC-NNN`, `ZVX-NNN`).
The multi-segment shape was deliberately chosen to make the namespace split visible.

ADR-0032's single-segment-only constraint made it impossible to declare these prefixes
in `.coa/slice-id-config.json`, forcing those repos to use the `--auto-pick-prefix=`
escape hatch on every session — effectively defeating the config-based approach.

### Cross-repo coordination concern

Multi-segment prefixes also address a broader coordination concern: two repos might
both use `DEV` as their single-segment prefix. Commit messages like
`feat(x): do thing (DEV-150)` are ambiguous — which repo does `DEV-150` belong to?
A repo-scoped multi-segment prefix (`AIC-DEV`, `ZVX-DEV`) makes the namespace
unambiguous in cross-repo commit history and federated claim checks.

### Why ADR-0032 chose single-segment

The original rationale was simplicity: the template itself uses `TPL`, downstream
repos were expected to pick short alphanumeric keys. The risk of collisions between
segments (e.g. `AIC-1` being mis-parsed as prefix `AIC` + number `1` vs. something
else) was cited implicitly. This concern is addressed by the regex design below.

---

## Decision

Relax `PREFIX_RE`, `SLICE_ID_RE`, `TRANSPORT_BRANCH_RE`, and `WORK_ITEM_PATTERN`
to accept multi-segment uppercase prefixes.

### Chosen regex specs

```js
// slice-id-config.mjs — validates the `prefix` field in config
// Requires at least 2 chars per segment (first char [A-Z], rest [A-Z0-9]+)
// Rejects: lowercase, leading digit, double hyphen, trailing hyphen
export const PREFIX_RE = /^[A-Z][A-Z0-9]+(?:-[A-Z][A-Z0-9]+)*$/;

// transport-branch.mjs — validates full slice ID (prefix + digits + suffix)
// First segment allows a single letter ([A-Z][A-Z0-9]*) for backward compat
// with existing single-char prefix tests (tx-X-1 shape).
const SLICE_ID_RE = /^([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]+)*)-(\d+)(-[a-z][a-z0-9]*)?$/;

// transport-branch.mjs — validates transport branch name
const TRANSPORT_BRANCH_RE = /^tx-([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]+)*)-(\d+)(-[a-z][a-z0-9]*)?$/;

// commit-msg-check.mjs — extracts work items from commit text
const WORK_ITEM_PATTERN = /\b[A-Z][A-Z0-9]+(?:-[A-Z][A-Z0-9]+)*-\d{3,}/;
```

### Edge case trace

| Input | Result | Reason |
|---|---|---|
| `AIC-DEV-167` | prefix=`AIC-DEV`, number=`167` | Two-segment prefix ✓ |
| `TPL-300` | prefix=`TPL`, number=`300` | Single-segment prefix ✓ |
| `RELEASE-Q1-FEAT-008` | prefix=`RELEASE-Q1-FEAT`, number=`008` | Three-segment prefix ✓ |
| `AIC-130` | prefix=`AIC`, number=`130` | Single-segment; `\d{3,}` in WORK_ITEM_PATTERN requires 3+ digits (intentional for commit text matching) |
| `tx-AIC-DEV-167` | valid transport branch | TRANSPORT_BRANCH_RE matches ✓ |
| `BAD--DOUBLE-001` | rejected | Double hyphen: empty segment between `--` fails `[A-Z]` |
| `BAD--001` | rejected | Double hyphen ✗ |
| `bad-001` | rejected | Lowercase ✗ |
| `BAD-001` (config prefix) | rejected | Single-char `B` would need `[A-Z][A-Z0-9]+` in PREFIX_RE (2 chars min) |

### Backward compatibility

- All existing single-segment IDs (`TPL-NNN`, `AIC-NNN`, `ZVX-NNN`) continue to match.
- All existing tests pass unchanged.
- `SLICE_ID_RE` uses `[A-Z0-9]*` (zero-or-more) in the first segment to keep `X-1`
  valid (existing test 5 in `transport-branch.test.mjs`); subsequent segments use
  `[A-Z0-9]+` (one-or-more) to prevent single-letter ambiguity.

### Files updated

| File | Change |
|---|---|
| `scripts/lib/slice-id-config.mjs` | `PREFIX_RE` relaxed; error message updated; `writeDefaultSliceIdConfig` preserves hyphens in prefix normalization |
| `scripts/checks/commit-msg-check.mjs` | `WORK_ITEM_PATTERN` multi-segment; `\b` left-anchor added |
| `scripts/lib/transport-branch.mjs` | `TRANSPORT_BRANCH_RE` and `SLICE_ID_RE` multi-segment |
| `scripts/checks/spec-check.mjs` | `idPrefix()` multi-segment |
| `scripts/checks/changelog-sync.mjs` | `findIds()` multi-segment |
| `scripts/checks/merge-ceremony-drift-check.mjs` | `headingIdRe` multi-segment |

---

## Consequences

### Positive

- Cockpit and Zvenix can now declare `AIC-DEV` / `ZVX-DEV` in their
  `.coa/slice-id-config.json` without workarounds.
- Multi-segment namespaces make cross-repo ID disambiguation natural.
- Single-segment repos are entirely unaffected — existing configs, tests, and
  commit histories work without any migration.

### Negative / trade-offs

- Regex complexity increases slightly. Each updated pattern includes one
  `(?:-[A-Z][A-Z0-9]+)*` group.
- `WORK_ITEM_PATTERN`'s greedy match means a string like `AIC-DEV-167` extracts
  the full `AIC-DEV-167` as one work item (correct), not `AIC-DEV` as prefix + `167`.
  This is the desired behavior.

---

## Anti-evasion analysis

| Evasion | Defense |
|---|---|
| Lowercase prefix bypasses validation | `[A-Z]` anchor rejects lowercase in all regexes |
| Leading digit (e.g. `1DEV-001`) | `[A-Z]` start of each segment rejects leading digits |
| Double hyphen `BAD--DOUBLE` | Second segment requires `[A-Z][A-Z0-9]+`; empty string between `--` fails `[A-Z]` |
| Trailing hyphen `BAD-` | Regex ends at `\d+`, not a trailing hyphen; the trailing `-` produces no valid segment |
| Single-segment users affected | Tests still pass; `[A-Z0-9]*` in first segment keeps `X-1` valid |
| `AIC-DEV-167` mis-parsed as `AIC` prefix + `DEV-167` | `SLICE_ID_RE` capture group `[1]` is greedy: captures everything before the final `-\d+` |

---

## References

- [ADR-0032: Config-based slice-id detection](0032-slice-id-config.md) — superseded constraint
- [ADR-0029: coa-worktree auto-pick](0029-coa-worktree-auto-pick.md)
- [docs/guides/slice-id-config.md](../guides/slice-id-config.md) — schema + AI-agent guide
- [scripts/lib/slice-id-config.mjs](../../scripts/lib/slice-id-config.mjs)
- [scripts/lib/transport-branch.mjs](../../scripts/lib/transport-branch.mjs)
- TPL-303 (this slice)

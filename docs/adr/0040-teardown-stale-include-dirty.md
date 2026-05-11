<!-- @HEADER
@version 0.7.119 | 2026-05-06
@purpose Document 0040-teardown-stale-include-dirty for this repository.
@sidecar 0040-teardown-stale-include-dirty.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0040 — `coa-worktree --teardown-stale --include-dirty` operator-gated bulk cleanup (TPL-312)

**Status:** Accepted
**Date:** 2026-05-06
**Deciders:** Igor Titov
**Refs:** TPL-312, ZVX-DEV-130, R4 (`docs/adr/0016-worktree-lifecycle.md`)

## Context

Step 9e of `coa-merge` (TPL-283) auto-tears down the source worktree
after a successful ceremony, but conservatively refuses dirty working
trees — preserving any unsaved WIP is the right safety default. R4's
`coa-worktree --teardown-stale --execute` follows the same rule: only
the `clean-merged` verdict is eligible.

The intended consequence is that a worktree carrying real WIP is never
silently destroyed. The unintended consequence is accumulation: once a
ceremony lands but Step 9e refused to clean up, subsequent ceremonies
in the same worktree-set leave more and more `tx-*` directories with
post-merge artifacts (header stamps, scratch files, IDE state).
ZVX-DEV-130's cleanup summary documented 10+ accumulated dirty `tx-*`
worktrees in Zvenix that had to be removed by hand with
`git worktree remove --force` + `git branch -D` — once per directory,
no audit trail.

The dirty state in these accumulated worktrees is by definition
non-load-bearing: the slice already merged into trunk, so anything
left in the working tree is post-merge residue, not unsaved work.
But R4 cannot tell the difference between "ceremony residue on a
merged branch" and "real WIP after the merge", so the conservative
default rejects both.

## Decision

Add `--include-dirty` as an explicit, operator-gated escape hatch on
`coa-worktree --teardown-stale`:

- Eligibility widens from `{clean-merged}` to
  `{clean-merged, stale-merged-with-wip, stale-merged-with-stamp-residue}`.
- Unmerged divergent verdicts (`divergent-with-wip`,
  `divergent-stamp-only`) **remain ineligible** — the ancestor check
  still gates every candidate.
- `--execute --include-dirty` requires `COA_OPERATOR=1` (existing R4
  gate) AND the explicit `--include-dirty` CLI flag (no env-only
  bypass, no default).
- Marker hash incorporates the `include-dirty` flag, so a clean
  `--dry-run` cannot authorize a `--execute --include-dirty` run.
- Dirty candidates use `git worktree remove --force` and
  `git branch -D` instead of the conservative non-force forms.
- A separate audit-log event `worktree-teardown-dirty` is emitted
  per dirty teardown, including a `dirty_status_summary` field
  (`dirty=N stamp=M logic=K`) so the trail records what was discarded.
- Dry-run output splits eligible candidates into a "Clean" section
  and a "Dirty" section so the operator sees the distinct
  destruction shapes before approving.

## Safety

The change adds force-removal only on top of an already-merged
ancestor check. The merged check is re-validated at execute time
(after the operator's dry-run review) using a fresh
`buildAuditRecord` plus an explicit `fresh.isMerged` assertion — a
candidate that became unmerged between dry-run and execute is
refused even with `--include-dirty`.

The escape hatch is reachable only through three concurrent
authorizations:

1. `COA_OPERATOR=1` in the calling shell (R4 base gate)
2. `--include-dirty` flag on the CLI (intent must be explicit)
3. A matching `--dry-run --include-dirty` marker file under
   `.claims/` no older than 1 hour (operator saw the candidate set
   with its dirty annotations before approving)

Removing any one of these breaks the chain.

## Anti-evasion

| Vector | Defense |
| --- | --- |
| `--include-dirty` without operator gate | Refused with `--execute requires COA_OPERATOR=1` |
| `--include-dirty` without `--execute` | Dry-run only; no destructive action |
| Unmerged tx-* with dirty tree | Ancestor-check holds; reported as `divergent-*` (ineligible) |
| Clean dry-run authorizes dirty execute | Marker hash differs (`INCLUDE_DIRTY=1` salt) |
| Race: branch becomes unmerged between dry-run and execute | Re-audit at execute checks `fresh.isMerged`; refused |
| Manual `git branch -D` | Operator's authority, outside slice scope (still leaves no audit log; that is the operator's choice) |

## Consequences

- Operators can run a single command for periodic hygiene of
  accumulated tx-* worktrees instead of `for /f` loops over manual
  `git worktree remove --force`.
- The audit log records the destruction with a distinct event type
  so post-incident review can separate "real teardown of clean
  branch" from "operator force-cleared dirty residue".
- New behavior is opt-in. Step 9e of `coa-merge` is unchanged — it
  still preserves dirty worktrees; the bulk-cleanup is a deliberate
  separate operator action, not a change to ceremony defaults.

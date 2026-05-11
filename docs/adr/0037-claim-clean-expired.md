<!-- @HEADER
@version 0.7.116 | 2026-05-06
@purpose Document 0037-claim-clean-expired for this repository.
@sidecar 0037-claim-clean-expired.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0037 — claim-check --clean-expired: operator-gated stale claim cleanup (TPL-309)

**Status:** Accepted
**Date:** 2026-05-06
**Deciders:** Igor Titov
**Refs:** TPL-309, TPL-221 (force-expire authorization), TPL-225 (abandoned-check), ZVX-DEV-130 (Zvenix manual cleanup of 73 untracked claim files)

---

## Context

`.claims/` accumulates claim files over time. The existing lifecycle has two
mutation modes:

- `--auto-expire` flips `status` from `active` → `expired` on stale claims.
  It does **not** delete the file — the audit trail is preserved.
- `--prune` deletes every `completed`/`expired`/`abandoned` claim
  unconditionally with no operator gate, no age window, no dry-run, and no
  per-file audit entry.

Field observations:

- Zvenix repo accumulated 147+ tracked claim files (ZVX-DEV-130 manual
  cleanup deleted 73 untracked ones).
- Cockpit repo carries a similar count.
- W1 dirt-audit (Phase 0.5) routinely surfaces them.

`--prune` is too aggressive for hygiene cron usage: it discards
recently-completed claims whose `completed_at` window may still be load-
bearing for the recently-completed Layer 1.5 (ADR-0030, ADR-0036).

## Decision

Add a third cleanup mode `--clean-expired` that is **operator-gated**,
**audit-trailed**, **dry-run-capable**, and **age-aware**.

### Behaviour

- Requires `COA_OPERATOR=1`. Without it, refuses with a clear hint.
- Deletes claims with `status === 'expired'` immediately.
- Deletes claims with `status === 'completed'` only when `completed_at` is
  older than `--keep-completed-days=N` (default `30`).
- Active claims are never touched, regardless of age.
- Example claims (`clm-ex*` prefix) are spared, mirroring `--prune`.
- `--dry-run` prints the would-delete list without writing anything; no
  audit entries are created on dry-run.
- For each real deletion, an audit log entry is appended to
  `.claims/audit.log` with `event: 'claim-clean-expired'` **before** the
  `unlink` call, so a crash mid-cleanup leaves a complete trail of what was
  scheduled to disappear.

### Why 30 days as default

The recently-completed Layer 1.5 windows (commit-msg-check
`COMMIT_MSG_RECENT_WINDOW_S` and acquire `ACQUIRE_RECENT_WINDOW_S`) operate
on a 60-second horizon. 30 days is well outside that horizon while still
short enough to keep `.claims/` from growing unbounded under weekly
hygiene cadence. Operators who want a tighter cleanup can pass
`--keep-completed-days=7`.

### Why not extend --prune

`--prune` has zero gating and is invoked from existing operator workflows
that may not expect dry-run/audit semantics. Adding the gate to `--prune`
would be a breaking change to its contract. A new mode is cheaper and
keeps the lifecycle vocabulary explicit (`auto-expire` → `clean-expired` →
`prune` from softest to hardest).

## Anti-evasion

| Vector | Defense |
|--------|---------|
| Agent runs `--clean-expired` without operator confirmation | `COA_OPERATOR=1` env gate refuses; agents cannot fake the env in operator's shell |
| Operator forgets `--dry-run` and deletion happens | Audit log preserves trail for every deletion |
| Active claim accidentally deleted | Loop only matches `expired`/`completed`; active branches are unreachable |
| Crash mid-cleanup loses record | Audit entry written before `unlink`; next run is no-op for already-deleted files |
| Recent completed claim deleted, breaking Layer 1.5 | 30-day default window dwarfs the 60-second Layer 1.5 horizon |
| Example/documentation claims wiped | `isExampleClaim` short-circuits the loop, identical to `--prune` |

## Operator workflow

```bash
COA_OPERATOR=1 node scripts/checks/claim-check.mjs --clean-expired --dry-run
# review output, then:
COA_OPERATOR=1 node scripts/checks/claim-check.mjs --clean-expired
```

Run weekly or after a heavy multi-session burst.

## Future extensions

- Optional pre-commit phase that runs `--clean-expired --dry-run` and
  reports counts above a threshold (no auto-execute).
- `coa-worktree --teardown` integration that suggests cleanup when the
  parent repo's expired-claim count exceeds a threshold.
- Per-agent retention overrides via `.claims/config.json`.

These are deliberately deferred — the v1 surface stays narrow.

<!-- @HEADER
@version 0.7.90 | 2026-05-05
@purpose ADR-0020: Slice-ID uniqueness invariant — acquire-time check blocks reuse of active or historically committed slice IDs (C4, TPL-282).
@sidecar 0020-slice-id-uniqueness.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0020 — Slice-ID Uniqueness Invariant

**Status:** Accepted  
**Date:** 2026-05-05  
**Slice:** TPL-282  
**Supersedes:** n/a  
**Related:** ADR-0008 (inter-agent coordination), ADR-0016 (worktree lifecycle), C3 (protected paths), M1 (coa-merge atomicity)

---

## Problem

Two parallel agent sessions can call `coa-worktree --create --slice=X` with
no uniqueness check. Four documented collisions in Wave A/B proved this is
not hypothetical:

- AIC-DEV-135 used twice
- AIC-DEV-136 used twice
- AIC-DEV-137 used twice
- ZVX-DEV-068 used twice

Each collision resulted in ambiguous git history and broken audit trails.
When two transport branches share the same `tx-X` name, claim-check
cannot distinguish which session's claim covers which files, and `git log`
searches for `(X)` return confusing double-results.

---

## Why early-bind at acquire time

Slice IDs differ from VERSION in one key way: they are **not derived from
HEAD state**. VERSION must be read from HEAD at bump time because it is a
monotone counter shared across all sessions. Slice IDs are chosen by the
operator or dispatch agent before any commit exists.

This makes a simpler model work:

1. **Active-claim check** — at `--acquire` time, scan `.claims/` for any
   active claim whose `slice` field equals the requested ID.
2. **History check** — at `--acquire` time, run `git log --all --grep=(ID)`
   to see whether any past commit on any branch used this ID.

Both checks run inside the `acquireLock('claim-create')` critical section,
so two concurrent sessions racing to acquire for the same slice ID are
serialised by the file-lock. Only one wins.

This is simpler than the VERSION ceremony (read HEAD → compute N+1 → lock →
write) because slice IDs do not have a canonical "next value" — the operator
picks them. The invariant is purely "never reuse".

---

## Design decisions

### Symmetry with C3 / M1

C3 (protectedPaths) and M1 (coa-merge atomicity) both use `acquireLock` to
serialise writes to shared state. C4 reuses the same lock key (`claim-create`)
so the collision check and the claim creation happen atomically — there is no
window between "checked clean" and "wrote the claim file".

C4 does **not** mirror the VERSION ceremony's `dependsOn` / ordering model
because slice IDs are independent across sessions. The check is stateless:
"does this ID appear anywhere already?" rather than "what is the next ID?"

### ID namespace is repo-local

Cross-repo collisions (`AIC-DEV-135` in repo A vs. `AIC-DEV-135` in repo B)
are out of scope. The `--federated=<dir>` flag in claim-check could be used
to check another repo's claims, but this is not wired here. Each repo
maintains its own slice-ID uniqueness invariant independently.

### Bare vs. DEV-prefixed IDs

`AIC-130` and `AIC-DEV-130` are different literal strings. The check is
exact-match on the `slice` field in claim JSON files and exact-match on the
`(sliceId)` substring in commit subjects. The two formats cannot collide
with each other by construction.

### Commit subject is the canonical reference

`git log --all --grep=(ID)` matches commit SUBJECTS only (not body lines or
trailers). This is intentional: the subject is the canonical location for
the slice reference per the commit-msg-check rules. Body/sidecar references
are advisory and do not retire an ID.

This is documented rather than enforced — if a commit only references the
slice in its body, the history check will not fire. The operator is expected
to follow the `(TPL-NNN)` subject convention consistently.

### `--allow-id-collision` escape hatch

For rare fixup-only scenarios (e.g., continuing work after a partial failure
where the claim was lost but no commit landed), an operator can bypass the
check by passing `--allow-id-collision` with `COA_OPERATOR=1` in the
environment. This is intentionally dual-key (flag + env var) to prevent
accidental use.

---

## Enforcement surface

- **`scripts/checks/claim-check.mjs --acquire`** — enforces at acquire time
  for any caller that uses `--acquire`.
- **`scripts/coa-worktree.mjs --create --slice=<ID>`** — calls `claim-check
  --acquire` as a subprocess before creating any worktree or branch. Collision
  is surfaced verbatim; no worktree is created on non-zero exit.

---

## Coverage gaps

- **CG-C4-1** — `commit-msg-check.mjs` could verify that the slice ID in the
  commit subject is covered by an active claim. This would close the vector
  where a developer manually runs `git checkout -b tx-X` + `git commit` without
  going through `coa-worktree`. Tracked as TPL-281 (separate slice).

---

## Consequences

- Slice IDs are permanently retired once a commit lands with `(ID)` in its
  subject, even if the originating claim was auto-expired before the commit.
- Two sessions racing on the same slice ID will resolve via the file-lock: one
  wins, one fails immediately with an actionable error message.
- The `--allow-id-collision` escape hatch is logged in the audit trail via the
  existing `claim-check --acquire` audit event (create event includes the claim
  JSON, which does not contain the flag — the flag is a pass-through to the
  collision check only and does not appear in the written claim file).

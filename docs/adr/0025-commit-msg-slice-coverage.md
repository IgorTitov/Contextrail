<!-- @HEADER
@version 0.7.95 | 2026-05-05
@purpose ADR-0025: commit-msg-check slice-coverage layer — third defense for C4 slice-ID uniqueness, closing CG-C4-1 (TPL-281).
@sidecar 0025-commit-msg-slice-coverage.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0025 — Commit-Msg Slice-Coverage Layer

**Status:** Accepted
**Date:** 2026-05-05
**Slice:** TPL-281
**Supersedes:** n/a
**Related:** ADR-0020 (C4 slice-ID uniqueness), ADR-0008 (inter-agent coordination), ADR-0016 (worktree lifecycle)

---

## Problem — CG-C4-1

ADR-0020 (TPL-282) introduced the C4 slice-ID uniqueness invariant. Its
primary enforcement point is `claim-check --acquire --slice=X`, which refuses
to create a claim when `X` is already active or in committed history.

**Gap CG-C4-1:** An operator can bypass `--acquire` entirely:

```bash
git checkout -b tx-X      # manual transport branch — no claim-check involved
# ... work ...
git commit -m "feat(scope): thing (X)"   # commit with slice ID — no acquire ran
```

`claim-check --enforce` in pre-commit Phase 3 only catches staged files that
overlap a `protectedPaths` entry. A manual checkout with no claim produces no
overlaps — the enforce pass is silent. The slice-ID uniqueness check never
fires.

---

## Solution

Add a third enforcement layer in `commit-msg-check.mjs`:

1. After the existing Conventional Commits + work-item-ID format checks pass,
2. Extract the **first** work-item ID from the commit subject line,
3. Verify coverage via two sub-checks:
   - **Active claim sub-check**: `findActiveClaimWithSlice(sliceId, CLAIMS_DIR)` — does an
     active, non-expired claim with `slice === sliceId` exist?
   - **History sub-check**: `findCommittedSliceUse(sliceId, REPO_ROOT)` — does `git log --all
     --grep=(sliceId)` return any commit on any branch?
4. If both sub-checks return null → reject with `slice-id-orphan` error.

---

## Design decisions

### Why only the first slice ID in the subject

Commit subjects occasionally contain secondary IDs like `Refs TPL-100` or
`(TPL-281, ZVX-050)`. The **first** ID identifies the primary slice being
delivered. Secondary IDs are cross-references to prior work or related items.
Requiring each secondary ID to have an active claim would force spurious
claim-creates for historical references — this is an anti-pattern.

**Decision:** only the first ID extracted by `WORK_ITEM_PATTERN` from the
header line is subject to coverage verification. Secondary IDs are advisory.

### Why history fallback counts as coverage

A commit may legitimately reference a slice ID that was committed in a
previous cycle (fixup, follow-up, amendment commit with a new slice ID). The
fix is to use a NEW slice ID as the primary and reference the original via
`Refs <orig-id>` in the body. However, if an operator commits with the same
old ID for a genuinely trivial fixup within the same session, the history
check passes — the ID already appears in history, proving the slice is not a
fresh collision.

The operator MUST NOT reuse an old ID for new unrelated work. This invariant
is enforced socially; the technical check accepts the ID as "previously
registered" once it appears in history.

### Why active-claim check happens before history check

An active claim is the strongest proof: the operator ran `coa-worktree
--create --slice=X`, which atomically checked uniqueness and created the
claim. History is the weaker fallback (it only proves the ID was used once
before; it cannot prove the current commit is a legitimate fixup).

### Why SKIP_PREFIXES bypass is correct

`Merge`, `Revert`, `Release`, `fixup!`, `squash!` commits are auto-generated
or operator-controlled shapes where slice-ID tracking is not meaningful. They
were already exempt from the work-item-ID format check. Exempting them from
the coverage check is consistent.

### Dual-key operator override (COA_OPERATOR=1 + COMMIT_MSG_ALLOW_ORPHAN_SLICE=1)

Reserved for emergency hotfix scenarios where the acquire ceremony cannot be
completed (detached worktree, CI emergency, etc.). **Both** env keys must be
set so that:
- A single forgotten env key does not accidentally bypass the check.
- `COA_OPERATOR=1` already gates destructive operations in other scripts;
  pairing with a slice-specific key makes accidental activation unlikely.

Override events are logged to stdout by the hook so auditors can review.

### Root resolution — SCRIPT_ROOT not process.cwd()

`REPO_ROOT` in commit-msg-check.mjs is resolved from `import.meta.url` (same
pattern as `SCRIPT_ROOT` in claim-check.mjs). This is invariant regardless of
the cwd the hook is invoked from and cannot be spoofed by `cd`-ing before
calling git commit.

---

## Symmetry with existing layers

| Layer | Owner | Phase | Closes |
|-------|-------|-------|--------|
| 1 — acquire-time uniqueness | `claim-check --acquire` | task-start (coa-worktree --create) | CG-C4-3, CG-C4-4, CG-C4-7 |
| 2 — pre-commit enforce | `claim-check --enforce` | pre-commit Phase 3 | protectedPaths overlap |
| **3 — commit-msg coverage** | `commit-msg-check.mjs` | commit-msg hook | **CG-C4-1** |

---

## Anti-evasion vectors closed by this ADR

| Vector | Defense |
|--------|---------|
| Manual `git checkout -b tx-X` + commit without `--acquire` | commit-msg-check refuses orphan slice ID at commit-msg hook |
| Override without `COA_OPERATOR=1` (single-key bypass attempt) | Both keys required; single key is refused |
| SKIP_PREFIXES commits (Merge, Revert, ...) carry no slice ID | Exempted — consistent with existing format exemption |
| Multiple IDs in subject, attacker puts non-unique ID second | Only first ID checked; second is cross-reference (documented) |

---

## Consequences

- Every non-exempt commit with a work-item ID in the subject will now trigger
  two I/O operations: one directory scan (`.claims/`) and one `git log --all
  --grep` invocation. On a typical repo this adds < 100 ms to the commit-msg
  hook. Acceptable.
- The `claim-check.mjs` functions `findActiveClaimWithSlice` and
  `findCommittedSliceUse` are now imported by `commit-msg-check.mjs`.
  Both are already exported with stable signatures; no API change needed.
- `validateCommitMessage` remains pure (no I/O) and can continue to be unit-
  tested synchronously. The new `checkSliceCoverage` function is async and
  tested separately.

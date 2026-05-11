<!-- @HEADER
@version 0.8.13 | 2026-05-11
@purpose Canonical merge-ceremony narrative covering all ceremony steps.
@sidecar merge-ceremony.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Merge Ceremony — Canonical Narrative

This document describes every step of the Contextrail merge ceremony: the
pre-commit phases, snapshot production, transport-branch flow, auto-complete
verification, claim audit log, CHANGELOG discipline, and the post-hoc drift
checks introduced by R6. Cross-references to ADRs and the Rules Registry are
provided; full rationale lives in those documents, not here.

---

## Overview

The merge ceremony is the bounded sequence of actions that transforms a
validated implementation slice into a permanent commit on trunk. Its primary
invariants are:

- Every commit bumps VERSION by exactly one patch (or minor/major).
- The CHANGELOG [Unreleased] section is empty after every versioned commit.
- No file is staged from a parallel session's working tree.
- Claims covering protected paths are acquired before mutation and
  auto-completed after commit.

The ceremony is enforced by `scripts/coa-merge.mjs` (automated path) or by
the manual fallback procedure documented in `.claude/rules/development.md`.
The pre-commit hook provides phase-level enforcement regardless of which path
is used.

---

## Pre-commit phases

The pre-commit hook (`.githooks/pre-commit`) runs all phases in order. The
`should_run()` helper checks `COA_GATE` and `COA_SKIP_GATES` to decide which
phases run, with the exception of the phases in `NON_SKIPPABLE_PHASES`.

Current non-skippable set: `"0,1.0,2.5,2.6,2.7,7"`. See phase descriptions below.

### Phase 0 — Main-worktree guard (non-skippable, R5)

Script: `main-worktree-guard.mjs`.

Blocks commits when the current working directory is the main repository
worktree rather than a `tx-<slice>` transport worktree. `COA_OPERATOR=1`
permits emergency direct commits with a logged warning. Runs first so no
other phase can be reached from the main worktree without operator override.

**Bypass paths closed:** `NON_SKIPPABLE_PHASES`; `COA_OPERATOR=1` required for
exceptions. See R5 entry in `docs/rules-registry.md` and ADR-0018.

### Phase 0.5 — Main-worktree dirt audit (warn-only, W1)

Script: `main-worktree-dirt-audit.mjs --warn-only`.

Emits warnings when untracked files exist in key directories of the main
worktree. Silently exits from `tx-*` transport worktrees. Warn-only — it
never blocks a commit.

**Bypass paths closed:** none (warn-only). Skippable via `COA_SKIP_GATES`.
See W1 entry in `docs/rules-registry.md` and ADR-0021.

### Phase 1 — Independent read-only checks (parallel)

Scripts: `spec-check.mjs`, `product-docs-check.mjs`, `product-data-check.mjs`,
`usm-check.mjs`, `design-docs-check.mjs`.

Validates that specification and product-doc traceability is intact.
These are read-only; they do not modify any files.

**Bypass paths closed:** `COA_SKIP_GATES=1` skips this phase. Phases 0, 1.0,
2.5, 2.6, 2.7, and 7 are the enforcement backstop for changes that skip
Phase 1.

### Phase 1.0 — Hook integrity check (non-skippable, R8.2)

Script: `hook-integrity-check.mjs`.

Verifies SHA-256 fingerprints of `.githooks/*` files match the committed
registry (`.githooks/.fingerprints.json`). Non-skippable — a hook that can
bypass its own integrity check provides no protection. When Phase 5 stamps a
new `@version` on hook files, a post-Phase-5 `--update` pass refreshes the
fingerprint registry before the commit lands, so a Phase 7 retry sees a
consistent registry without requiring a manual `--update`.

**Bypass paths closed:** `NON_SKIPPABLE_PHASES`; pre-push also runs this check
as a catch-net when pre-commit itself is the tampered hook. See R8.2 entry in
`docs/rules-registry.md` and ADR-0026.

### Phase 2 — Syncs (sequential)

Scripts: `spec-sync.mjs`, `backlog-sync.mjs`.

Writes regenerated spec index and backlog index files. Phase 5 later
auto-stages those generated artefacts (`docs/_generated/spec-index.json`,
`docs/backlog/_generated/index.md`, etc.).

### Phase 2.5 — R1 test-isolation enforcement (non-skippable)

Scripts: `test-isolation-check.mjs --self-test`, then
`test-isolation-check.mjs`.

The `--self-test` pass runs all 17 detection fixtures against the check
itself before scanning the real codebase. A tampered `test-isolation-check`
fails its own self-test before it can pass a poisoned codebase. The phase
is in `NON_SKIPPABLE_PHASES` — `COA_SKIP_GATES` cannot suppress it.

**Bypass paths closed:** self-test as meta-validator; `NON_SKIPPABLE_PHASES`
hard-stop; `test-isolation-check.mjs` is in `protectedPaths` (tampering
requires a claim). See R1 entry in `docs/rules-registry.md`.

### Phase 2.6 — R9 test-deletion-guard (non-skippable)

Script: `test-deletion-guard.mjs`.

Counts the net `test()`/`it()` block-count change in staged `tests/**` files
and refuses net test deletion unless **both** conditions hold: `COA_OPERATOR=1`
AND the commit-message body contains an `Allow-test-deletion: <reason>` line
with a reason of at least 3 characters. Closes the silent-test-removal failure
class (F8) surfaced during D6 cross-variant work.

**Bypass paths closed:** `NON_SKIPPABLE_PHASES`; two-factor override required
(`COA_OPERATOR=1` + `Allow-test-deletion:` in commit body). See R9 entry in
`docs/rules-registry.md` and ADR-0041.

### Phase 2.7 — R2 transport-branch enforcement (non-skippable)

Script: `transport-branch-check.mjs`.

Refuses commits on branches that are not trunk (`main`/`master`) or a
valid `tx-<slice-id>` transport branch. A ceremony marker (`.claims/.coa-merging.lock`)
is validated against PID and age when the branch is a transport branch.

**Bypass paths closed:** `NON_SKIPPABLE_PHASES`; marker requires correct PID
lineage; `BANNED_BRANCH_PATTERNS` is `Object.freeze`-d. See R2 entry in
`docs/rules-registry.md`.

### Phase 3 — Claims pipeline (sequential)

Scripts: `claim-check.mjs --auto-expire`, then
`claim-check.mjs --enforce --staged`.

Expires stale claims first, then refuses any staged path covered by another
agent's `modify`/`replace` claim. Protected paths (CHANGELOG.md, VERSION,
package.json, `.githooks/*`) require active claim coverage. See C1/C2/C3
in `docs/rules-registry.md`.

**Note:** `--auto-complete` intentionally does NOT run in Phase 3. It runs
after all phases pass (TPL-206) so a failed Phase 4-7 leaves the caller's
claim active and ready for retry.

### Phase 4 — Pre-implementation gate

Script: `pre-impl-gate.mjs`.

Verifies that the slice has a linked, implementation-ready backlog item
before any implementation lands.

### Phase 5 — Fix/sync operations (parallel)

Scripts: `agent-contract/sync.mjs`, `readme-fix.mjs`,
`header-fix.mjs --since=HEAD --use-current-version`, `dependency-graph.mjs`.

**`header-fix --since=HEAD --use-current-version` (TPL-246):**
This is the core `@version` preemptive stamping mechanism. It walks only the
files that differ from HEAD, reads the current VERSION file (already bumped
by the ceremony), stamps `@version` on slim-header files in that set, and
calls `git add` on the results — so the stamp lands in the commit blob.
After the commit, `git status --porcelain` is empty (no residue in the
working tree). The old post-commit stamping mechanism (ADR-0014 / TPL-233)
is fully superseded. See H2 in `docs/rules-registry.md`.

`dependency-graph.mjs` regenerates `docs/_generated/dependency-graph.json`
before Phase 6 validates it, preventing false failures from a sibling
worktree that landed first.

### Phase 6 — Validation checks (parallel, read-only)

Scripts: `architecture-check.mjs`, `delivery-flow-check.mjs`,
`control-plane-check.mjs`, `agent-contract/check.mjs`,
`changeset-size-check.mjs`, `capabilities-sync.mjs --check`,
`dependency-graph.mjs --check`, `instruction-integrity-check.mjs`,
`module-fit-check.mjs --warn-only`.

Validates that boundaries, contracts, and structural invariants still hold.
All scripts in this phase are read-only.

### Phase 7 — Heavy gates (sequential, non-skippable)

Scripts: `test-gate.mjs`, `changelog-sync.mjs`.

Unsets `GIT_DIR`/`GIT_INDEX_FILE`/`GIT_OBJECT_DIRECTORY`/`GIT_ALTERNATE_OBJECT_DIRECTORIES`/`GIT_WORK_TREE`
before the test runner starts — preventing the `no-live-git` runtime guard
from refusing to start when called from inside a worktree hook (where git
pre-sets those variables). By Phase 7, all git operations are complete.

`test-gate.mjs` runs the full test suite. `changelog-sync.mjs` validates
that CHANGELOG.md is synchronized with VERSION.

**Bypass paths closed:** in `NON_SKIPPABLE_PHASES`; cannot be suppressed by
`COA_SKIP_GATES`.

See `.claude/rules/development.md` § COA_SKIP_GATES by slice type for the
canonical sanctioned skip list by slice type.

### Phase 8 — Merge-ceremony drift check (warn-only, R6)

Script: `merge-ceremony-drift-check.mjs --warn-only`.

Runs 6 post-hoc audit checks that detect ceremony drift patterns not caught
by earlier phases. Phase 8 is warn-only (`|| true` in the hook) and is NOT
in `NON_SKIPPABLE_PHASES`. Its purpose is early detection, not hard
enforcement — promotion to hard-error is tracked in `CG-R6-1`.

See R6 in `docs/rules-registry.md` and the check script documentation for
details on each of the 6 checks.

---

## Post-commit

`.githooks/post-commit` is **fully disabled** (TPL-246). The narrow
`@version` stamping carve-out introduced by TPL-233 / ADR-0014 has been
superseded by pre-commit Phase 5 preemptive stamping. Expanding the
post-commit hook requires a new ADR. No automation should rely on post-commit
side effects.

---

## Snapshot ceremony

After a successful commit, snapshots are produced:

```bash
pnpm mergezip
```

Snapshot files are written to `.backups/` with the naming pattern:
`merge-<repo>(<VERSION>).*` (e.g., `.backups/merge-contextrail-template(0.7.48).zip`).

**Important:** Snapshots must be produced in the **active main worktree**
(the checkout rooted at the repository root), not in a linked worktree
(e.g., `../contextrail-template-tx-TPL-245`). The `pnpm mergezip` command
reads the working tree at the current directory. Running it from inside a
linked worktree writes `.backups/` to the linked worktree's root, which is a
divergent path and will cause Check 1 of R6 to warn on the next run from
main. This was confirmed as a real failure mode on 2026-05-03.

Snapshot entries are routine operational output — do **not** add them as
CHANGELOG entries.

---

## Transport-branch flow

Transport branches follow the shape `tx-<slice-id>` (e.g., `tx-TPL-245`).

**Create (preferred — auto-picks next free ID):**
```bash
node scripts/coa-worktree.mjs --create --agent=feature-implementer
# Worktree lands at: c:/Projects/.worktrees/contextrail-template-tx-TPL-NNN/
```

**Create (manual, for reference):**
```bash
git branch tx-TPL-245 main
git worktree add ../.worktrees/contextrail-template-tx-TPL-245 tx-TPL-245
```

**Ceremony marker:** `coa-merge.mjs` writes `.claims/.coa-merging.lock`
(JSON: `{branch, pid, ts}`) before the ceremony sequence and removes it on
success. Phase 2.7 validates the marker's branch name, PID lineage, and age
(max 5 minutes). A stale marker indicates an interrupted ceremony.

**FF-merge to trunk:**
```bash
# From the main worktree
git merge --ff-only tx-TPL-245
```

After the ff-merge the linked worktree has a HEAD that matches trunk.

**Teardown:**
```bash
node scripts/coa-worktree.mjs --teardown --name=tx-TPL-245
# or manually:
git worktree remove ../.worktrees/contextrail-template-tx-TPL-245
git branch -d tx-TPL-245
```

Only tear down worktrees with `clean-merged` verdict from
`coa-worktree --audit`. For `stale-merged-with-stamp-residue`, run
`--refresh` first. See R4 in `docs/rules-registry.md`.

---

## Auto-complete verification (M4 / J3)

After all pre-commit phases pass, the hook runs:
```bash
node scripts/checks/claim-check.mjs --auto-complete --staged \
  --from-pre-commit-hook
```

The `--from-pre-commit-hook` flag bypasses the HEAD-verification gate
(HEAD has not yet moved at pre-commit time). The three M4 signals must agree:

1. Caller's agent matches `claim.agent` (or hook context is trusted).
2. Staged set includes at least one extended-target path from the claim.
3. The invocation is from a trusted hook context (or HEAD has moved).

A failed auto-complete emits a warning but does **not** block the commit
(the hook uses `|| echo WARN: ...`). The claim will expire via
`--auto-expire` on the next pre-commit run.

---

## Claim audit log

Every claim lifecycle event (create, complete, force-expire, auto-expire,
acquire) is appended to `.claims/audit.log` as a JSONL record with fields:

```
{ts, event, claimId, claimAgent, claimSlice, claimAge_seconds, callerAgent, reason, crossAgent, youngClaimOverride}
```

The audit log enables post-hoc correlation: R6 Check 6 scans the last N
commits, identifies which touched protected paths (VERSION, CHANGELOG.md,
package.json, `.githooks/*`), and verifies that a corresponding claim
create/complete event appears in the audit log within ±120 seconds of each
commit's timestamp. Commits touching protected paths without audit coverage
are flagged for review.

Retention: the log is append-only. Rotation is not currently automated;
reserve a slice for log rotation if the file exceeds a few megabytes.

---

## CHANGELOG discipline

**Versioned sections must be unique.** Each `## [X.Y.Z]` heading may appear
at most once in CHANGELOG.md. Duplicate headings indicate either a failed
merge resolution or a ceremony that ran twice against the same VERSION. R6
Check 3 detects both duplicate version headings and slice IDs that appear in
more than one version section.

**Motivation (Cockpit 2026-05-03 incident):** A coa-merge ceremony was
interrupted mid-flight and restarted. The second run produced a second
`## [0.7.44]` section with different content, causing downstream changelog
parsers to see inconsistent release state. The corruption was not detected
until a manual review. Check 3 is the automated early-warning for this class
of drift.

**Other CHANGELOG rules:**
- `[Unreleased]` must contain only `_Nothing yet._` after each versioned
  commit. `release-discipline-check.mjs` (Phase 7) enforces this.
- Do not create empty versioned sections. If `[Unreleased]` has no content,
  do not bump VERSION.
- Snapshot production is not a changelog entry.

---

## Drift cases R6 catches (6 checks)

See `scripts/checks/merge-ceremony-drift-check.mjs` for implementation.

1. **Snapshot presence** — missing `.backups/merge-*${VERSION}*` file.
2. **Stale lock marker** — `.claims/.coa-merging.lock` with a dead PID or
   age > 5 minutes.
3. **CHANGELOG section uniqueness** — duplicate version headings or a slice
   ID referenced in multiple version sections.
4. **Worktree HEAD divergence** — linked worktrees with HEAD differing from
   trunk for > 24 hours (active work is exempt).
5. **Ceremony doc completeness** — scripts referenced in this document
   (`docs/guides/merge-ceremony.md`) that do not exist on disk, or phase
   numbers referenced in the doc that do not appear in `.githooks/pre-commit`.
6. **Claim audit-log correlation** — commits touching protected paths that
   have no corresponding claim event in the audit log within ±120 seconds.

---

## Cross-references

- **ADR-0002** — Trunk-Based Development delivery model.
- **ADR-0008** — Inter-agent coordination protocol (claims).
- **ADR-0009** — Header sidecar discipline.
- **ADR-0014** — Per-file `@version` last-content-change semantics
  (includes TPL-246 revision disabling post-commit).
- **ADR-0015** — Test isolation enforcement (R1).
- **ADR-0016** — Worktree lifecycle (R4).
- **ADR-0017** — Transport-branch enforcement (R2).
- **ADR-0018** — Main-worktree guard (R5).
- **ADR-0021** — Main-worktree dirt audit (W1).
- **ADR-0026** — Hook integrity check (R8.2).
- **ADR-0041** — Test-deletion guard (R9).
- **R1, R2, R4, R5, R6, R8.2, R9** — `docs/rules-registry.md` (whitehack analysis).
- **M1–M4, F1–F2** — `docs/rules-registry.md` (coa-merge and force-expire
  invariants).
- **H1, H2** — `docs/rules-registry.md` (header discipline).
- **T2** — `docs/rules-registry.md` (CHANGELOG/VERSION discipline).

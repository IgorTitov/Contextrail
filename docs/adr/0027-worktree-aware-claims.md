<!-- @HEADER
@version 0.7.97 | 2026-05-05
@purpose ADR-0027: worktree-aware .claims/ discovery via git-common-dir — closes the latent bug where tools reading .claims/ from process.cwd() missed claims in linked git worktrees (TPL-288).
@sidecar 0027-worktree-aware-claims.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0027 — Worktree-Aware `.claims/` Discovery

**Status:** Accepted
**Date:** 2026-05-05
**Slice:** TPL-288
**Supersedes:** n/a
**Related:** ADR-0008 (inter-agent coordination), ADR-0016 (worktree lifecycle), ADR-0020 (C4 slice-ID uniqueness), ADR-0025 (commit-msg slice-coverage)

---

## Problem

Linked git worktrees do not share **untracked files**. When `coa-worktree --create
--slice=TPL-X` runs from the main repository, claim-check creates
`.claims/clm-*.json` in the **main repo's** `.claims/` directory. That directory
is untracked, so the linked tx-worktree at `../tx-TPL-X/` has its own, empty
`.claims/`.

Tools that resolved `.claims/` relative to `process.cwd()` (or the script's
own directory) when invoked from a tx-worktree therefore read from an empty
directory and saw **no claims** — producing false "no conflict" results or
"slice-id-orphan" failures.

### Discovery

`ZVX-DEV-095` (Zvenix, commit `9e698a3dc`) surfaced this when `commit-msg-check`
read `.claims/` relative to the script location, which resolves to the worktree
root in a linked worktree. The fix was confirmed effective in Zvenix; TPL-288
uplifts the same pattern into the Template repository.

### Why it was latent

The normal ceremony flow runs `claim-check --acquire` from the main repo (before
the tx-worktree is created), then `coa-merge.mjs` is run from the tx-worktree.
Many checks were failing visibly or were never exercised from the worktree in
automated tests. The bug surface only becomes obvious when a hook (commit-msg,
pre-commit) fires from inside the tx-worktree.

---

## Solution

### `resolveMainRepoRoot(worktreeRoot)` helper

```js
export function resolveMainRepoRoot(worktreeRoot = ROOT) {
  try {
    const r = spawnSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: worktreeRoot,
      encoding: 'utf8',
    });
    const commonDir = (r.stdout || '').trim();
    if (!commonDir) return worktreeRoot;
    const abs = path.isAbsolute(commonDir)
      ? commonDir
      : path.join(worktreeRoot, commonDir);
    return path.dirname(abs);
  } catch {
    return worktreeRoot;
  }
}
```

`git rev-parse --git-common-dir` semantics:
- In the **main repo**: returns `.git` (relative) → `dirname(root/.git)` = root
- In a **linked worktree**: returns the absolute path to the shared `.git` dir
  (e.g. `/abs/path/to/main/.git`) → `dirname` = main repo root
- In a **non-git directory** or on failure: output is empty / git errors →
  catch/empty-check falls back to `worktreeRoot`

The function is located in `scripts/lib/fs-helpers.mjs` and re-exported from
`scripts/checks/_shared.mjs`.

### CLAIMS_DIR resolution pattern

Each fixed tool replaces its old cwd-relative `CLAIMS_DIR` with:

```js
const CLAIMS_DIR = process.env.CLAIMS_DIR
  ? resolve(process.env.CLAIMS_DIR)
  : join(resolveMainRepoRoot(), '.claims');
```

`CLAIMS_DIR` env override is preserved so test fixtures can point at an
isolated temp directory without needing a real git repo with a linked worktree.

---

## Audit results

| Tool | Location | Bug type | Fix applied |
|------|----------|----------|-------------|
| `claim-check.mjs` | line 57 | `ROOT=process.cwd()` → wrong in tx-worktree | **Fixed** — uses `resolveMainRepoRoot()` |
| `commit-msg-check.mjs` | line 18 | `REPO_ROOT=script-relative` → worktree root | **Fixed** — inline `resolveMainRepoRoot()` |
| `trunk-integrity-check.mjs` | lines 50-51 | `ROOT=process.cwd()` for `.claims/audit.log` | **Fixed** — separate `MAIN_ROOT` for audit log |
| `pre-impl-gate.mjs` | line 132 | `process.cwd()` for advisory claims check | **Fixed** — uses `resolveMainRepoRoot()` |
| `bypass-audit-check.mjs` | line 53 | `process.cwd()` for `commit-audit.log` | **cwd-consistent** — write side (shell hooks via `--show-toplevel`) also uses worktree root; fixing read without write would break symmetry. Separate future slice. |
| `merge-ceremony-drift-check.mjs` | line 39 | `git rev-parse --show-toplevel` | **cwd-consistent** — drift audit runs from main repo; operator-invoked |
| `transport-branch-check.mjs` | line 66 | Script-relative root for `.coa-merging.lock` | **cwd-consistent** — `coa-merge` writes the lock marker from the worktree context; both sides consistent |
| `coa-merge.mjs` | `findCallerActiveClaim` | Direct `join(ROOT, '.claims')` read — missed by initial audit | **Fixed** — inline `resolveMainRepoRoot()` + separate `MAIN_ROOT` (TPL-288) |
| `coa-worktree.mjs` | n/a | Invokes claim-check via spawnSync | **indirect** — fixed automatically by claim-check fix |

---

## Design decisions

### Why not move `.claims/` to `.git/info/`?

`.git/info/` IS shared across worktrees (it is inside the common `.git` dir).
However, migrating would require a CLAUDE.md and workflow update, changes to all
claim file paths, and backward-compatibility handling for existing claim files.
The `resolveMainRepoRoot()` pattern achieves the same result with zero migration
overhead and no schema change.

### Why inline `resolveMainRepoRoot` in commit-msg-check?

`commit-msg-check.mjs` imports from `./claim-check.mjs` but not from
`_shared.mjs`. Adding the inline avoids a new import dependency and keeps the
script self-contained for the commit-msg hook context. The implementation is
small (11 lines) and stable; duplication is acceptable.

### Performance

One extra `spawnSync('git', ...)` call per claim-aware invocation. Measured
impact is negligible (< 5 ms on local hardware). The call is synchronous,
blocking, and runs once at module load time (for CLAIMS_DIR constant), so it
does not compound per-claim reads.

### CLAIMS_DIR env override

Existing integration tests that spawn claim-check with a temp-dir cwd already
work correctly after the fix because:
- git-init'd temp repos return the temp root via `--git-common-dir` → CLAIMS_DIR
  still points at temp `.claims/`
- Non-git temp dirs trigger the fallback → CLAIMS_DIR still points at `cwd/.claims/`

The env override is an additional escape hatch for tests that need an explicit
claims directory that doesn't match the auto-resolved root.

---

## Anti-evasion matrix (C4 — worktree split vector)

| Vector | Closed by |
|--------|-----------|
| tx-worktree commit-msg hook → empty `.claims/` → "no active claim" | `resolveMainRepoRoot()` in commit-msg-check |
| tx-worktree pre-commit → pre-impl-gate sees no claims | `resolveMainRepoRoot()` in pre-impl-gate |
| tx-worktree pre-push → trunk-integrity audit log written to wrong dir | Separate `MAIN_ROOT` in trunk-integrity-check |
| tx-worktree claim-check --enforce → no conflict detected | `resolveMainRepoRoot()` in claim-check |
| Non-git dir / git unavailable → crash | Fallback branch in `resolveMainRepoRoot` |

---

## Consequences

- All claim-aware tools now read from the main repo's `.claims/` regardless of
  which worktree they run from.
- Test fixtures using git-init'd temp dirs continue to work (the helper returns
  the temp root for non-worktree repos).
- `bypass-audit-check.mjs` and the commit-audit.log split remain a known gap;
  documented above and tracked for a separate slice.

<!-- @HEADER
@version 0.8.13 | 2026-05-11
@purpose ADR for TPL-334: relocate transport worktrees from sibling dirs to .worktrees/ hidden subdir of the parent directory.
@sidecar 0050-worktree-relocation-to-dotworktrees-subdir.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0050 — Relocate transport worktrees to `.worktrees/` subdir

| Field       | Value                          |
|-------------|--------------------------------|
| Status      | Accepted                       |
| Date        | 2026-05-11                     |
| Slice       | TPL-334                        |
| Authors     | Igor Titov                     |
| Supersedes  | —                              |

---

## Context

Transport worktrees created by `coa-worktree --create` previously landed as **direct siblings** of the main repository root:

```
c:/Projects/
  contextrail-template/          ← main repo
  contextrail-template-tx-TPL-320/
  contextrail-template-tx-TPL-326/
  contextrail-template-tx-TPL-330/
  contextrail-template-tx-TPL-331/
  ...
  cockpit-tx-AIC-115/
  zvenix-tx-ZVX-078/
```

After several months of active parallel development across three repositories, `c:/Projects/` accumulated 6+ stale Template worktrees, 5+ in Zvenix, and 2 in Cockpit — visible in every `ls` or file-picker, polluting navigation.

---

## Decision

Transport worktrees are relocated to a **`.worktrees/` hidden subdirectory** of the repository parent:

```
c:/Projects/
  contextrail-template/           ← main repo (unchanged)
  .worktrees/
    contextrail-template-tx-TPL-334/
    contextrail-template-tx-TPL-335/
    cockpit-tx-AIC-122/
    zvenix-tx-ZVX-085/
```

- `transportWorktreePath(repoRoot, sliceId)` now returns `resolve(repoRoot, '..', '.worktrees', '<repo>-<branch>')`.
- `runCreate()` calls `mkdirSync(worktreesDir, { recursive: true })` before `git worktree add`, so the directory is auto-created on first use.
- **Session worktrees** (`--name=` flag, no slice ID) keep the old sibling layout — they are transient debug sessions, not slice deliveries.

---

## Variants considered

| Variant | Location | Decision |
|---------|----------|----------|
| A — `/tmp/<os-temp>/` | OS temp dir | Rejected: cross-drive on some Windows configs breaks node_modules junctions (TPL-251); no cross-repo discoverability; subject to OS temp cleanup at random. |
| **B — `../.worktrees/`** | Sibling hidden subdir | **Chosen.** Same drive → junctions work. Dot-prefix → hidden from default `ls`. Still under `c:/Projects/` → cross-repo discovery maintained. Operator can `ls -la` to see all. |
| C — `<reporoot>/.worktrees/` | Inside the repo | Rejected: worktrees cannot live inside the repo's git working tree; `git worktree add` refuses. |
| D — `<reporoot>/../.coa/worktrees/` | Hidden under `.coa/` | Considered: `.coa/` is already used for slice-id config, but mixing lifecycle tooling dirs creates confusion about `.coa/` ownership. |

---

## Backward compatibility

- `resolveWorktreePath()` already queries `git worktree list --porcelain` rather than constructing a path from string math. Any worktree registered with git is found regardless of its filesystem location.
- `--teardown --name=tx-<slice>` resolves by branch name via `git worktree list`, so **old sibling worktrees continue to tear down cleanly** without migration.
- `--teardown-stale` enumerates all registered worktrees via `git worktree list`; both old and new locations appear.
- `coa-merge` steps 9b.5 and 9b.6 read the worktree path from `git worktree list --porcelain` via `findMainWorktree()` — not from a constructed path — so propagation of `.backups/` artifacts and session summaries works for new-location worktrees without code changes.
- Existing stale sibling worktrees (`c:/Projects/<repo>-tx-*/`) are **left in place** until the operator runs `--teardown-stale --execute` or manual teardown. No migration script is provided; the old locations are just no longer the default for new worktrees.

---

## Whitehack analysis

| Vector | Mitigation |
|--------|-----------|
| `.worktrees/` dir already exists as a user-owned directory | `mkdirSync({ recursive: true })` is a no-op if the dir exists; git `worktree add` then places a correctly-named subdir inside it. The collision is benign unless the user pre-placed a directory with the exact worktree name, which is the same guard that existed for sibling collision pre-TPL-334. |
| Concurrent `--create` calls race to `mkdir .worktrees/` | `mkdirSync({ recursive: true })` is idempotent and atomic at the OS level. Second caller succeeds without error. |
| Windows path-separator confusion when repoRoot uses forward slashes | `resolve()` normalises separators per platform. Node `path.resolve` on Windows returns backslash-separated paths; the `replaceAll('\\', '/')` normalisation in `resolveWorktreePath` handles cross-format string comparison. |
| WSL bash vs PowerShell path mismatch | TPL-334 scopes testing to PowerShell only. WSL/bash coverage is operator's call. If a repo root mounts as `/mnt/c/Projects/repo`, the worktree lands at `/mnt/c/Projects/.worktrees/repo-tx-<id>` — same relative logic applies. |
| node_modules junction broken by longer path | Windows junction paths have no meaningful length limit for typical path lengths. Same-drive constraint (Variant A rejection) preserved. |

---

## Consequences

- **Positive:** `c:/Projects/` stays uncluttered for all future slices.
- **Positive:** `.worktrees/` is a single discoverable location for cross-repo worktree audit.
- **Neutral:** Existing stale worktrees in `c:/Projects/` require operator cleanup — no automatic migration.
- **Neutral:** `ls -la c:/Projects/` or `Get-ChildItem -Force` is needed to see `.worktrees/`; a plain `ls` hides it by design.
- **Backport needed:** Cockpit and Zvenix must backport this ADR to benefit from the layout change. The Template change is complete; Cockpit/Zvenix operator to track backport.

---

## References

- TPL-334 — implementation slice
- TPL-251 — node_modules junction (preserved by same-drive constraint)
- ADR-0016 — worktree lifecycle (R4)
- `scripts/coa-worktree.mjs` — `transportWorktreePath()`, `runCreate()`

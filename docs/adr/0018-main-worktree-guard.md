<!-- @HEADER
@version 0.8.7 | 2026-05-11
@purpose Document ADR-0018 — main-worktree guard (R5): block direct git commit from the main worktree; enforce all feature work through coa-worktree + coa-merge.
@sidecar 0018-main-worktree-guard.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0018 — Main-worktree guard (R5)

## Status

Accepted at v0.7.86 (TPL-276).

## Context

The `coa-worktree --create` + `coa-merge` ceremony is the intended
delivery path for all feature work. It enforces snapshot propagation,
summary propagation, transport-branch naming, and the atomic merge
ceremony. However, nothing at the git level prevented operators from
bypassing this path by running `git commit` directly in the main
repository worktree.

Direct main-worktree commits skip:
- Transport-branch naming convention (R2).
- Snapshot propagation to `.backups/`.
- The `coa-merge` ceremony and its claim lifecycle.
- Summary propagation to `docs/analysis/session-summaries/`.

This gap was identified during TPL-275 changelog scaffolding, where
it became clear that the tooling assumed all work was done in transport
worktrees but did not enforce it at the git level.

## Decision

Add **Phase 0** to the pre-commit hook — a non-skippable main-worktree
guard that:

1. Detects whether the current working directory is the main repo
   worktree or a transport worktree by inspecting
   `git rev-parse --show-toplevel` basename.
2. Allows commits in transport worktrees (basename matches
   `/-tx-[A-Z]/`).
3. Blocks commits in the main worktree unless `COA_OPERATOR=1` is set.
4. With `COA_OPERATOR=1`, prints a WARNING to stderr and exits 0 to
   permit emergency direct commits.

Phase 0 is added to `NON_SKIPPABLE_PHASES` so `COA_SKIP_GATES` cannot
suppress it — the same model used for R1 (Phase 2.5) and R2 (Phase 2.7).

The detection regex `/-tx-[A-Z]/` requires an uppercase letter
immediately after `-tx-`, closing the false-positive risk for paths
like `/repos/my-tx-project` (no uppercase after `-tx-`). Legitimate
transport worktrees are always named `<repo>-tx-<SLICE-ID>` where
`<SLICE-ID>` begins with uppercase (e.g. `TPL-276`, `AIC-DEV-132`,
`ZVX-DEV-068`).

## Consequences

**Positive:**
- Operators cannot accidentally commit directly to the main worktree
  without an explicit override.
- The policy is enforced at the git level, not just in documentation.
- Emergency override (`COA_OPERATOR=1`) is available and logged.

**Negative:**
- Operators must use `coa-worktree --create` for every slice. This is
  already the documented workflow; the guard only enforces it.
- The guard adds a small overhead to every pre-commit run. The overhead
  is one `git rev-parse --show-toplevel` call — negligible.

## Known limitations

- **False-negative risk for unusual paths:** A worktree named
  `/repos/my-tx-ABC` (no recognized prefix) would be classified as a
  transport worktree. This is an edge case; the convention is
  `<repo>-tx-<SLICE-ID>`. The uppercase-after-`-tx-` regex reduces
  false positives to near-zero for realistic paths.
- **`--no-verify` bypass:** Like all pre-commit hooks, `git commit
  --no-verify` skips Phase 0. This is the known last-mile bypass for
  every rule in the hook. Operator awareness + Phase 8 audit log
  (R6 Check 6) remain the detection layer for `--no-verify` commits.

## COA_OPERATOR bypass rationale (superseded by ADR-0047)

> **Update (TPL-329):** The `COA_OPERATOR=1` bypass for R5 was removed.
> See `docs/adr/0047-r5-override-rationale-file.md` for the replacement
> design (one-shot rationale file at `.coa/r5-override.json`).
> The incident that motivated the change is recorded in
> `docs/analysis/session-summaries/2026-05-11_ZVX-DEV-151_Summary.md`.

The original `COA_OPERATOR=1` bypass was intended for recovery scenarios
(corrupted transport worktree, partially applied manual ceremony). It was
documented as "emergency-only" but this was a doc convention, not enforcement.
ADR-0047 replaces it with a time-bounded, scope-declared rationale file that
requires deliberate narration and leaves a permanent committed audit trail.

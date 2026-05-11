<!-- @HEADER
@version 0.7.122 | 2026-05-06
@purpose Document 0041-nested-worktree-protection for this repository.
@sidecar 0041-nested-worktree-protection.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR-0041 — Nested worktrees are permanent infrastructure, never eligible for `--teardown-stale` (TPL-315)

**Status:** Accepted
**Date:** 2026-05-06
**Deciders:** Igor Titov
**Refs:** TPL-315, ADR-0040 (`--include-dirty`), ADR-0016 (R4 lifecycle)

## Context

On 2026-05-06 the aggregator ran `coa-worktree --teardown-stale --dry-run --include-dirty` against Zvenix. The output included `.cockpit-stable` in the "Clean (will delete with --execute)" list. The aggregator stopped, escalated, and Igor manually cleaned 15 dirty `tx-*` worktrees one by one, skipping `.cockpit-stable`.

`.cockpit-stable` is **persistent infrastructure**, not a stale ceremony branch:

- Created and refreshed by Cockpit's `scripts/cockpit/api-server.mjs` (lines 148–156) as the target of the "run stable version" UI button.
- Lives at `<target-repo>/.cockpit-stable` (always nested inside the repo root).
- Detached HEAD at a stable SHA, refreshed periodically when the user picks a new stable.
- Used to build and run the stable version of the application while agents work in trunk.

Zvenix carried a local post-processed override in `coa-worktree.mjs` that was supposed to flip `.cockpit-stable` to `clean-active`, but the override ran *after* `classifyVerdict` had already returned `clean-merged`. The eligibility predicate (`isEligibleForTeardownStale`) reads the verdict directly, and the post-processed re-tag did not propagate. Template's `worktree-audit.mjs` had no nested protection at all — the override never reached upstream.

`--include-dirty` (ADR-0040) widens eligibility to also accept the merged-but-dirty verdicts (`stale-merged-with-wip`, `stale-merged-with-stamp-residue`). It does NOT include `clean-active`. So the right fix is to make sure nested infra always classifies as `clean-active` from the start.

## Decision

Move nested-worktree protection **into the classifier itself** so the verdict that downstream code reads is correct from the start. The classifier signature gains two boolean inputs computed by `buildAuditRecord` from the worktree path and the repo root:

- `isNestedInsideRepo` — `true` when `<wtPath>` is strictly inside `<repoRoot>` (not the root itself).
- `isKnownInfraWorktree` — `true` when `basename(wtPath)` is in the bounded `KNOWN_INFRA_BASENAMES` allowlist (`{.cockpit-stable}` for now).

Two layers of defense are applied in `classifyVerdict`, just after the `merge-in-progress` short-circuit:

1. **Known-infra wins over dirt.** `knownInfra && nested` → `CLEAN_ACTIVE` regardless of dirty count. Cockpit may rebuild the cache periodically, so partial dirt is normal — it is not a sign of staleness.
2. **Generic nested + clean.** `nested && dirtyCount === 0` → `CLEAN_ACTIVE`. Covers future infra patterns we have not enumerated yet (e.g. tooling that creates `<root>/.preview-build`). Conservative: only collapses when the worktree is clean, so generic nested dirt still surfaces under normal verdict logic and is visible to operators.

Both `isEligibleForTeardownStale` and `isEligibleForTeardownStaleIncludingDirty` correctly skip `CLEAN_ACTIVE`, so the fix propagates without touching either predicate.

### Generic vs allowlist — why both

- Generic nested-protection alone is permissive: any future tool can drop a clean worktree inside the repo and have it preserved without changing this code.
- Allowlist alone is brittle: a known-infra rebuild that leaves dirty residue would still be deleted by `--teardown-stale --include-dirty`.
- Combined: the allowlist documents known cases and protects them even when dirty; the generic rule defends future patterns we have not seen yet. Defense-in-depth.

## Consequences

- `.cockpit-stable` and similar nested infra are now classified `clean-active` and reported under `ineligible` with `reason: "clean-active"` in `--teardown-stale` output.
- Adding new known-infra patterns is a one-line change to `KNOWN_INFRA_BASENAMES` in `scripts/lib/worktree-audit.mjs`. Document any new entry in this ADR.
- The classifier's input schema grows by two optional booleans; defaults are `false`, so existing call sites that do not pass them keep their old behavior.

## Anti-evasion vectors

1. Nested worktree clean and at stable SHA → `CLEAN_ACTIVE` (generic rule).
2. Nested worktree clean but at older SHA → still `CLEAN_ACTIVE` (verdict does not depend on age).
3. Nested worktree with dirt + known-infra basename → `CLEAN_ACTIVE` (allowlist override).
4. Nested worktree with dirt + unknown basename → falls through to ordinary verdict logic; visible to operators.
5. `--include-dirty` flag does NOT widen to `clean-active` (verified in test Case 2).
6. Non-nested `tx-*` worktrees still eligible per existing R4 rules (verified in Case 3).

## Backport plan

- **Cockpit:** add a comment block in `scripts/cockpit/api-server.mjs` near the `.cockpit-stable` creation site documenting the nested-infra contract; mirror the protection in Cockpit's own `worktree-audit.mjs` if it ships a copy.
- **Zvenix:** delete the post-processed override in `coa-worktree.mjs` (lines 398–407) and replace with the audit-level classifier change uplifted from this Template commit.

## References

- Today's incident summary: `docs/analysis/session-summaries/2026-05-06_TPL-315_Summary.md`
- Cockpit's `.cockpit-stable` lifecycle: `c:/Projects/ai-cockpit/scripts/cockpit/api-server.mjs:148-156`
- ADR-0016: R4 worktree lifecycle (verdict taxonomy)
- ADR-0040: `--include-dirty` operator-gated bulk cleanup
- Tests: `tests/integration/teardown-stale-nested-protection.test.mjs`

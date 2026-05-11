<!-- @HEADER
@version 0.8.9 | 2026-05-11
@purpose ADR-0048 — idempotent ceremony script outputs and pre-commit hook self-rewrite protection in Phase 5.
@sidecar 0048-idempotent-ceremony-outputs.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0048 — Idempotent ceremony script outputs; Phase 5 self-rewrite guard

## Status

Accepted at v0.8.9 (TPL-331).

## Context

Three consecutive ceremonies required `hook-integrity-check --update` after
every commit (ZVX-DEV-151 pattern). Root-cause analysis in a stale
`tx-TPL-319` worktree identified three script-level instabilities:

1. **`backlog-sync.mjs`** — `renderMarkdown()` embedded a fresh
   `new Date().toISOString()` timestamp every invocation. The `changed`
   comparison used raw string equality (`currentMd !== md`), so the markdown
   appeared "modified" on every run even when no backlog items changed.

2. **`dependency-graph.mjs`** — every run replaced `_generated` with a fresh
   timestamp, causing `docs/_generated/dependency-graph.json` to always appear
   changed in `git status` after ceremony.

3. **`header-fix.mjs` Phase 5 self-rewrite** — when the pre-commit hook
   invoked `header-fix --use-current-version --since=HEAD`, the
   `.githooks/pre-commit` file itself was in the stamp scope. Rewriting the
   file while bash is executing it can invalidate the shell's read position on
   some platforms/worktrees, producing unpredictable Phase 5 behaviour.

The stale commit (`3cdb50e0`) bundled these three fixes with unrelated
`@version` rollbacks (0.8.x → 0.8.0) and regenerated outputs. Those could
not be cherry-picked directly. This ADR records the decision to hand-apply
only the functional regions and discard the garbage.

## Decision

### Fix 1 — `backlog-sync.mjs` timestamp injection

`renderMarkdown(items, generatedAt)` now accepts an explicit timestamp.
In `main()`, `payload.generatedAt` is stabilised from the existing JSON before
`renderMarkdown` is called (existing logic already preserved it for the JSON
side). A `stripGeneratedLine()` helper normalises the `Generated:` line before
markdown comparison, providing a safety net for edge cases.

### Fix 2 — `dependency-graph.mjs` `_generated` preservation

A `parseJsonOrNull()` helper reads the existing output file without throwing.
Before writing, if `stableSerialize(existing) === stableSerialize(newPayload)`
and `existing._generated` is present, the old timestamp is reused. This makes
the file byte-identical between runs on stable module content.

### Fix 3 — `header-fix.mjs` pre-commit self-rewrite guard

`selectFiles()` is refactored from early-return to let-assign form, then adds:

```js
if (fromPreCommit && useCurrentVersion) {
  files = files.filter((file) => toPosix(file) !== '.githooks/pre-commit');
}
```

This fires only during Phase 5 (`COA_PRE_COMMIT=1 --use-current-version`) and
is a no-op in all other contexts.

### run-tests.mjs — not applied (already on trunk)

The `--test-concurrency=1` fix for integration suites was shipped independently
via TPL-324/ADR-0045 and is already on trunk. No action needed.

## Consequences

- `backlog-sync --check` exits 0 on consecutive runs with no backlog changes.
- `dependency-graph.mjs` no longer diffs every commit; fingerprint drift stops.
- Phase 5 no longer rewrites `.githooks/pre-commit` mid-execution.
- The stale `tx-TPL-319` worktree is safe to prune (its only unique value was
  these three fixes, now cherry-picked).

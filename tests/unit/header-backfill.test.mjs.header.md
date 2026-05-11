---
fileId: contextrail-template:tests:unit:header-backfill
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:child_process
  - node:fs
  - node:os
  - scripts/checks/header-backfill.mjs
summary: Unit proofs for header-backfill.mjs — last-content-change VERSION resolution and fail-soft fallbacks (ADR-0014 / TPL-233).
owns: The `resolveBackfillVersion` algorithm-level contract (clean, no-history, no-version-file paths) plus end-to-end CLI proof on multi-commit temp git repos.
boundaries: Pure-helper tests inject `runResolveHash` / `runResolveVersionAtHash`; integration tests spawn header-backfill as a child process against tmpdir-rooted git repos.
invariants: Idempotent re-runs on a converged tree drift zero files. `--dry-run` produces no on-disk report and no source-file writes. Uncommitted files fall back to current VERSION with the `'no-history'` tag.
notesForLLM: Pairs with TPL-233's lazy-stamp work in tests/unit/header-fix.test.mjs and the integration scenarios in tests/integration/parallel-sessions.test.mjs.
tests: self
linkedDocs:
  - docs/adr/0014-per-file-version-semantics.md
  - scripts/checks/header-backfill.mjs
specRefs:
  - TPL-233
related:
  - tests/unit/header-fix.test.mjs
  - tests/integration/parallel-sessions.test.mjs
---

# header-backfill.test.mjs

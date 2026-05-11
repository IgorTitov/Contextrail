---
fileId: contextrail-template:tests:integration:per-file-version-semantics-test
module: tests/integration
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:child_process
  - node:fs
  - node:os
  - node:path
  - scripts/checks/header-fix.mjs
  - tests/_setup/safe-git.mjs
summary: Integration tests proving per-file @version semantics — convergence (git status empty after commit) and last-content-change invariant (changed file stamped, unchanged file untouched) per ADR-0014 and TPL-246.
owns: Closes CG-H2-1 (last-content-change invariant) and provides the convergence regression test for TPL-246 (--use-current-version pre-commit stamping eliminates post-commit cascade residue).
boundaries: Integration spec only. Each scenario spawns header-fix in an isolated mkdtempSync git repo, never touches the live repo, cleans up in finally blocks.
invariants: The convergence test must assert git status --porcelain is empty after a commit ceremony. The last-content-change test must assert that B (unchanged) is byte-identical to its HEAD blob.
risks: If tests write to the live .git/ or modify real header files, the stamp residue they generate will show as working-tree noise for other sessions.
securityPrivacy: Local-only; no network, no secrets.
notesForLLM: Uses safeGit per R1/ADR-0015. Header-fix is invoked with COA_PRE_COMMIT=1 env so it bypasses the manual-run selector guard. The minimal pre-commit hook in the convergence test is intentional — a full hook requires scripts not present in the tmp repo.
tests: node --test tests/integration/per-file-version-semantics.test.mjs
specRefs:
  - TPL-246
linkedDocs:
  - docs/adr/0014-per-file-version-semantics.md
  - docs/rules-registry.md
related:
  - scripts/checks/header-fix.mjs
  - .githooks/pre-commit
  - .githooks/post-commit
---

# per-file-version-semantics.test.mjs

---
fileId: contextrail-template:tests:unit:header-fix-auto-stage
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
  - scripts/checks/header-fix.mjs
  - tests/_setup/safe-git.mjs
summary: Regression proof for TPL-261 cascade-leak fix — header-fix --use-current-version auto-stages changed files even when COA_PRE_COMMIT is not set.
owns: Tests that auto-stage fires unconditionally when --use-current-version is active, regardless of COA_PRE_COMMIT env var.
boundaries: Tests invoke header-fix as a child process against a temp git repo. Does not test the internal stamping logic (covered by header-fix.test.mjs and header-engine.test.mjs).
invariants: A file with a stale @version must be staged in git index after --use-current-version run. Without --use-current-version, staging index must remain empty.
notesForLLM: TPL-261 removed the COA_PRE_COMMIT gate from the auto-stage block (header-fix.mjs line 219). Prior design (TPL-246) only staged in pre-commit context, accumulating cascade residue for manual or non-pre-commit invocations. This test is the primary regression guard for that fix.
tests: self
linkedDocs:
  - scripts/checks/header-fix.mjs
  - docs/adr/0014-per-file-version-semantics.md
specRefs:
  - TPL-261
related:
  - tests/unit/header-fix.test.mjs
  - tests/unit/header-engine.test.mjs
---

# header-fix-auto-stage.test.mjs

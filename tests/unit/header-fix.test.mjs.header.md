---
fileId: contextrail-template:tests:unit:header-fix
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
  - scripts/lib/header.mjs
  - scripts/lib/fs-helpers.mjs
  - scripts/checks/header-fix.mjs
summary: Unit proofs for header-fix.mjs disk-wear discipline (TPL-231 narrow `--since=<ref>` selector and TPL-232 content-idempotent writes).
owns: Tests for the `--since=<ref>` selector (no silent fallback to whole repo) and the `ensureWriteIfChanged` content-equality guard that funnels every header-fix write.
boundaries: Tests cover the helper used by `--since=<ref>` plus the full CLI end-to-end on a temp git repo. Heavy header-injection logic is covered separately in tests/unit/header-engine.test.mjs.
invariants: A clean working tree must produce zero header-fix writes. A second consecutive run on the same content must also produce zero writes. Manual invocation without a selector must exit 1.
notesForLLM: TPL-231 closes the silent fallback in `changedRepoFiles()` for the pre-commit Phase 5 path. TPL-232 explicitly proves that the existing `ensureWriteIfChanged` helper makes header-fix idempotent for the common version-stamp re-write scenario. Field-finding Entry 019.
tests: self
linkedDocs:
  - scripts/lib/header.mjs
  - scripts/checks/header-fix.mjs
  - .githooks/pre-commit
specRefs:
  - TPL-231
  - TPL-232
related:
  - tests/unit/header-engine.test.mjs
  - tests/integration/parallel-sessions.test.mjs
---

# header-fix.test.mjs

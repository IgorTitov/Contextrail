---
version: 0.8.15
date: 2026-05-11
purpose: Runtime meta-test for R1.3 — detects leaked test fixture claim files in .claims/ after integration test cleanup failures
layer: tests
hexLayer: _none_
ctx: _none_
public: false
edit: careful
linkedDocs:
  - docs/adr/0052-r1-claims-write-detection.md
  - docs/adr/0015-test-isolation-enforcement.md
  - scripts/checks/test-isolation-allowlist.json
related:
  - tests/integration/coa-worktree-slice-id-lock.test.mjs
  - tests/integration/coa-worktree-slice-id-race.test.mjs
  - scripts/checks/test-isolation-check.mjs
---

# no-test-fixture-leaks.test.mjs

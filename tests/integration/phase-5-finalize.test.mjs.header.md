---
version: 0.7.87
date: 2026-05-05
purpose: Integration tests for TPL-278 Phase-5 finalize — auto-stage allow-list + post-stamp hook-integrity regen.
layer: tests
hexLayer: _none_
boundedContext: hook-integrity
public: false
editConstraint: careful
dependsOn:
  - scripts/checks/hook-integrity-check.mjs
  - scripts/lib/hook-integrity.mjs
  - .githooks/pre-commit
tests:
  - phase-5-finalize.test.mjs
linkedDocs:
  - docs/adr/0019-phase-5-finalize.md
---

# phase-5-finalize.test.mjs

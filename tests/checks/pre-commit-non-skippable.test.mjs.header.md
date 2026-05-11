---
name: pre-commit-non-skippable.test.mjs
description: Meta-test asserting NON_SKIPPABLE_PHASES in .githooks/pre-commit contains phases 2.5, 2.7, and 7. (CG-R1-3, TPL-241)
type: tests
layer: tests
public: false
edit: careful
sidecarOf: pre-commit-non-skippable.test.mjs
covers:
  - .githooks/pre-commit
relatedRule: r1-test-isolation
invariants:
  - Reads .githooks/pre-commit and parses the NON_SKIPPABLE_PHASES literal.
  - Phase 2.5 (R1 test-isolation) must always appear in the list.
  - Phase 2.7 (R2 transport-branch) must always appear in the list.
  - Phase 7 (heavy gates) must always appear in the list.
---

# pre-commit-non-skippable.test.mjs

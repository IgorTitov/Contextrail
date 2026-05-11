---
name: header-check.test.mjs
description: Unit + meta tests for header-check.mjs covering untracked-file exclusion, agent-memory exemption, and checkNotesForLLMFiller. (TPL-253)
type: tests
layer: tests
public: false
edit: careful
sidecarOf: header-check.test.mjs
covers:
  - scripts/checks/header-check.mjs
  - scripts/lib/header.mjs
invariants:
  - collectTrackedFiles must not use ls-files --others.
  - .claude/agent-memory/ paths must always be exempt from header checks.
  - header-check.mjs must not import collectRepoFiles or changedRepoFiles.
---

# header-check.test.mjs

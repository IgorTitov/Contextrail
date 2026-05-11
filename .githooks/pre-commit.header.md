---
fileId: contextrail-template:.githooks:pre-commit
module: .githooks
stability: evolving
steward: shared
api: Git hook
dependsOn:
  - scripts/checks/spec-check.mjs
  - scripts/checks/spec-sync.mjs
  - scripts/checks/backlog-sync.mjs
  - scripts/checks/product-docs-check.mjs
  - scripts/checks/product-data-check.mjs
  - scripts/checks/design-docs-check.mjs
  - scripts/checks/claim-check.mjs
  - scripts/checks/header-fix.mjs
  - scripts/checks/readme-fix.mjs
  - scripts/checks/architecture-check.mjs
  - scripts/checks/delivery-flow-check.mjs
  - scripts/checks/control-plane-check.mjs
  - scripts/checks/test-gate.mjs
  - scripts/checks/test-isolation-check.mjs
  - scripts/checks/changelog-sync.mjs
summary: Run deterministic pre-commit sync and validation steps, then stage their resulting repository updates.
owns: The execution order for deterministic pre-commit sync and validation steps plus final git add -u staging.
boundaries: This hook should orchestrate existing repo scripts only. It must not hide release logic or become a second automation engine.
invariants: |
  Remains non-interactive; stages deterministic changes after the scripted
  checks; keeps post-commit work out of pre-commit. Phase 2.5
  (test-isolation-check, R1 / ADR-0015) is in NON_SKIPPABLE_PHASES and
  cannot be suppressed via COA_SKIP_GATES — the Zvenix incident
  (TPL-233) proved that any bypass shortcut re-opens the failure mode.
risks: Changing the order here changes what the repo guarantees before a commit is created.
securityPrivacy: Local repository control-plane content only; avoid embedding secrets or credentials.
notesForLLM: Treat this file as operational code. Reordering commands or adding hidden side effects changes repository guarantees.
tests:
  - node scripts/checks/control-plane-check.mjs
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/design-docs-check.mjs
  - node scripts/checks/delivery-flow-check.mjs
  - tests/integration/control-plane-coherence.test.mjs
  - tests/integration/design-flow-coherence.test.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
linkedDocs:
  - .githooks/README.md
  - .claude/CLAUDE.md
related:
  - .githooks/commit-msg
  - scripts/checks/install-hooks.mjs
---

# pre-commit

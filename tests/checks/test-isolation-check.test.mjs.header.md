---
fileId: contextrail-template:tests:checks:test-isolation-check:test:mjs
module: tests/checks
stability: stable
steward: shared
api: node:test suite
dependsOn:
  - scripts/checks/test-isolation-check.mjs
  - tests/_setup/safe-git.mjs
  - tests/checks/fixtures/test-isolation/*
summary: Meta-test for R1 (ADR-0015) — pins detection of all 17 fixtures, asserts allowlist starts empty, and proves the runtime guard / safe-git helper invariants the static check depends on.
owns: |
  Pinned verdict per fixture, allowlist-discipline assertion, transitive-scan
  proof, token-aware stripping spot-checks, SAFE_GIT_ENV_KEYS shape,
  pre-commit Phase 2.5 wiring, package.json --import wiring, and whitelist
  marker parser shape.
boundaries: |
  Tests metadata about the rule's enforcement, not the rule logic itself.
  scanFile() / detect() are exercised against fixtures; the runtime
  guard is covered by its own behavior in safeGit-using tests.
invariants: |
  - 17 fixtures total; growth changes the budget assertion deliberately.
  - Allowlist files[] starts empty.
  - SAFE_GIT_ENV_KEYS contains exactly 5 GIT_* keys.
  - Pre-commit invokes test-isolation-check.mjs and --self-test runs first.
  - test:unit and test:integration scripts load no-live-git.mjs via --import.
risks: |
  - If the static check signature changes (function names, return shape),
    these tests fail loudly — that is intended; treat updates here as
    audit-visible events.
securityPrivacy: |
  Test-only. No secrets.
notesForLLM: |
  When extending the static check with a new pattern, add a fixture under
  tests/checks/fixtures/test-isolation/ AND a SELF_TEST_EXPECTATIONS
  entry, then update the budget assertion in this file.
tests:
  - self
linkedDocs:
  - docs/adr/0015-test-isolation-enforcement.md
related:
  - scripts/checks/test-isolation-check.mjs
generated: false
---

# test-isolation-check.test.mjs

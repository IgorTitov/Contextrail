---
fileId: contextrail-template:scripts:checks:test-isolation-check:mjs
module: scripts/checks
stability: stable
steward: shared
api: detect, scanFile, runSelfTest, runMainScan, stripCommentsAndStrings, readWhitelistMarker
dependsOn:
  - scripts/checks/test-isolation-allowlist.json
  - tests/checks/fixtures/test-isolation/*
  - tests/_setup/safe-git.mjs
  - tests/_setup/no-live-git.mjs
summary: R1 static check (ADR-0015) — refuses to commit any test file that invokes git outside the safeGit helper, follows imports transitively, and treats string obfuscation, dynamic imports, fs writes to .git, and process.chdir as violations.
owns: |
  Lint-time defense for the test-isolation invariant. Walks tests/**
  plus scripts/** for *.test.mjs / *.spec.mjs files, traces relative
  imports one hop deep so helper modules are scanned too, and detects
  the pattern set documented in ADR-0015.
boundaries: |
  Source-text inspection only. Does not execute tests. Companion
  runtime guard (tests/_setup/no-live-git.mjs) handles execution-time
  defense; this check enforces at lint/pre-commit time.
invariants: |
  - --self-test runs all 17 fixtures through detect() and asserts
    each produces the expected verdict.
  - --self-test runs FIRST in pre-commit Phase 2.5; tampering with the
    detection logic fails the meta-validation before the real scan.
  - Allowlist file (test-isolation-allowlist.json) starts at
    files.length=0; growth requires both per-file annotation and
    CHANGELOG entry.
  - Scans tests/_setup/* but exempts safe-git.mjs and no-live-git.mjs
    themselves — they ARE the helper.
risks: |
  - Token-aware regex stripping is simpler than full AST parsing.
    Trade-off: zero new deps, but pattern surface must stay narrow.
    The meta-test pins detection so weakening it fails CI.
  - A test that imports a helper from outside tests/lib/ (e.g.,
    modules/*) won't have that helper scanned. Helpers should live
    under tests/lib/ or tests/_setup/.
securityPrivacy: |
  Lint output may include source snippets with file paths. No secrets
  read or written.
notesForLLM: |
  Run with `--self-test` first, then plain. The static check is one
  of three R1 layers (static + runtime + pre-commit gate). To extend
  detection: add a fixture under tests/checks/fixtures/test-isolation/
  AND an entry in SELF_TEST_EXPECTATIONS, then run --self-test to
  prove the new pattern fires.
tests:
  - tests/checks/test-isolation-check.test.mjs
linkedDocs:
  - docs/adr/0015-test-isolation-enforcement.md
related:
  - tests/_setup/safe-git.mjs
  - tests/_setup/no-live-git.mjs
  - .githooks/pre-commit
generated: false
---

# test-isolation-check.mjs

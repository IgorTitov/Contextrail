---
fileId: contextrail-template:tests:unit:commit-msg-check-slice-coverage
module: tests/unit
stability: evolving
steward: shared
api: "Unit test suite"
dependsOn:
  - scripts/checks/commit-msg-check.mjs
  - scripts/checks/claim-check.mjs
summary: Unit tests for the CG-C4-1 slice-coverage check — verifies that slice IDs in commit subjects are covered by an active claim or prior history.
owns: All 8 test cases for checkSliceCoverage and extractSliceIdFromHeader (TPL-281, ADR-0025).
boundaries: Test code only; uses tmpdir git repos, never writes to live repo.
invariants: checkSliceCoverage stays testable with injected claimsDir and repoRoot. Each test case is fully independent.
risks: Stale tests if coverage logic changes; claim expiry window in tests must stay > test execution time.
securityPrivacy: Uses tmpdir isolation per R1.
notesForLLM: Pass claimsDir and repoRoot opts to avoid hitting live .claims/ and live git history.
tests:
  - self
linkedDocs:
  - scripts/checks/commit-msg-check.mjs
  - docs/adr/0025-commit-msg-slice-coverage.md
  - docs/rules-registry.md
specRefs:
  - TPL-281
---

# commit-msg-check-slice-coverage.test.mjs

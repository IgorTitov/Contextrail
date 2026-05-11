---
fileId: contextrail-template:tests:unit:commit-msg-check-recent-completed
module: tests/unit
stability: evolving
steward: shared
api: "Unit test suite"
dependsOn:
  - scripts/checks/commit-msg-check.mjs
  - scripts/checks/claim-check.mjs
summary: Unit tests for the Layer 1.5 recently-completed claim window in checkSliceCoverage — verifies claims completed within 60s are treated as valid coverage.
owns: All 10 test cases for recently-completed coverage path (TPL-293, ADR-0030).
boundaries: Test code only; uses tmpdir fixtures, never writes to live repo.
invariants: checkSliceCoverage stays testable with injected claimsDir and repoRoot. Each test case is fully independent.
risks: Stale tests if window logic changes; completed_at timestamp must be fresh enough relative to window.
securityPrivacy: Uses tmpdir isolation per R1.
notesForLLM: Pass claimsDir and repoRoot opts to avoid hitting live .claims/ and live git history. Use pastTimestamp() helper for consistent timing.
tests:
  - self
linkedDocs:
  - scripts/checks/commit-msg-check.mjs
  - scripts/checks/claim-check.mjs
  - docs/adr/0030-commit-msg-recent-completed-claims.md
  - docs/rules-registry.md
specRefs:
  - TPL-293
---

# commit-msg-check-recent-completed.test.mjs

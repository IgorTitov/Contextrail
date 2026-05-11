---
fileId: contextrail-template:tests:unit:commit-msg-check-history-tightened
module: tests/unit
stability: evolving
steward: shared
api: "Unit test suite"
dependsOn:
  - scripts/checks/commit-msg-check.mjs
  - scripts/checks/claim-check.mjs
summary: Unit tests for Layer 2 history-match tightening in checkSliceCoverage — verifies that history match requires explicit dual-key operator override (COA_OPERATOR=1 + COMMIT_MSG_ALLOW_HISTORY_MATCH=1).
owns: All 8 test cases for history-match tightening (TPL-299, ADR-0031).
boundaries: Test code only; uses tmpdir fixtures, never writes to live repo.
invariants: checkSliceCoverage stays testable with injected claimsDir, repoRoot, and env opts. Each test case is fully independent.
risks: Stale tests if audit log path or entry shape changes; dual-key env var names must stay in sync with implementation.
securityPrivacy: Uses tmpdir isolation per R1.
notesForLLM: Pass claimsDir and repoRoot opts to avoid hitting live .claims/ and live git history. Check audit.log existence and JSON Lines shape after dual-key override tests.
tests:
  - self
linkedDocs:
  - scripts/checks/commit-msg-check.mjs
  - scripts/checks/claim-check.mjs
  - docs/adr/0031-history-match-tightening.md
  - docs/rules-registry.md
---

# commit-msg-check-history-tightened.test.mjs

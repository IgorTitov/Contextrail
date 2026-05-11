---
fileId: contextrail-template:tests:unit:worktree-audit:test:mjs
module: tests/unit
stability: stable
steward: shared
api: Test
dependsOn:
  - scripts/lib/worktree-audit.mjs
summary: Pin every R4 verdict in the eight-tag taxonomy plus priority short-circuits and recommendation table.
owns: Unit coverage for classifyVerdict, recommendationFor, and the eligibility predicates.
boundaries: Pure-logic tests only; no git, no fs, no time. Integration coverage is in tests/integration/coa-worktree-lifecycle.test.mjs.
invariants: VERDICTS table is frozen and contains exactly eight tags; every verdict has a recommendation.
risks: Loosening these tests could let the audit verdict table silently drift and license unsafe teardown.
securityPrivacy: No external access.
notesForLLM: Add a new test case (not a relaxation) when the verdict logic changes. Drift between this file and the lib should fail CI.
tests:
  - node --test "tests/unit/worktree-audit.test.mjs"
linkedDocs:
  - docs/adr/0016-worktree-lifecycle.md
related:
  - tests/unit/worktree-refresh.test.mjs
  - tests/integration/coa-worktree-lifecycle.test.mjs
generated: false
specRefs:
  - TPL-235
---

# worktree-audit.test.mjs

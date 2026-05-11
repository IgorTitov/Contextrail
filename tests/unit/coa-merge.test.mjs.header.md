---
fileId: contextrail-template:tests:unit:coa-merge.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: scripts/coa-merge.mjs
summary: Unit tests for coa-merge.mjs pure helpers (parseSemver, bumpPatch, isValidBump, changelogHasContent, parseMergeArgs, shouldAttemptPull).
owns: Unit proof of coa-merge pure helpers and decision logic.
boundaries: Must not spawn git, run the ceremony end-to-end, or touch the filesystem; uses string fixtures only.
invariants: All tests must be independent and deterministic; no shared mutable state between cases.
notesForLLM: shouldAttemptPull tests guard the no-remote skip path added in TPL-202. Integration coverage of the full ceremony lives in tests/integration/parallel-sessions.test.mjs.
tests: node --test tests/unit/coa-merge.test.mjs
linkedDocs:
  - docs/guides/parallel-sessions.md
specRefs:
  - TPL-191
  - TPL-196
  - TPL-202
related: scripts/coa-merge.mjs
---

# coa-merge.test.mjs

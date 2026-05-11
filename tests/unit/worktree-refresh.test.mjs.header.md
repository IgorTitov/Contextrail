---
fileId: contextrail-template:tests:unit:worktree-refresh:test:mjs
module: tests/unit
stability: stable
steward: shared
api: Test
dependsOn:
  - scripts/lib/worktree-refresh.mjs
summary: Pin every diff shape the R4 stamp-only classifier must distinguish — JS / Markdown / shell stamps, mixed hunks, whitespace, line-endings, renames, mode changes, malformed hunks, boundary line numbers.
owns: Unit coverage for classifyDiff, parseHunkHeader, and the SLIM_HEADER_RANGE constant.
boundaries: Pure-logic tests only; the integration suite drives end-to-end refresh behavior through a real git worktree.
invariants: classifyDiff is conservative — every ambiguous case returns 'has-logic' so refresh preserves rather than discards.
risks: Loosening these tests could let the classifier mis-label a logic edit as stamp-only, causing silent WIP loss via git restore.
securityPrivacy: No external access.
notesForLLM: When adding a new header dialect, add fixtures here AND extend STAMP_LINE_RE in the lib. Do not loosen anchors.
tests:
  - node --test "tests/unit/worktree-refresh.test.mjs"
linkedDocs:
  - docs/adr/0016-worktree-lifecycle.md
  - docs/adr/0009-header-sidecar-structure.md
related:
  - tests/unit/worktree-audit.test.mjs
  - tests/integration/coa-worktree-lifecycle.test.mjs
generated: false
specRefs:
  - TPL-235
---

# worktree-refresh.test.mjs

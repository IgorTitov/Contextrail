---
fileId: contextrail-template:scripts:lib:worktree-refresh
module: scripts/lib
stability: stable
steward: shared
api: Stamp-only diff classifier
summary: Pure unified-diff classifier for R4 — distinguishes header @version stamp residue from real WIP, conservative (defaults to has-logic on doubt).
owns: classifyDiff(diffText) ∈ { 'no-diff', 'stamp-only', 'has-logic' } and the slim-header window constant SLIM_HEADER_RANGE.
boundaries: Pure logic only. Does NOT spawn git. The caller (scripts/coa-worktree.mjs#runRefresh) provides the diff text.
invariants: stamp-only requires ALL hunks within SLIM_HEADER_RANGE, balanced removed/added counts, every payload line matches the @version stamp regex.
risks: Misclassifying a logic edit as stamp-only would silently discard WIP via git restore. The classifier errs conservative — preserves on any ambiguity.
securityPrivacy: No external access.
notesForLLM: Adding new prefix dialects (e.g. another comment style) means extending STAMP_LINE_RE and the unit tests, not loosening the regex anchors.
tests: tests/unit/worktree-refresh.test.mjs
linkedDocs:
  - docs/adr/0016-worktree-lifecycle.md
  - docs/adr/0009-header-sidecar-structure.md
  - scripts/coa-worktree.mjs
  - scripts/lib/worktree-audit.mjs
related:
  - .claims/config.json
---

# worktree-refresh.mjs

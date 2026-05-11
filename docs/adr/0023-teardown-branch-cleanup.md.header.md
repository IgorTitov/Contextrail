---
fileId: contextrail-template:docs:adr:0023-teardown-branch-cleanup:md
module: docs/adr
stability: stable
steward: shared
api: Doc
dependsOn:
  - docs/adr/0016-worktree-lifecycle.md
  - docs/adr/0021-auto-teardown-and-dirt-audit.md
  - scripts/coa-worktree.mjs
summary: ADR documenting strict -d branch-ref cleanup added to --teardown (TPL-285), symmetry with step 9e, and the non-fatal unmerged-branch preservation stance.
owns: Decision record for runTeardown branch-ref deletion behavior.
boundaries: Narrative ADR only; no executable content.
invariants: Strict -d only; no -D; exit 0 always; branchPreserved logged when -d refuses.
generated: false
---

# 0023-teardown-branch-cleanup.md

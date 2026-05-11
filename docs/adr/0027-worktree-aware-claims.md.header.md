---
fileId: contextrail-template:docs:adr:0027-worktree-aware-claims:md
module: docs/adr
stability: stable
steward: shared
api: Doc
dependsOn:
  - scripts/lib/fs-helpers.mjs
  - scripts/checks/claim-check.mjs
  - scripts/checks/commit-msg-check.mjs
  - scripts/checks/trunk-integrity-check.mjs
  - scripts/checks/pre-impl-gate.mjs
  - scripts/coa-merge.mjs
  - docs/adr/0008-inter-agent-coordination-protocol.md
  - docs/adr/0016-worktree-lifecycle.md
summary: ADR-0027 — worktree-aware .claims/ discovery; closes the linked-worktree untracked-file split where tools reading .claims/ from process.cwd() missed claims in tx-worktrees (TPL-288).
owns: Decision record for resolveMainRepoRoot() helper, audit of all .claims/ readers, and CLAIMS_DIR env-override pattern.
boundaries: Narrative ADR only; no executable content.
invariants: resolveMainRepoRoot() must fall back to worktreeRoot when git is unavailable; CLAIMS_DIR env override must be preserved for test fixtures.
generated: false
specRefs:
  - TPL-288
---

# 0027-worktree-aware-claims.md

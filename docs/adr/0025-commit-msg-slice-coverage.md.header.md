---
fileId: contextrail-template:docs:adr:0025-commit-msg-slice-coverage:md
module: docs/adr
stability: stable
steward: shared
api: Doc
dependsOn:
  - scripts/checks/commit-msg-check.mjs
  - scripts/checks/claim-check.mjs
  - .githooks/commit-msg
  - docs/adr/0020-slice-id-uniqueness.md
summary: ADR-0025 — commit-msg-check slice-coverage layer; third defense for C4 slice-ID uniqueness closing CG-C4-1 (TPL-281).
owns: Decision record for the commit-msg slice-coverage check, multi-slice-ID decision, and dual-key operator override.
boundaries: Narrative ADR only; no executable content.
invariants: Coverage check must not break pure validateCommitMessage function; history fallback is weaker than active-claim.
generated: false
specRefs:
  - TPL-281
---

# 0025-commit-msg-slice-coverage.md

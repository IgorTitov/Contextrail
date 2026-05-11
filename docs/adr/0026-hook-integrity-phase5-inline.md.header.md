---
fileId: contextrail-template:docs:adr:0026-hook-integrity-phase5-inline:md
module: docs/adr
stability: stable
steward: shared
api: Doc
dependsOn:
  - .githooks/pre-commit
  - scripts/checks/hook-integrity-check.mjs
  - docs/adr/0019-hook-integrity-trust-model.md
  - .githooks/.fingerprints.json
summary: ADR-0026 — Move hook-integrity post-stamp regen (Addition B) to Phase 5 inline so fingerprints stay consistent when Phase 6/7 aborts a commit (TPL-287).
owns: Decision record for repositioning Addition B from end-of-hook to Phase 5 inline; trust model and guard improvement rationale.
boundaries: Narrative ADR only; no executable content.
invariants: run_parallel is synchronous (wait loops); --from-pre-commit-hook trust model unchanged.
generated: false
specRefs:
  - TPL-287
---

# 0026-hook-integrity-phase5-inline.md

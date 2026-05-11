---
fileId: contextrail-template:docs:adr:0024-changelog-uniqueness-defense:md
module: docs/adr
stability: stable
steward: shared
api: Doc
dependsOn:
  - scripts/checks/changelog-sync.mjs
  - scripts/coa-merge.mjs
  - .githooks/pre-commit
  - .githooks/pre-push
  - tests/integration/changelog-uniqueness.test.mjs
summary: ADR-0024 — multi-layer changelog version-uniqueness defense (C5, TPL-286). Motivated by Cockpit AIC-DEV-140 duplicate-section incident.
owns: Decision record for the five-layer C5 invariant and changelog uniqueness enforcement architecture.
boundaries: Narrative ADR only; no executable content.
invariants: Five defense layers; auto-merge of duplicates is explicitly out of scope.
generated: false
specRefs:
  - TPL-286
---

# 0024-changelog-uniqueness-defense.md

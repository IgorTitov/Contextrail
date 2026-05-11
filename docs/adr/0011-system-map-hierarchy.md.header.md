---
fileId: contextrail-template:docs:adr:0011-system-map-hierarchy
module: docs/adr
stability: stable
steward: shared
api: ADR document
dependsOn:
  - docs/adr/0006-context-optimized-architecture.md
  - docs/SYSTEM_MAP.md
summary: Document ADR 0011 — replace flat module table in SYSTEM_MAP.md with category-grouped hierarchical format that scales to 100+ modules without exceeding agent token budgets.
owns: The architecture decision to use category-grouped hierarchy in SYSTEM_MAP.md instead of a flat table, including the category taxonomy and scaling projections.
boundaries: This ADR owns the format decision and rationale. It does not own the SYSTEM_MAP content itself or the category assignments (those live in SYSTEM_MAP.md).
invariants: Category index must stay under ~600 tokens at 100 modules. Per-category detail tables use the same columns as the original flat table (Purpose, Infra, Deps, Depd-by, Files).
risks: Category taxonomy may need adjustment as the module count grows, but the format itself is stable.
securityPrivacy: Documentation content only.
notesForLLM: This ADR explains why SYSTEM_MAP.md uses a hierarchical format instead of a flat table. The key insight is that agents load the category index (~600 tok) always, then only the relevant category detail (~80-180 tok), instead of the full flat table (~1380+ tok).
tests:
  - node scripts/checks/architecture-check.mjs
linkedDocs:
  - docs/SYSTEM_MAP.md
  - docs/context-loading-protocol.md
  - docs/whitepaper.md
related:
  - docs/adr/0006-context-optimized-architecture.md
  - docs/adr/0010-manifest-capabilities.md
---

# 0011-system-map-hierarchy.md

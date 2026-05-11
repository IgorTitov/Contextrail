---
fileId: contextrail-template:docs:adr:0010-manifest-capabilities
module: docs/adr
stability: evolving
steward: shared
api: ADR document
dependsOn:
  - docs/adr/0006-context-optimized-architecture.md
  - docs/adr/0003-architecture-metadata-for-ai-cockpit.md
  - docs/prd/manifest-capabilities.md
  - docs/analysis/mode-b-review.md
  - docs/analysis/port-jsdoc-coverage.md
summary: Document ADR 0010 — module manifests must carry generator-owned capability blocks sourced from JSDoc @typedef or sibling types.d.ts so tier-2 navigation surfaces domain capability without opening port files.
owns: The architecture rule that every port must expose capability data via JSDoc @typedef or sibling types.d.ts, and that module manifests must carry generator-owned capabilities blocks enforced by a hard-fail pre-commit and CI gate.
boundaries: This ADR owns the architecture rule and its rationale. It does not own the generator implementation (PRD + backlog), or the F5 failureModes design, which is explicitly deferred.
invariants: Capabilities blocks are generator-owned and must not be hand-edited. Hard fail from day one — no grandfathering, no soft-warn mode. Both inline JSDoc @typedef and sibling types.d.ts are accepted capability sources. Retrieval is not forced to migrate. F5 (failureModes) is explicitly out of scope.
risks: Drift here could allow future contributors to reintroduce a soft-warn mode, force retrieval to migrate, or fold F5 into the capabilities design before F5 has its own design pass.
securityPrivacy: Documentation content only.
notesForLLM: This ADR closes finding F3 from docs/analysis/mode-b-review.md. Empirical basis is docs/analysis/port-jsdoc-coverage.md. The ADR is in Accepted status since TPL-186 landed, which is the slice that updates SYSTEM_MAP and README to advertise the new tier-2 capability surface. F5 (failureModes) is deferred and must not be pulled into this ADR.
tests:
  - node scripts/checks/product-docs-check.mjs
linkedDocs:
  - docs/prd/manifest-capabilities.md
  - docs/backlog/manifest-capabilities.md
  - docs/analysis/mode-b-review.md
  - docs/analysis/port-jsdoc-coverage.md
specRefs: TPL-178
related:
  - docs/adr/0006-context-optimized-architecture.md
  - docs/adr/0003-architecture-metadata-for-ai-cockpit.md
  - docs/adr/0009-sidecar-first-headers.md
---

# 0010-manifest-capabilities.md

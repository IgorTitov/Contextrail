---
fileId: contextrail-template:docs:design:inter-agent-coordination-protocol
module: docs/design
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - docs/adr/0008-inter-agent-coordination-protocol.md
  - docs/adr/0002-trunk-based-delivery.md
summary: Full specification of the inter-agent coordination protocol for parallel agent delivery using file-based claims.
owns: The full specification of the inter-agent coordination protocol including claims schema, discovery protocol, conflict resolution, and lifecycle.
boundaries: This design doc owns the operational specification. ADR 0008 owns the decision rationale.
invariants: Claims must be file-based and repo-local; BBA-first remains the primary mechanism; protocol must degrade gracefully when ignored.
notesForLLM: Read this for the full claims protocol specification including schema, lifecycle, and conflict resolution tiers.
linkedDocs:
  - .claims/README.md
  - docs/guides/inter-agent-coordination.md
  - docs/prd/inter-agent-coordination.md
specRefs: TPL-172
related:
  - scripts/checks/claim-check.mjs
  - docs/backlog/inter-agent-coordination.md
  - .githooks/pre-commit
---

# inter-agent-coordination-protocol.md

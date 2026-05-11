---
fileId: contextrail-template:docs:adr:0003-architecture-metadata-for-ai-cockpit
module: docs/adr
stability: settled
steward: shared
api: Documentation
summary: Record the decision to extend structured headers with architecture metadata and add machine-readable report artifacts for AI Cockpit integration.
owns: Architecture decision for AI Cockpit metadata contract.
boundaries: This ADR records the decision and its rationale. Implementation details live in the referenced files.
invariants: The decision stays valid as long as descendant repos need machine-readable architecture and test-proof metadata.
risks: Over-engineering the header schema into a full ontology.
securityPrivacy: Public documentation.
notesForLLM: This ADR explains why the fields and reports exist. Do not duplicate the full field reference here.
linkedDocs:
  - docs/architecture/hex-metadata-convention.md
  - scripts/reports/README.md
related:
  - docs/adr/0001-template-scope.md
  - scripts/lib/header.mjs
  - scripts/lib/architecture-graph.mjs
  - scripts/lib/test-entity-map.mjs
---

# 0003-architecture-metadata-for-ai-cockpit.md

---
fileId: contextrail-template:docs:prd:inter-agent-coordination
module: docs/prd
stability: evolving
steward: shared
api: PRD document
dependsOn:
  - docs/prd/index.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
summary: Requirement intent for the inter-agent coordination protocol enabling parallel agent delivery.
owns: The requirement intent for the inter-agent coordination protocol.
boundaries: This file owns requirement intent. ADR 0008 owns the decision rationale. The design doc owns the full specification.
invariants: Each phase is independently valuable and traceable.
securityPrivacy: Documentation content only.
notesForLLM: Technical/architectural work — USM intentionally skipped. ADR 0008 is the canonical decision document.
tests: node scripts/checks/product-docs-check.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
  - docs/design/inter-agent-coordination-protocol.md
specRefs: TPL-172
related: docs/backlog/inter-agent-coordination.md
---

# inter-agent-coordination.md

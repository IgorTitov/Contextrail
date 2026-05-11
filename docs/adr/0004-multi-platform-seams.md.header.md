---
fileId: contextrail-template:docs:adr:0004-multi-platform-seams
module: docs/adr
stability: evolving
steward: shared
api: ADR document
dependsOn:
  - docs/prd/platform-seams.md
  - .claude/CLAUDE.md
summary: Record the architectural decision to add multi-platform abstraction seams to the starter template.
owns: The architectural decision record for multi-platform abstraction seams.
boundaries: This file records the decision rationale, not execution status or requirement intent.
invariants: The decision context and consequences must remain consistent with the actual seam implementation in apps/starter/.
risks: If the actual implementation diverges from this ADR, future readers will make incorrect assumptions about the adapter-wiring model.
securityPrivacy: Documentation content only.
notesForLLM: This ADR defines the seam strategy. When adding a new platform target, check this document first for the intended wiring pattern.
tests: node scripts/checks/architecture-check.mjs
linkedDocs:
  - docs/prd/platform-seams.md
  - docs/backlog/platform-seams.md
specRefs: TPL-022
related:
  - docs/adr/0002-trunk-based-delivery.md
  - modules/user-preferences/public-api.mjs
  - modules/notifications/public-api.mjs
---

# 0004-multi-platform-seams.md

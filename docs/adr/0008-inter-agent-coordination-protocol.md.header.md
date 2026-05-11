---
fileId: contextrail-template:docs:adr:0008-inter-agent-coordination-protocol
module: docs/adr
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - docs/adr/0002-trunk-based-delivery.md
  - docs/adr/0006-context-optimized-architecture.md
summary: "Decision record for the three-layer inter-agent coordination protocol: BBA-first rule, file-based claims, and human escalation."
owns: The architectural decision for inter-agent coordination using file-based claims and BBA-first strategy.
boundaries: This ADR owns the decision rationale and phased rollout plan. The design doc owns the full specification. The backlog owns execution state.
invariants: BBA-first remains the primary coordination mechanism; claims handle the residual cases only.
notesForLLM: Read this ADR to understand why the claims protocol exists and how it composes with BBA and hex boundaries.
linkedDocs:
  - docs/design/inter-agent-coordination-protocol.md
  - .claims/README.md
  - docs/guides/inter-agent-coordination.md
specRefs: TPL-172
related:
  - docs/prd/inter-agent-coordination.md
  - docs/backlog/inter-agent-coordination.md
  - scripts/checks/claim-check.mjs
---

# 0008-inter-agent-coordination-protocol.md

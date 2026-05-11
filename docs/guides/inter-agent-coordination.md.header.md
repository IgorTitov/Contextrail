---
fileId: contextrail-template:docs:guides:inter-agent-coordination
module: docs/guides
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - docs/adr/0008-inter-agent-coordination-protocol.md
  - .claims/README.md
summary: Operational guide for the inter-agent coordination protocol — BBA-first rule, file-based claims, and safe parallel delivery.
owns: Step-by-step operator guide for using the inter-agent coordination protocol to work safely in parallel.
boundaries: Must not duplicate the full protocol specification from the design doc. Points to ADR 0008 for rationale and to .claims/README.md for the claim schema.
invariants: CLI examples must match the actual claim-check.mjs interface. Strategy names must match the schema in .claims/README.md.
risks: If the claim-check script interface changes without updating this guide, operators may use outdated flags.
notesForLLM: This is the operational how-to for inter-agent coordination. For decision rationale see ADR 0008. For full protocol spec see docs/design/inter-agent-coordination-protocol.md. For the claim JSON schema see .claims/README.md.
linkedDocs:
  - docs/adr/0008-inter-agent-coordination-protocol.md
  - docs/design/inter-agent-coordination-protocol.md
  - .claims/README.md
specRefs: TPL-172
related:
  - scripts/checks/claim-check.mjs
  - .githooks/pre-commit
---

# inter-agent-coordination.md
